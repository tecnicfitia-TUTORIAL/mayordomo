const { onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');

// Inicializar Firestore si no está inicializado
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * 1. GENERATE MFA SETUP
 * Generates a new secret and QR code for the user to scan.
 */
exports.generateMfaSetup = onRequest({ cors: true, maxInstances: 10 }, async (req, res) => {
  // MANUAL CORS FIX
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: "Missing userId or email" });
    }

    // Generate Secret
    const secret = authenticator.generateSecret();

    // Generate OTPauth URL (Standard format for Google Auth)
    const otpauth = authenticator.keyuri(email, 'Mayordomo Digital', secret);

    // Generate QR Code Data URL
    const qrCodeUrl = await qrcode.toDataURL(otpauth);

    // Save secret temporarily (pending verification)
    // We store it in a subcollection 'secrets' inside the user doc, protected by rules
    await db.collection('users').doc(userId).collection('security').doc('mfa_pending').set({
      secret,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ secret, qrCodeUrl });

  } catch (error) {
    console.error("Error generating MFA:", error);
    res.status(500).json({ error: "Failed to generate MFA setup" });
  }
});

/**
 * 2. VERIFY MFA SETUP
 * Verifies the first token to activate MFA for the account.
 */
exports.verifyMfaSetup = onRequest({ cors: true, maxInstances: 10 }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: "Missing data" });
    }

    // Get pending secret
    const pendingDoc = await db.collection('users').doc(userId).collection('security').doc('mfa_pending').get();

    if (!pendingDoc.exists) {
      return res.status(404).json({ error: "No pending MFA setup found" });
    }

    const { secret } = pendingDoc.data();

    // Verify Token
    const isValid = authenticator.check(token, secret);

    if (!isValid) {
      return res.status(400).json({ error: "Invalid code" });
    }

    // Activate MFA
    // Move secret to 'mfa_active' and delete pending
    await db.collection('users').doc(userId).collection('security').doc('mfa_active').set({
      secret,
      activatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('users').doc(userId).collection('security').doc('mfa_pending').delete();

    // Update user profile flag
    await db.collection('users').doc(userId).update({
      mfaEnabled: true
    });

    res.json({ success: true });

  } catch (error) {
    console.error("Error verifying MFA:", error);
    res.status(500).json({ error: "Failed to verify MFA" });
  }
});

/**
 * 3. VALIDATE MFA (THE GATE)
 * Verifies a token for a specific high-security action.
 */
exports.validateMfa = onRequest({ cors: true, maxInstances: 10 }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: "Missing data" });
    }

    // Get active secret
    const activeDoc = await db.collection('users').doc(userId).collection('security').doc('mfa_active').get();

    if (!activeDoc.exists) {
      return res.status(400).json({ error: "MFA not enabled for this user" });
    }

    const { secret } = activeDoc.data();

    // Verify Token
    const isValid = authenticator.check(token, secret);

    if (isValid) {
      res.json({ valid: true });
    } else {
      res.json({ valid: false });
    }

  } catch (error) {
    console.error("Error validating MFA:", error);
    res.status(500).json({ error: "Validation failed" });
  }
});
