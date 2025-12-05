const { 
  generateRegistrationOptions, 
  verifyRegistrationResponse, 
  generateAuthenticationOptions, 
  verifyAuthenticationResponse 
} = require('@simplewebauthn/server');
const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');

const db = admin.firestore();
const rpName = 'Mayordomo App';

// Helper to encode/decode if needed, but simplewebauthn handles most.

/**
 * 1. Generate Registration Options
 * Call this when a logged-in user wants to setup FaceID/TouchID
 */
exports.generateRegistrationOptions = onCall({ cors: true }, async (request) => {
  const userId = request.auth ? request.auth.uid : null;
  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be logged in to register a passkey');
  }

  const { rpID } = request.data; 

  // Get user's existing authenticators to exclude them
  const userAuthenticatorsRef = db.collection('users').doc(userId).collection('authenticators');
  const snapshot = await userAuthenticatorsRef.get();
  const userAuthenticators = snapshot.docs.map(doc => doc.data());

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new Uint8Array(Buffer.from(userId)),
    userName: request.auth.token.email || 'User',
    attestationType: 'none',
    excludeCredentials: userAuthenticators.map(auth => ({
      id: auth.credentialID,
      type: 'public-key',
      transports: auth.transports,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      // authenticatorAttachment: 'platform', // Removed to allow cross-platform (QR/Mobile)
    },
  });

  // Save challenge to verify later
  await db.collection('users').doc(userId).set({
    currentChallenge: options.challenge
  }, { merge: true });

  return options;
});

/**
 * 2. Verify Registration
 * Call this after the frontend creates the credential
 */
exports.verifyRegistration = onCall({ cors: true }, async (request) => {
  try {
    const userId = request.auth ? request.auth.uid : null;
    if (!userId) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const { response, rpID, origin } = request.data;

    const userDoc = await db.collection('users').doc(userId).get();
    const expectedChallenge = userDoc.data()?.currentChallenge;

    if (!expectedChallenge) {
      throw new HttpsError('failed-precondition', 'No challenge found for user');
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });
    } catch (error) {
      console.error("Verification logic failed", error);
      throw new HttpsError('invalid-argument', `Verification failed: ${error.message}`);
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      // Extract credential info robustly
      // SimpleWebAuthn v10+ puts these directly in registrationInfo
      let credentialID = registrationInfo.credentialID;
      let credentialPublicKey = registrationInfo.credentialPublicKey;
      let counter = registrationInfo.counter;

      // Fallback check for nested structure (rare but possible in some versions/configs)
      if (!credentialID && registrationInfo.credential && registrationInfo.credential.id) {
          credentialID = registrationInfo.credential.id;
          credentialPublicKey = registrationInfo.credential.publicKey;
          counter = registrationInfo.credential.counter;
      }

      console.log("Registration Info Extracted:", { 
        hasCredentialID: !!credentialID, 
        credentialIDType: credentialID ? credentialID.constructor.name : 'undefined',
        credentialIDLength: credentialID ? credentialID.length : 0,
        hasPublicKey: !!credentialPublicKey,
        counter
      });

      if (!credentialID || !credentialPublicKey) {
        console.error("CRITICAL: Missing credential data after verification", registrationInfo);
        throw new Error("Credential data missing from verification result");
      }

      // Robust Conversion to Base64URL for Storage
      // CRITICAL FIX: Use the ID exactly as sent by the frontend (response.id) to ensure consistency
      // The frontend sends Base64URL. We must store Base64URL.
      // Re-encoding from the buffer can sometimes cause mismatches if not handled perfectly.
      let credentialIDBase64 = response.id; 
      
      // Sanity check: if response.id is missing (unlikely), fall back to buffer conversion
      if (!credentialIDBase64) {
          console.warn("response.id missing, falling back to buffer conversion");
          try {
              const buf = Buffer.from(credentialID); 
              credentialIDBase64 = buf.toString('base64url');
          } catch (e) {
              credentialIDBase64 = String(credentialID);
          }
      }

      let credentialPublicKeyBase64;
      try {
          const buf = Buffer.from(credentialPublicKey);
          credentialPublicKeyBase64 = buf.toString('base64url');
      } catch (e) {
          console.error("Error converting credentialPublicKey to base64url", e);
          credentialPublicKeyBase64 = String(credentialPublicKey);
      }

      console.log("Saving Authenticator to Firestore:", {
          userId,
          credentialIDBase64,
          counter,
          transports: response.response.transports || []
      });

      await db.collection('users').doc(userId).collection('authenticators').add({
        credentialID: credentialIDBase64,
        credentialPublicKey: credentialPublicKeyBase64,
        counter,
        transports: response.response.transports || [],
        created: admin.firestore.FieldValue.serverTimestamp(),
        userAgent: request.rawRequest ? request.rawRequest.headers['user-agent'] : 'unknown'
      });

      // Clean up challenge
      await db.collection('users').doc(userId).update({
        currentChallenge: admin.firestore.FieldValue.delete()
      });

      console.log("Authenticator saved successfully.");
      return { verified: true };
    }

    return { verified: false };
  } catch (error) {
    console.error("verifyRegistration Top-Level Error:", error);
    // Ensure we don't leak sensitive info, but give enough to debug
    throw new HttpsError('internal', error.message || "Internal Server Error");
  }
});

/**
 * 3. Generate Authentication Options (Login)
 * Call this when user clicks "Biometric Login".
 * If email is provided, it targets that user.
 * If email is NOT provided, it initiates a "Usernameless" (Resident Key) flow.
 */
exports.generateAuthenticationOptions = onCall({ cors: true }, async (request) => {
  const { email, rpID } = request.data;
  console.log("generateAuthenticationOptions called:", { email, rpID });
  
  // --- USERNAMELESS FLOW (No Email) ---
  if (!email) {
    // 1. Generate Options with NO allowCredentials (discoverable credentials)
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
      // No allowCredentials -> Discoverable Credential
    });

    console.log("Generated Usernameless Options:", JSON.stringify(options));

    // Store challenge in a global collection since we don't know the user yet
    await db.collection('biometricChallenges').doc(options.challenge).set({
      created: admin.firestore.FieldValue.serverTimestamp()
    });

    return options;
  }

  // --- TARGETED FLOW (With Email) ---
  let userRecord;
  try {
    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    userRecord = await admin.auth().getUserByEmail(normalizedEmail);
  } catch (e) {
    console.warn(`User not found for email: ${email}`);
    throw new HttpsError('not-found', 'No existe una cuenta con este correo electrónico.');
  }

  const userId = userRecord.uid;
  const userAuthenticatorsRef = db.collection('users').doc(userId).collection('authenticators');
  const snapshot = await userAuthenticatorsRef.get();
  const userAuthenticators = snapshot.docs.map(doc => doc.data());

  if (userAuthenticators.length === 0) {
      throw new HttpsError('failed-precondition', 'Este usuario no tiene biometría configurada.');
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: userAuthenticators.map(auth => {
        // Robust conversion for allowCredentials
        let idBuffer;
        try {
            idBuffer = Buffer.from(auth.credentialID, 'base64url');
        } catch (e) {
            // Fallback if stored as base64 standard
            idBuffer = Buffer.from(auth.credentialID, 'base64');
        }
        return {
            id: idBuffer, 
            type: 'public-key',
            transports: auth.transports,
        };
    }),
    userVerification: 'preferred',
  });

  console.log("Generated Targeted Options:", JSON.stringify(options));

  // Save challenge
  await db.collection('users').doc(userId).set({
    currentChallenge: options.challenge
  }, { merge: true });

  return options;
});

/**
 * 4. Verify Authentication
 * Call this after frontend signs the challenge
 */
exports.verifyAuthentication = onCall({ cors: true }, async (request) => {
  try {
    console.log("verifyAuthentication called with data:", JSON.stringify(request.data));
    const { email, response, rpID, origin } = request.data;

    if (!response || !response.response) {
      console.error("Invalid response structure received:", response);
      throw new HttpsError('invalid-argument', 'Invalid response structure');
    }

    console.log("verifyAuthentication Request:", { 
      hasEmail: !!email, 
      rpID, 
      credentialID: response?.id 
    });

    let userId;
    let expectedChallenge;
    let authenticatorDoc;
    let authenticator;

    if (email) {
      // --- TARGETED FLOW ---
      const userRecord = await admin.auth().getUserByEmail(email);
      userId = userRecord.uid;

      const userDoc = await db.collection('users').doc(userId).get();
      expectedChallenge = userDoc.data()?.currentChallenge;

      if (!expectedChallenge) {
        throw new HttpsError('failed-precondition', 'No challenge found');
      }

      // Find the authenticator used
      const credentialID = response.id; 
      const authenticatorsRef = db.collection('users').doc(userId).collection('authenticators');
      const snapshot = await authenticatorsRef.where('credentialID', '==', credentialID).get();

      if (snapshot.empty) {
        throw new HttpsError('not-found', 'Authenticator not found');
      }

      authenticatorDoc = snapshot.docs[0];
      authenticator = authenticatorDoc.data();

    } else {
      // --- USERNAMELESS FLOW ---
      // 1. Retrieve Challenge from Global Collection
      // We need to extract the challenge from clientDataJSON to look it up
      if (!response?.response?.clientDataJSON) {
         throw new HttpsError('invalid-argument', 'Missing clientDataJSON');
      }

      const clientDataJSON = Buffer.from(response.response.clientDataJSON, 'base64url').toString('utf-8');
      const clientData = JSON.parse(clientDataJSON);
      const challenge = clientData.challenge;

      const challengeRef = db.collection('biometricChallenges').doc(challenge);
      const challengeSnap = await challengeRef.get();

      if (!challengeSnap.exists) {
        throw new HttpsError('invalid-argument', 'Challenge expired or invalid');
      }
      expectedChallenge = challenge;
      await challengeRef.delete(); // Consume challenge

      // 2. Find User by Credential ID (Collection Group Query)
      const credentialID = response.id;
      
      // Try exact match first (Base64URL)
      let query = db.collectionGroup('authenticators').where('credentialID', '==', credentialID);
      let querySnap = await query.get();

      // FALLBACK 1: Try Base64 (standard)
      if (querySnap.empty) {
          const base64 = credentialID.replace(/-/g, '+').replace(/_/g, '/');
          const pad = base64.length % 4;
          const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;

          if (paddedBase64 !== credentialID) {
              console.log(`[Auth] Trying fallback query with Base64: ${paddedBase64}`);
              const fallbackQuery = db.collectionGroup('authenticators').where('credentialID', '==', paddedBase64);
              const fallbackSnap = await fallbackQuery.get();
              if (!fallbackSnap.empty) querySnap = fallbackSnap;
          }
      }

      // FALLBACK 2: Try Base64URL without padding (just in case)
      if (querySnap.empty) {
          const unpadded = credentialID.replace(/=/g, '');
          if (unpadded !== credentialID) {
             console.log(`[Auth] Trying fallback query with Unpadded Base64URL: ${unpadded}`);
             const fallbackQuery2 = db.collectionGroup('authenticators').where('credentialID', '==', unpadded);
             const fallbackSnap2 = await fallbackQuery2.get();
             if (!fallbackSnap2.empty) querySnap = fallbackSnap2;
          }
      }

      if (querySnap.empty) {
        console.warn(`Credential ID ${credentialID} not found in any user authenticators.`);
        throw new HttpsError('not-found', `Credencial no reconocida en el sistema. ID: ${credentialID.substring(0, 10)}...`);
      }

      authenticatorDoc = querySnap.docs[0];
      authenticator = authenticatorDoc.data();
      
      // Parent of authenticator is user (users/{userId}/authenticators/{authId})
      // Ensure parent exists and is valid
      if (!authenticatorDoc.ref.parent || !authenticatorDoc.ref.parent.parent) {
          throw new HttpsError('internal', 'Invalid database structure for authenticator');
      }
      userId = authenticatorDoc.ref.parent.parent.id;
    }

    // CRITICAL DEBUG: Ensure authenticator exists before verification
    if (!authenticator) {
        console.error("CRITICAL: Authenticator object is undefined before verification", { userId, email });
        throw new HttpsError('internal', 'Error interno: No se pudieron recuperar los datos del autenticador.');
    }

    let verification;
    try {
      // 1. Prepare Credential ID (Uint8Array)
      let credentialIDUint8;
      try {
          if (authenticator.credentialID) {
             // Try base64url first (standard)
             credentialIDUint8 = new Uint8Array(Buffer.from(authenticator.credentialID, 'base64url'));
          }
      } catch (e) { console.warn("Error decoding credentialID", e); }

      // 2. Prepare Public Key (Uint8Array)
      let credentialPublicKeyUint8;
      try {
          if (authenticator.credentialPublicKey) {
              // Try base64url first (standard)
              credentialPublicKeyUint8 = new Uint8Array(Buffer.from(authenticator.credentialPublicKey, 'base64url'));
          }
      } catch (e) { console.warn("Error decoding credentialPublicKey", e); }

      if (!credentialIDUint8 || !credentialPublicKeyUint8) {
          console.error("Incomplete authenticator data", authenticator);
          throw new Error("Stored authenticator data is incomplete (missing ID or PublicKey)");
      }

      // 3. Prepare Counter (Number)
      let currentCounter = 0;
      if (authenticator && authenticator.counter !== undefined) {
          const parsed = parseInt(authenticator.counter, 10);
          if (!isNaN(parsed)) {
              currentCounter = parsed;
          }
      }

      // 4. Prepare Transports (Array or undefined)
      const currentTransports = (authenticator && Array.isArray(authenticator.transports)) ? authenticator.transports : undefined;

      // Construct the authenticator object exactly as expected by SimpleWebAuthn
      // CRITICAL FIX: Ensure counter is a number, not undefined or string
      const authenticatorDevice = {
          credentialID: credentialIDUint8,
          credentialPublicKey: credentialPublicKeyUint8,
          counter: Number(currentCounter), // Force number type
          transports: currentTransports,
      };

      console.log("PRE-VERIFY DEBUG:", {
          credentialID_length: authenticatorDevice.credentialID.length,
          counter: authenticatorDevice.counter,
          hasTransports: !!authenticatorDevice.transports,
          rpID,
          origin
      });

      try {
        verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: authenticatorDevice,
            requireUserVerification: false, 
        });
      } catch (innerError) {
          console.error("CRASH INSIDE verifyAuthenticationResponse:", innerError);
          throw new Error(`Library verification failed: ${innerError.message}`);
      }
    } catch (error) {
      console.error("Auth Verification failed", error);
      throw new HttpsError('invalid-argument', error.message);
    }

    const { verified, authenticationInfo } = verification;

    if (verified) {
      // Update counter
      if (authenticationInfo && authenticationInfo.newCounter !== undefined) {
          await authenticatorDoc.ref.update({
            counter: authenticationInfo.newCounter
          });
      } else {
          console.warn("Warning: authenticationInfo.newCounter is undefined. Not updating counter.");
      }

      // Clean challenge (only for targeted flow, usernameless already cleaned)
      if (email) {
        await db.collection('users').doc(userId).update({
          currentChallenge: admin.firestore.FieldValue.delete()
        });
      }

      // Generate Firebase Custom Token
      const customToken = await admin.auth().createCustomToken(userId);
      
      return { verified: true, token: customToken };
    }

    return { verified: false };
  } catch (error) {
    console.error("verifyAuthentication Top-Level Error:", error);
    // If it's already a known HttpsError, re-throw it to preserve the status code (e.g. 400, 404)
    if (error.httpErrorCode) {
      throw error;
    }
    throw new HttpsError('internal', error.message || "Internal Server Error");
  }
});

/**
 * DEBUG TOOL: List Authenticators for an Email
 * (Remove this in production)
 */
exports.debugGetUserAuthenticators = onCall({ cors: true }, async (request) => {
    const email = request.data.email;
    if (!email) return { error: "Email required" };

    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        const userId = userRecord.uid;
        
        const snapshot = await db.collection('users').doc(userId).collection('authenticators').get();
        
        return {
            userId,
            count: snapshot.size,
            authenticators: snapshot.docs.map(doc => ({
                id: doc.id,
                credentialID: doc.data().credentialID,
                credentialID_Type: typeof doc.data().credentialID,
                created: doc.data().created?.toDate().toISOString()
            }))
        };
    } catch (error) {
        return { error: error.message };
    }
});
