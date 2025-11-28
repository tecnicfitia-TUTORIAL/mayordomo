// --- IMPORTS CORRECTOS PARA FUNCTIONS V2 ---
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const Stripe = require("stripe");

// --- SECRETOS ---
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");

// --- FIREBASE ADMIN ---
admin.initializeApp();
const db = admin.firestore();

// --- MAPEO DE PLANES ---
const TIER_MAPPING = {
  "price_id_asistente_aqui": "TIER_2_ASISTENTE",
  "price_id_mayordomo_aqui": "TIER_3_MAYORDOMO",
  "price_id_gobernante_aqui": "TIER_4_GOBERNANTE",
};

// --- WEBHOOK 2ND GEN ---
exports.stripeWebhook = onRequest(
  {
    region: "us-central1",
    secrets: [STRIPE_SECRET_KEY],
    // ⚠️ OBLIGATORIO PARA STRIPE: BODY RAW
    raw: true,
  },
  async (req, res) => {

    if (req.method !== "POST") {
      return res.status(405).send("Método no permitido.");
    }

    // Crear cliente Stripe con secret seguro
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());

    let event;

    try {
      // Verificar firma del webhook
      const sig = req.headers["stripe-signature"];
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET // Este NO es el mismo que la API Key
      );
    } catch (err) {
      console.error("⚠️ Error verificando webhook:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const eventType = event.type;

    if (
      eventType === "customer.subscription.updated" ||
      eventType === "customer.subscription.deleted" ||
      eventType === "customer.subscription.created"
    ) {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const priceId = subscription.items.data[0].price.id;

      // Buscar usuario en Firestore
      const customerRef = db.collection("stripe_customers").doc(customerId);
      const customerSnap = await customerRef.get();

      const userId = customerSnap.data()?.app_user_id;

      if (!userId) {
        console.log("Usuario no encontrado:", customerId);
        return res.status(404).send("Usuario no encontrado");
      }

      // Obtener tier según price ID
      const newTier = TIER_MAPPING[priceId] || "TIER_1_INVITADO";
      const newStatus = subscription.status;

      // Actualizar usuario
      await db.collection("users").doc(userId).update({
        subscriptionTier: newTier,
        subscriptionStatus: newStatus,
      });

      console.log(`Usuario ${userId} → ${newTier} (${newStatus})`);
      return res.status(200).send("Webhook procesado");
    }

    return res.status(200).send("Evento ignorado");
  }
);
