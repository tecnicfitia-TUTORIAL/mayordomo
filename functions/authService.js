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
exports.generateRegistrationOptions = onCall(async (request) => {
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
      authenticatorAttachment: 'platform',
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
exports.verifyRegistration = onCall(async (request) => {
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
      let { credentialPublicKey, credentialID, counter } = registrationInfo;

      // Speculative fix: Check for alternative property names
      if (!credentialPublicKey && registrationInfo.publicKey) {
        console.warn("credentialPublicKey missing, found publicKey instead.");
        credentialPublicKey = registrationInfo.publicKey;
      }

      console.log("Registration Info received:", { 
        hasCredentialID: !!credentialID, 
        credentialIDType: typeof credentialID,
        hasPublicKey: !!credentialPublicKey,
        keys: Object.keys(registrationInfo)
      });

      // Fallback: If credentialID is missing in registrationInfo, use the one from the response (client-side ID)
      if (!credentialID && response.id) {
        console.warn("credentialID missing in registrationInfo, using response.id fallback");
        credentialID = response.id;
      }

      if (!credentialID) {
        console.error("Registration Info keys:", Object.keys(registrationInfo));
        throw new Error("credentialID is missing in registrationInfo");
      }

      if (!credentialPublicKey) {
        console.error("Full Registration Info:", JSON.stringify(registrationInfo, (k, v) => (v instanceof Uint8Array || (v && v.type === 'Buffer') ? '[Buffer]' : v)));
        throw new Error("credentialPublicKey is missing in registrationInfo");
      }

      // Robust Buffer conversion
      // If it's already a string, assume it's base64url and use it directly or convert if needed.
      // SimpleWebAuthn v13 usually returns Uint8Array for these fields in registrationInfo.
      
      let credentialIDBase64;
      if (Buffer.isBuffer(credentialID) || credentialID instanceof Uint8Array) {
         credentialIDBase64 = Buffer.from(credentialID).toString('base64url');
      } else if (typeof credentialID === 'string') {
         credentialIDBase64 = credentialID;
      } else {
         // Fallback or error
         credentialIDBase64 = String(credentialID);
      }

      let credentialPublicKeyBase64;
      if (Buffer.isBuffer(credentialPublicKey) || credentialPublicKey instanceof Uint8Array) {
        credentialPublicKeyBase64 = Buffer.from(credentialPublicKey).toString('base64url');
      } else if (typeof credentialPublicKey === 'string') {
        credentialPublicKeyBase64 = credentialPublicKey;
      } else {
        credentialPublicKeyBase64 = String(credentialPublicKey);
      }

      await db.collection('users').doc(userId).collection('authenticators').add({
        credentialID: credentialIDBase64,
        credentialPublicKey: credentialPublicKeyBase64,
        counter,
        transports: response.response.transports || [],
        created: admin.firestore.FieldValue.serverTimestamp()
      });

      // Clean up challenge
      await db.collection('users').doc(userId).update({
        currentChallenge: admin.firestore.FieldValue.delete()
      });

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
 * Call this when user clicks "Biometric Login" and provides email
 */
exports.generateAuthenticationOptions = onCall(async (request) => {
  const { email, rpID } = request.data;
  
  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (e) {
    // For security, don't reveal if user exists, but for now we need the ID.
    // In production, use a generic error or dummy options.
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
exports.verifyAuthentication = onCall(async (request) => {
  const { email, response, rpID, origin } = request.data;

  const userRecord = await admin.auth().getUserByEmail(email);
  const userId = userRecord.uid;

  const userDoc = await db.collection('users').doc(userId).get();
  const expectedChallenge = userDoc.data()?.currentChallenge;

  if (!expectedChallenge) {
    throw new HttpsError('failed-precondition', 'No challenge found');
  }

  // Find the authenticator used
  const credentialID = response.id; // This is base64url string from client
  
  const authenticatorsRef = db.collection('users').doc(userId).collection('authenticators');
  const snapshot = await authenticatorsRef.where('credentialID', '==', credentialID).get();

  if (snapshot.empty) {
    throw new HttpsError('not-found', 'Authenticator not found');
  }

  const authenticatorDoc = snapshot.docs[0];
  const authenticator = authenticatorDoc.data();

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(authenticator.credentialID, 'base64url'),
        credentialPublicKey: Buffer.from(authenticator.credentialPublicKey, 'base64url'),
        counter: authenticator.counter,
      },
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

    // Clean challenge
    await db.collection('users').doc(userId).update({
      currentChallenge: admin.firestore.FieldValue.delete()
    });

    // Generate Firebase Custom Token
    const customToken = await admin.auth().createCustomToken(userId);
    
    return { verified: true, token: customToken };
  }

  return { verified: false };
});
