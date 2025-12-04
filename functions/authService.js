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
    console.error("Verification failed", error);
    throw new HttpsError('invalid-argument', error.message);
  }

  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    const { credentialPublicKey, credentialID, counter } = registrationInfo;

    // Save the new authenticator
    // Note: credentialID is a Buffer/Uint8Array. Firestore stores it as Binary.
    // SimpleWebAuthn uses base64url strings in JSON, but internal types might be Buffers.
    // We will store it as is from registrationInfo (Buffer) or convert if needed.
    // For querying, storing as base64url string is often easier.
    
    // Convert Buffer to Base64URL string for storage/comparison
    const credentialIDBase64 = Buffer.from(credentialID).toString('base64url');
    const credentialPublicKeyBase64 = Buffer.from(credentialPublicKey).toString('base64url');

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
