// functions/index.js (VERSIÓN v2 MODERNA)

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const stripe = require("stripe");

// 1. DEFINICIÓN DE LA CLAVE SECRETA
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");

admin.initializeApp();
const db = admin.firestore();

// Mapeo de IDs (Recuerda personalizar esto luego)
const TIER_MAPPING = {
  'price_id_asistente_aqui': 'TIER_2_ASISTENTE',
  'price_id_mayordomo_aqui': 'TIER_3_MAYORDOMO',
  'price_id_gobernante_aqui': 'TIER_4_GOBERNANTE',
};

// 2. LA FUNCIÓN WEBHOOK (Sintaxis v2)
exports.stripeWebhook = onRequest({ secrets: [STRIPE_SECRET_KEY] }, async (req, res) => {
  
  if (req.method !== "POST") {
    return res.status(405).send("Método No Permitido.");
  }

  // Acceso seguro a la clave
  const stripeClient = stripe(STRIPE_SECRET_KEY.value());
  
  const event = req.body;
  const eventType = event.type;

  if (eventType === 'customer.subscription.updated' || eventType === 'customer.subscription.deleted' || eventType === 'customer.subscription.created') {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    const priceId = subscription.items.data[0].price.id;
    
    // Buscar usuario
    const customerSnapshot = await db.collection('stripe_customers').doc(customerId).get();
    const userId = customerSnapshot.data()?.app_user_id;

    if (!userId) {
      console.log(`Usuario no encontrado para Stripe Customer ID: ${customerId}`);
      return res.status(404).send('Usuario no encontrado.');
    }

    const newTier = TIER_MAPPING[priceId] || 'TIER_1_INVITADO';
    const newStatus = subscription.status;

    await db.collection('users').doc(userId).update({
      subscriptionTier: newTier,
      subscriptionStatus: newStatus
    });

    console.log(`Usuario ${userId} actualizado al nivel ${newTier}.`);
    return res.status(200).send('Webhook Procesado.');

  } else {
    return res.status(200).send('Evento ignorado.');
  }
});