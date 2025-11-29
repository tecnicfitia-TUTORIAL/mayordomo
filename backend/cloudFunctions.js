/**
 * BACKEND LOGIC (Node.js / Firebase Cloud Functions)
 * ==================================================
 * Deploy this code to your Firebase Functions environment.
 * It handles the "Golden Rule": Stripe updates -> Firestore updates.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializar Stripe con la clave secreta desde variables de entorno
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

admin.initializeApp();
const db = admin.firestore();

// MAP: Stripe Product IDs -> App Tiers
// ACTUALIZAR CON LOS IDs REALES DE STRIPE DASHBOARD
const TIER_MAPPING = {
  'prod_BasicId123': 'ASISTENTE',    // Basic
  'prod_ProId456':   'MAYORDOMO',    // Pro
  'prod_VipId789':   'GOBERNANTE'    // VIP
};

/**
 * 1. STRIPE WEBHOOK LISTENER
 * Listens for 'customer.subscription.updated' and 'deleted'.
 * Updates the user's Firestore document automatically.
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify signature to ensure request comes from Stripe
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    const subscription = event.data.object;
    await handleSubscriptionChange(subscription);
  } else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    await handleSubscriptionCancellation(subscription);
  }

  res.json({ received: true });
});

/**
 * Helper: Handle Plan Change or Payment Success
 */
async function handleSubscriptionChange(subscription) {
  const customerId = subscription.customer;
  const priceId = subscription.items.data[0].price.product; // or .id based on config
  const status = subscription.status;

  // 1. Find user by Stripe Customer ID
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).get();

  if (snapshot.empty) {
    console.error('User not found for Stripe Customer:', customerId);
    return;
  }

  // 2. Determine new Tier
  let newTier = 'INVITADO'; // Default fallback
  if (status === 'active' || status === 'trialing') {
    newTier = TIER_MAPPING[priceId] || 'INVITADO';
  }

  // 3. Update Firestore
  snapshot.forEach(async (doc) => {
    await doc.ref.update({
      subscriptionTier: newTier,
      subscriptionStatus: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Updated user ${doc.id} to tier ${newTier}`);
  });
}

/**
 * Helper: Handle Cancellation
 */
async function handleSubscriptionCancellation(subscription) {
  const customerId = subscription.customer;
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).get();

  snapshot.forEach(async (doc) => {
    await doc.ref.update({
      subscriptionTier: 'INVITADO', // Revert to Free
      subscriptionStatus: 'canceled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Reverted user ${doc.id} to INVITADO (Canceled)`);
  });
}

/**
 * 2. CREATE PORTAL SESSION
 * Called by Frontend to get the URL for the Billing Portal.
 */
exports.createPortalSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const uid = context.auth.uid;
  const returnUrl = data.returnUrl || 'https://confort-app.web.app';

  // Get Stripe Customer ID from Firestore
  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data();

  if (!userData.stripeCustomerId) {
    throw new functions.https.HttpsError('failed-precondition', 'No Stripe Customer ID found for user');
  }

  // Create Session
  const session = await stripe.billingPortal.sessions.create({
    customer: userData.stripeCustomerId,
    return_url: returnUrl,
  });

  return { url: session.url };
});