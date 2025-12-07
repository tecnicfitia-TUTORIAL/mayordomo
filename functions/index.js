
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { beforeUserSignedIn } = require("firebase-functions/v2/identity");
const { defineSecret } = require("firebase-functions/params");
const admin = require('firebase-admin');
const stripe = require('stripe');
const bankService = require('./bankService');
const emailService = require('./emailService');
const aiService = require('./aiService');
const mfaService = require('./mfaService');
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
exports.checkEmailVerification = beforeUserSignedIn((event) => {
  const user = event.data;
  
  // If email is already verified, allow access
  if (user.emailVerified) {
    return;
  }

  // Check creation time to allow initial login for sending the verification email
  // We give a 2-minute window (120000 ms)
  const creationTime = new Date(user.metadata.creationTime).getTime();
  const now = Date.now();
  
  if (now - creationTime < 120000) {
      // New user (created < 2 mins ago) -> Allow login so frontend can send email
      console.log(`[Auth] Allowing new unverified user: ${user.email}`);
      return;
  }

  console.log(`[Auth] Blocking unverified user: ${user.email}`);
  // If not verified and older than 2 minutes -> BLOCK
  throw new https.HttpsError(
    'permission-denied', 
    'Debe verificar su correo electrónico para iniciar sesión. Revise su bandeja de entrada.'
  );
});

// Export Bank & Email Services
exports.createLinkToken = bankService.createLinkToken;
exports.exchangePublicToken = bankService.exchangePublicToken;
exports.getBankData = bankService.getBankData;
exports.disconnectBank = bankService.disconnectBank;

// Export Government Services
const governmentService = require('./governmentService');
exports.getDEHUNotifications = governmentService.getDEHUNotifications;
exports.getAEATStatus = governmentService.getAEATStatus;
exports.getDGTPoints = governmentService.getDGTPoints;

// Export Certificate Services
const certificateService = require('./certificateService');
exports.uploadUserCertificate = certificateService.uploadUserCertificate;
exports.getUserCertificateStatus = certificateService.getUserCertificateStatus;
exports.deleteUserCertificate = certificateService.deleteUserCertificate;
exports.getGmailAuthUrl = emailService.getGmailAuthUrl;
exports.validateGmailConnection = emailService.validateGmailConnection;
exports.scanGmail = emailService.scanGmail;

// Export AI Services
exports.generateChatResponse = aiService.generateChatResponse;
exports.inferObligations = aiService.inferObligations;
exports.analyzeGapAndPropose = aiService.analyzeGapAndPropose;

// Export MFA Services
exports.generateMfaSetup = mfaService.generateMfaSetup;
exports.verifyMfaSetup = mfaService.verifyMfaSetup;
exports.validateMfa = mfaService.validateMfa;

// Export Auth Services (Biometrics)
const authService = require('./authService');
exports.generateRegistrationOptions = authService.generateRegistrationOptions;
exports.verifyRegistration = authService.verifyRegistration;
exports.generateAuthenticationOptions = authService.generateAuthenticationOptions;
exports.verifyAuthentication = authService.verifyAuthentication;

// Secret Keys (Secure Environment)
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// Map Stripe Price IDs to Internal Subscription Tiers
// These match the Price IDs from your Payment Links
const TIER_MAPPING = {
  'price_1SYTOfRWeo9ZzuM69Z0q69sY': 'BASIC',  // Asistente Digital
  'price_1SYTQRRWeo9ZzuM6RshKCwIk': 'PRO',     // Mayordomo Digital
  'price_1SYTRxRWeo9ZzuM6oZHTQlNM': 'VIP'      // Gobernante
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
        // Handle Payment Link checkout completion
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const customerEmail = session.customer_details?.email;
            const customerId = session.customer;
            const priceId = session.line_items?.data?.[0]?.price?.id || session.metadata?.price_id;
            
            console.log(`[Stripe] Checkout completed for customer: ${customerEmail || customerId}, price: ${priceId}`);
            
            // Find user by email (since Payment Links don't require pre-existing customer)
            let userRef = null;
            if (customerEmail) {
                const emailSnapshot = await db.collection('users').where('email', '==', customerEmail).limit(1).get();
                if (!emailSnapshot.empty) {
                    userRef = emailSnapshot.docs[0].ref;
                }
            }
            
            // Also try by Stripe Customer ID if exists
            if (!userRef && customerId) {
                const customerSnapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
                if (!customerSnapshot.empty) {
                    userRef = customerSnapshot.docs[0].ref;
                }
            }
            
            if (userRef) {
                const newTier = TIER_MAPPING[priceId] || 'FREE';
                await userRef.update({
                    subscriptionTier: newTier,
                    subscriptionStatus: 'active',
                    stripeCustomerId: customerId || admin.firestore.FieldValue.delete(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`[Stripe] User ${userRef.id} updated to ${newTier} via Payment Link`);
            } else {
                console.warn(`[Stripe] No user found for email: ${customerEmail} or customer: ${customerId}`);
            }
        }
        // Handle subscription updates (for recurring subscriptions)
        else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
            const subscription = event.data.object;
            const customerId = subscription.customer;
            const priceId = subscription.items.data[0].price.id; // Use price.id, not price.product
            const status = subscription.status;

            // Find user by Stripe Customer ID
            const snapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
            
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const newTier = (status === 'active' || status === 'trialing') 
                    ? (TIER_MAPPING[priceId] || 'FREE') 
                    : 'FREE';
                
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
                    subscriptionTier: 'FREE',
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

/**
 * CREATE CHECKOUT SESSION (Dynamic)
 * Creates a Stripe Checkout Session for a specific subscription tier.
 * Requires authentication via Firebase Auth token.
 */
exports.createCheckoutSession = onRequest(
  { cors: true, secrets: [stripeSecretKey] },
  async (req, res) => {
    try {
      // 1. Verify Firebase Auth token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }

      const userId = decodedToken.uid;
      const { tier } = req.body;

      if (!tier) {
        return res.status(400).json({ error: 'Missing tier parameter' });
      }

      // 2. Map internal tier to Stripe Price ID
      // TODO: Replace these with your actual Stripe Price IDs from Stripe Dashboard
      const PRICE_ID_MAPPING = {
        'BASIC': process.env.STRIPE_PRICE_ID_BASIC || 'price_xxxxx_basic',  // Replace with real Price ID
        'PRO': process.env.STRIPE_PRICE_ID_PRO || 'price_xxxxx_pro',        // Replace with real Price ID
        'VIP': process.env.STRIPE_PRICE_ID_VIP || 'price_xxxxx_vip'          // Replace with real Price ID
      };

      const priceId = PRICE_ID_MAPPING[tier.toUpperCase()];
      if (!priceId || priceId.startsWith('price_xxxxx')) {
        return res.status(400).json({ 
          error: 'Invalid tier or Price ID not configured',
          message: 'Please configure STRIPE_PRICE_ID_BASIC, STRIPE_PRICE_ID_PRO, and STRIPE_PRICE_ID_VIP in your environment variables'
        });
      }

      // 3. Get or create Stripe Customer
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      let customerId = userData?.stripeCustomerId;

      const stripeClient = stripe(stripeSecretKey.value());

      if (!customerId) {
        // Create new Stripe customer
        const customer = await stripeClient.customers.create({
          email: decodedToken.email,
          metadata: {
            firebase_uid: userId
          }
        });
        customerId = customer.id;

        // Save customer ID to Firestore
        await db.collection('users').doc(userId).update({
          stripeCustomerId: customerId
        });
      }

      // 4. Create Checkout Session
      const session = await stripeClient.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.headers.origin || 'https://mayordomo.app'}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin || 'https://mayordomo.app'}/app?checkout=cancelled`,
        metadata: {
          firebase_uid: userId,
          tier: tier.toUpperCase()
        }
      });

      res.json({ 
        success: true, 
        sessionId: session.id,
        url: session.url 
      });

    } catch (error) {
      console.error("[createCheckoutSession] Error:", error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
);

exports.debugGetUserAuthenticators = authService.debugGetUserAuthenticators;

/**
 * PROCESS EMAIL WITH AI
 * Processes an email using Gemini AI to extract structured data.
 */
exports.processEmailWithAI = onRequest(
  { cors: true, secrets: [aiService.googleGenAIKey] },
  async (req, res) => {
    try {
      // Verify Firebase Auth token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }

      const { emailId, sender, subject, snippet, detectedType, targetPillar } = req.body;

      if (!subject || !snippet) {
        return res.status(400).json({ error: 'Missing required fields: subject, snippet' });
      }

      // Use AI Service to extract structured data
      const prompt = `Analiza este email y extrae información estructurada:
      
De: ${sender}
Asunto: ${subject}
Contenido: ${snippet}

Tipo detectado: ${detectedType}
Pilar objetivo: ${targetPillar}

Extrae:
- Monto (si es factura/pago)
- Fecha de vencimiento
- Referencia/número de documento
- Acción requerida
- Datos relevantes según el tipo

Responde en JSON.`;

      const aiResponse = await aiService.generateChatResponse(
        [{ role: 'user', content: prompt }],
        decodedToken.uid
      );

      res.json({
        success: true,
        extractedData: {
          type: detectedType,
          pillar: targetPillar,
          summary: aiResponse || 'Email procesado',
          rawAIResponse: aiResponse
        }
      });

    } catch (error) {
      console.error("[processEmailWithAI] Error:", error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }
);
