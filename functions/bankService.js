const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const { onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');

// Inicializar Firestore si no está inicializado
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// CREDENCIALES (Sandbox por defecto)
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID || "692d8d0659bcdb001e85887f";
const PLAID_SECRET = process.env.PLAID_SECRET || "bf07836a8650fd4a59167c5bbaffd3";
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

/**
 * 1. CREATE LINK TOKEN
 * Genera un token temporal para inicializar el widget de Plaid en el frontend.
 */
exports.createLinkToken = onRequest({ cors: true }, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const request = {
      user: { client_user_id: userId },
      client_name: 'Mayordomo App',
      products: ['auth', 'transactions'],
      language: 'es',
      country_codes: ['ES', 'US', 'GB'], // Soporte multi-país
    };

    const createTokenResponse = await plaidClient.linkTokenCreate(request);
    res.json(createTokenResponse.data);
  } catch (error) {
    console.error("Error creating link token:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2. EXCHANGE PUBLIC TOKEN
 * Intercambia el token público (frontend) por un access_token permanente y lo guarda.
 */
exports.exchangePublicToken = onRequest({ cors: true }, async (req, res) => {
  try {
    const { publicToken, userId } = req.body;
    if (!publicToken || !userId) return res.status(400).json({ error: "Missing publicToken or userId" });

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

    res.json({ success: true, itemId });
  } catch (error) {
    console.error("Error exchanging token:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3. GET BANK DATA (REFRESH BALANCE)
 * Usa los tokens guardados para obtener el saldo total y transacciones recientes.
 */
exports.getBankData = onRequest({ cors: true }, async (req, res) => {
  try {
    // Aceptamos userId por body o query
    const userId = req.body.userId || req.query.userId;
    
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    // Obtener conexiones del usuario
    const snapshot = await db.collection('users').doc(userId).collection('bank_connections').get();
    
    if (snapshot.empty) {
      return res.json({ balance: 0, currency: 'EUR', transactions: [] });
    }

    let totalBalance = 0;
    let allTransactions = [];

    // Iterar sobre conexiones
    for (const doc of snapshot.docs) {
      const { accessToken } = doc.data();
      
      try {
        // Obtener saldo
        const balanceResponse = await plaidClient.accountsBalanceGet({
          access_token: accessToken,
        });
        
        // Sumar saldos de cuentas corrientes/ahorros (depository)
        balanceResponse.data.accounts.forEach(acc => {
            if (acc.type === 'depository' && acc.balances.current) {
                totalBalance += acc.balances.current;
            }
        });

        // Obtener transacciones (últimos 30 días) - Simplificado
        // En producción usar transactionsSync para eficiencia
        /*
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        
        const transactionsResponse = await plaidClient.transactionsGet({
            access_token: accessToken,
            start_date: thirtyDaysAgo.toISOString().split('T')[0],
            end_date: now.toISOString().split('T')[0],
            options: { count: 5 }
        });
        allTransactions.push(...transactionsResponse.data.transactions);
        */
       
      } catch (err) {
        console.error(`Error fetching data for connection ${doc.id}:`, err.message);
        // Continuar con otras conexiones si una falla
      }
    }

    res.json({ 
        balance: totalBalance, 
        currency: 'EUR', 
        transactions: allTransactions 
    });

  } catch (error) {
    console.error("Error getting bank data:", error.message);
    res.status(500).json({ error: error.message });
  }
});
