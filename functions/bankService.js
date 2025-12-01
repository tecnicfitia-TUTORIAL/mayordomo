const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require('firebase-admin');

// Inicializar Firestore si no está inicializado
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// SECRETS
const plaidClientId = defineSecret('PLAID_CLIENT_ID');
const plaidSecret = defineSecret('PLAID_SECRET');

// Helper para inicializar cliente con secretos
const getPlaidClient = () => {
  const configuration = new Configuration({
    basePath: PlaidEnvironments.sandbox, // Forzamos Sandbox para desarrollo
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': plaidClientId.value(),
        'PLAID-SECRET': plaidSecret.value(),
      },
    },
  });
  return new PlaidApi(configuration);
};

/**
 * 1. CREATE LINK TOKEN
 * Genera un token temporal para inicializar el widget de Plaid en el frontend.
 */
exports.createLinkToken = onCall({ cors: true, secrets: [plaidClientId, plaidSecret] }, async (request) => {
  try {
    const { userId } = request.data;
    if (!userId) throw new HttpsError('invalid-argument', "Missing userId");

    const plaidClient = getPlaidClient();

    const plaidRequest = {
      user: { client_user_id: userId },
      client_name: 'Mayordomo App',
      products: ['auth', 'transactions'],
      language: 'es',
      country_codes: ['ES', 'US', 'GB'], // Soporte multi-país
    };

    const createTokenResponse = await plaidClient.linkTokenCreate(plaidRequest);
    return createTokenResponse.data;
  } catch (error) {
    const errorDetail = error.response?.data || error.message;
    console.error("Error creating link token:", errorDetail);
    throw new HttpsError('internal', JSON.stringify(errorDetail));
  }
});

/**
 * 2. EXCHANGE PUBLIC TOKEN
 * Intercambia el token público (frontend) por un access_token permanente y lo guarda.
 */
exports.exchangePublicToken = onCall({ cors: true, secrets: [plaidClientId, plaidSecret] }, async (request) => {
  try {
    const { publicToken, userId } = request.data;
    
    // DEBUG: Check secrets existence (do not log values)
    if (!plaidClientId.value() || !plaidSecret.value()) {
        throw new HttpsError('failed-precondition', "Missing Plaid Secrets in Environment");
    }

    if (!publicToken || !userId) throw new HttpsError('invalid-argument', "Missing publicToken or userId");

    const plaidClient = getPlaidClient();

    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Guardar conexión en Firestore
    await db.collection('users').doc(userId).collection('bank_connections').doc(itemId).set({
      accessToken,
      itemId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      provider: 'PLAID',
      status: 'ACTIVE'
    });

    return { success: true, itemId };
  } catch (error) {
    const errorDetail = error.response?.data || error.message;
    console.error("Error exchanging token:", errorDetail);
    throw new HttpsError('internal', JSON.stringify(errorDetail));
  }
});

/**
 * 3. GET BANK DATA (REFRESH BALANCE)
 * Usa los tokens guardados para obtener el saldo total y transacciones recientes.
 */
exports.getBankData = onCall({ cors: true, secrets: [plaidClientId, plaidSecret] }, async (request) => {
  try {
    // Aceptamos userId por body o query
    const userId = request.data.userId;
    
    if (!userId) throw new HttpsError('invalid-argument', "Missing userId");

    // 1. Verificación Previa: Chequear conexiones en Firestore
    const snapshot = await db.collection('users').doc(userId).collection('bank_connections').get();
    
    if (snapshot.empty) {
      return { connected: false, balance: 0, currency: 'EUR', transactions: [] };
    }

    const plaidClient = getPlaidClient();
    let totalBalance = 0;
    let allTransactions = [];
    let successCount = 0;

    // Iterar sobre conexiones
    for (const doc of snapshot.docs) {
      const { accessToken } = doc.data();
      
      if (!accessToken) continue;

      try {
        // 2. Manejo de Errores de API
        const balanceResponse = await plaidClient.accountsBalanceGet({
          access_token: accessToken,
        });
        
        // Sumar saldos
        if (balanceResponse.data.accounts) {
            balanceResponse.data.accounts.forEach(acc => {
                if (acc.type === 'depository' && acc.balances.current) {
                    totalBalance += acc.balances.current;
                }
            });
            successCount++;
        }
       
      } catch (err) {
        console.error(`Plaid API Error for connection ${doc.id}:`, err.response?.data || err.message);
        // Si falla una conexión específica, no rompemos todo el flujo, pero registramos el error.
      }
    }

    // Si fallaron todas las conexiones que existían (ej: token expirado)
    if (successCount === 0 && !snapshot.empty) {
         return { connected: false, error: "Token inválido o error de conexión", balance: 0 };
    }

    return { 
        connected: true,
        balance: totalBalance, 
        currency: 'EUR', 
        transactions: allTransactions 
    };

  } catch (error) {
    console.error("Critical Error in getBankData:", error.message);
    // Devolvemos una respuesta segura en lugar de explotar
    return { connected: false, error: "Internal Server Error", balance: 0 };
  }
});
