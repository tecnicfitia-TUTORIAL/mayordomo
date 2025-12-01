
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require('firebase-admin');
const stripe = require('stripe');
const bankService = require('./bankService');
const emailService = require('./emailService');

// Inicializar solo si no hay ninguna app ya corriendo
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// Export Bank & Email Services
exports.createLinkToken = bankService.createLinkToken;
exports.exchangePublicToken = bankService.exchangePublicToken;
exports.getBankData = bankService.getBankData;
exports.getGmailAuthUrl = emailService.getGmailAuthUrl;
exports.scanGmail = emailService.scanGmail;

// Secret Keys (Secure Environment)
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// Map Stripe Product IDs to Internal Subscription Tiers
const TIER_MAPPING = {
  'prod_BasicId123': 'ASISTENTE',
  'prod_ProId456':   'MAYORDOMO',
  'prod_VipId789':   'GOBERNANTE'
};

/**
 * STRIPE WEBHOOK HANDLER
 * Listens for subscription events to update user Firestore documents securely.
 */
exports.stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const stripeClient = stripe(stripeSecretKey.value());
    
    let event;

    try {
      event = stripeClient.webhooks.constructEvent(
        req.rawBody, 
        signature, 
        stripeWebhookSecret.value()
      );
    } catch (err) {
      console.error(`Webhook Signature Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
            const subscription = event.data.object;
            const customerId = subscription.customer;
            const priceId = subscription.items.data[0].price.product;
            const status = subscription.status;

            // Find user by Stripe ID
            const snapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
            
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const newTier = (status === 'active' || status === 'trialing') 
                    ? (TIER_MAPPING[priceId] || 'INVITADO') 
                    : 'INVITADO';
                
                await doc.ref.update({
                    subscriptionTier: newTier,
                    subscriptionStatus: status,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`[Stripe] User ${doc.id} updated to ${newTier}`);
            }
        } 
        else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            const customerId = subscription.customer;
            
            const snapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
            if (!snapshot.empty) {
                await snapshot.docs[0].ref.update({
                    subscriptionTier: 'INVITADO',
                    subscriptionStatus: 'canceled',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`[Stripe] User ${snapshot.docs[0].id} subscription canceled`);
            }
        }
        
        res.json({ received: true });
    } catch (error) {
        console.error("Webhook Logic Error:", error);
        res.status(500).send("Internal Server Error");
    }
  }
);
