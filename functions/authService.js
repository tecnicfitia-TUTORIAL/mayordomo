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
      let credentialIDBase64;
      try {
          const buf = Buffer.from(credentialID); // Handles Uint8Array or Buffer
          credentialIDBase64 = buf.toString('base64url');
      } catch (e) {
          console.error("Error converting credentialID to base64url", e);
          credentialIDBase64 = String(credentialID);
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
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (e) {
    throw new HttpsError('not-found', 'User not found');
  }

  const userId = userRecord.uid;
  const userAuthenticatorsRef = db.collection('users').doc(userId).collection('authenticators');
  const snapshot = await userAuthenticatorsRef.get();
  const userAuthenticators = snapshot.docs.map(doc => doc.data());

  if (userAuthenticators.length === 0) {
      throw new HttpsError('failed-precondition', 'No passkeys registered for this user');
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: userAuthenticators.map(auth => ({
      id: Buffer.from(auth.credentialID, 'base64url'), // Convert back to Buffer for library
      type: 'public-key',
      transports: auth.transports,
    })),
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
      const query = db.collectionGroup('authenticators').where('credentialID', '==', credentialID);
      const querySnap = await query.get();

      if (querySnap.empty) {
        // Fallback: Try searching by rawId if stored differently or if base64url encoding varies
        console.warn(`Credential ID ${credentialID} not found. Checking potential encoding mismatches.`);
        throw new HttpsError('not-found', 'Credencial no reconocida en el sistema.');
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
      // COPIA PROFUNDA: Crear nuevos Uint8Array independientes para evitar problemas de memoria compartida
      let credentialIDUint8;
      if (authenticator.credentialID) {
          const buf = Buffer.from(authenticator.credentialID, 'base64url');
          credentialIDUint8 = Uint8Array.from(buf);
      }

      let credentialPublicKeyUint8;
      if (authenticator.credentialPublicKey) {
          const buf = Buffer.from(authenticator.credentialPublicKey, 'base64url');
          credentialPublicKeyUint8 = Uint8Array.from(buf);
      }

      if (!credentialIDUint8 || !credentialPublicKeyUint8) {
          console.error("Incomplete authenticator data", authenticator);
          throw new Error("Stored authenticator data is incomplete (missing ID or PublicKey)");
      }

      // Safe counter access
      const currentCounter = (authenticator && typeof authenticator.counter === 'number') ? authenticator.counter : 0;
      const currentTransports = (authenticator && Array.isArray(authenticator.transports)) ? authenticator.transports : undefined;

      // Construct the authenticator object exactly as expected by SimpleWebAuthn
      const authenticatorDevice = {
          credentialID: credentialIDUint8,
          credentialPublicKey: credentialPublicKeyUint8,
          counter: currentCounter,
          transports: currentTransports,
      };

      console.log("Calling verifyAuthenticationResponse with:", {
          credentialID_length: authenticatorDevice.credentialID.length,
          counter: authenticatorDevice.counter,
          hasTransports: !!authenticatorDevice.transports
      });

      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator: authenticatorDevice,
        requireUserVerification: false, 
      });
    } catch (error) {
      console.error("Auth Verification failed", error);
      throw new HttpsError('invalid-argument', error.message);
    }

    const { verified, authenticationInfo } = verification;

    if (verified) {
      // Update counter
      await authenticatorDoc.ref.update({
        counter: authenticationInfo.newCounter
      });

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
