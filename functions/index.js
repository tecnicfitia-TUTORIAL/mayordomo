
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { beforeUserSignedIn } = require("firebase-functions/v2/identity");
const { defineSecret } = require("firebase-functions/params");
const admin = require('firebase-admin');
const stripe = require('stripe');
const bankService = require('./bankService');
const emailService = require('./emailService');
const aiService = require('./aiService');
const https = require('https');

// Inicializar solo si no hay ninguna app ya corriendo
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * BLOCKING FUNCTION: CHECK EMAIL VERIFICATION
 * Prevents login if email is not verified.
 * Allows a 2-minute grace period for new accounts to allow the frontend to send the email.
 */
// exports.checkEmailVerification = beforeUserSignedIn((event) => {
//   const user = event.data;
  
//   // If email is already verified, allow access
//   if (user.emailVerified) {
//     return;
//   }

//   // Check creation time to allow initial login for sending the verification email
//   // We give a 2-minute window (120000 ms)
//   const creationTime = new Date(user.metadata.creationTime).getTime();
//   const now = Date.now();
  
//   if (now - creationTime < 120000) {
//       // New user (created < 2 mins ago) -> Allow login so frontend can send email
//       return;
//   }

//   // If not verified and older than 2 minutes -> BLOCK
//   throw new https.HttpsError(
//     'permission-denied', 
//     'Debe verificar su correo electrónico para iniciar sesión. Revise su bandeja de entrada.'
//   );
// });

// Export Bank & Email Services
exports.createLinkToken = bankService.createLinkToken;
exports.exchangePublicToken = bankService.exchangePublicToken;
exports.getBankData = bankService.getBankData;
exports.disconnectBank = bankService.disconnectBank;
exports.getGmailAuthUrl = emailService.getGmailAuthUrl;
exports.scanGmail = emailService.scanGmail;

// Export AI Services
exports.generateChatResponse = aiService.generateChatResponse;
exports.inferObligations = aiService.inferObligations;
exports.analyzeGapAndPropose = aiService.analyzeGapAndPropose;

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
