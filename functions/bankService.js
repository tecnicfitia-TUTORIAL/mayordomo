const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const { onRequest } = require("firebase-functions/v2/https");
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
exports.createLinkToken = onRequest({ cors: true, secrets: [plaidClientId, plaidSecret], maxInstances: 10 }, async (req, res) => {
  // MANUAL CORS FIX
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    console.log("Entry createLinkToken (HTTP)", req.body);
    const { userId } = req.body;
    
    if (!userId) {
        res.status(400).json({ error: "Missing userId" });
        return;
    }

    const plaidClient = getPlaidClient();

    const plaidRequest = {
      user: { client_user_id: userId },
      client_name: 'Mayordomo App',
      products: ['auth', 'transactions'],
      language: 'es',
      country_codes: ['ES', 'US', 'GB'],
    };

    const createTokenResponse = await plaidClient.linkTokenCreate(plaidRequest);
    res.json(createTokenResponse.data);

  } catch (error) {
    console.error("Error creating link token:", error);
    const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    res.status(500).json({ error: msg });
  }
});

/**
 * 2. EXCHANGE PUBLIC TOKEN
 * Intercambia el token público (frontend) por un access_token permanente y lo guarda.
 * CONVERTED TO onRequest FOR MANUAL CORS
 */
exports.exchangePublicToken = onRequest({ cors: true, secrets: [plaidClientId, plaidSecret], maxInstances: 10 }, async (req, res) => {
  // MANUAL CORS FIX
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    console.log("Entry exchangePublicToken (HTTP)", req.body);
    const { publicToken, userId } = req.body;

    if (!publicToken || !userId) {
        res.status(400).json({ error: "Missing publicToken or userId" });
        return;
    }

    const plaidClient = getPlaidClient();

    console.log("Calling Plaid itemPublicTokenExchange...");
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    console.log("Plaid Exchange Success. Item ID:", response.data.item_id);

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Get Institution ID (Best Effort)
    let institutionId = 'unknown';
    try {
        const itemResponse = await plaidClient.itemGet({ access_token: accessToken });
        institutionId = itemResponse.data.item.institution_id || 'unknown';
    } catch (e) {
        console.warn("Could not fetch institution ID", e.message);
    }

    // Guardar conexión en Firestore (Array Union)
    console.log("Saving to Firestore Array...");
    const newConnection = {
      accessToken,
      itemId,
      institutionId,
      createdAt: Date.now(),
      provider: 'PLAID',
      status: 'ACTIVE'
    };

    await db.collection('users').doc(userId).set({
        bankAccounts: admin.firestore.FieldValue.arrayUnion(newConnection)
    }, { merge: true });
    
    console.log("Firestore Save Success");

    res.json({ success: true, itemId });
  } catch (error) {
    console.error("Error exchanging token FULL OBJECT:", error);
    const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    res.status(500).json({ error: msg });
  }
});

/**
 * 3. GET BANK DATA (REFRESH BALANCE)
 * Usa los tokens guardados para obtener el saldo total y transacciones recientes.
 * CONVERTED TO onRequest FOR MANUAL CORS
 */
exports.getBankData = onRequest({ cors: true, secrets: [plaidClientId, plaidSecret], maxInstances: 10 }, async (req, res) => {
  // MANUAL CORS FIX
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Aceptamos userId por body
    const { userId } = req.body;
    
    if (!userId) {
        res.status(400).json({ error: "Missing userId" });
        return;
    }

    // 1. Obtener conexiones del Array
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const bankAccounts = userData?.bankAccounts || [];

    if (bankAccounts.length === 0) {
      // Fallback check for legacy subcollection
      const subSnapshot = await db.collection('users').doc(userId).collection('bank_connections').get();
      if (subSnapshot.empty) {
          res.json({ connected: false, balance: 0, currency: 'EUR', transactions: [] });
          return;
      }
      // If legacy exists, we could use it, but for now let's just return empty to force migration/reconnect
      // or handle it. Given the prompt "Modifica la lógica", I'll stick to the new logic primarily.
      // But to avoid breaking the demo if they don't reconnect immediately:
      // I will NOT implement legacy fallback reading here to keep code clean as requested.
      res.json({ connected: false, balance: 0, currency: 'EUR', transactions: [] });
      return;
    }

    const plaidClient = getPlaidClient();
    let totalBalance = 0;
    let allTransactions = [];
    let successCount = 0;

    // Iterar sobre conexiones
    for (const account of bankAccounts) {
      const { accessToken } = account;
      
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
        console.error(`Plaid API Error for connection ${account.itemId}:`, err.response?.data || err.message);
        // Si falla una conexión específica, no rompemos todo el flujo, pero registramos el error.
      }
    }

    // Si fallaron todas las conexiones que existían (ej: token expirado)
    if (successCount === 0 && bankAccounts.length > 0) {
         res.json({ connected: false, error: "Token inválido o error de conexión", balance: 0 });
         return;
    }

    res.json({ 
        connected: true,
        balance: totalBalance, 
        currency: 'EUR', 
        transactions: allTransactions 
    });

  } catch (error) {
    console.error("Critical Error in getBankData:", error.message);
    res.status(500).json({ connected: false, error: "Internal Server Error", balance: 0 });
  }
});

/**
 * 4. DISCONNECT BANK
 * Elimina los tokens de acceso de la base de datos y (opcionalmente) de Plaid.
 */
exports.disconnectBank = onRequest({ cors: true, secrets: [plaidClientId, plaidSecret], maxInstances: 10 }, async (req, res) => {
  // MANUAL CORS FIX
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { userId } = req.body;
    
    if (!userId) {
        res.status(400).json({ error: "Missing userId" });
        return;
    }

    console.log(`Disconnecting banks for user: ${userId}`);

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const bankAccounts = userDoc.data()?.bankAccounts || [];
    
    // Also check legacy subcollection to be thorough
    const subSnapshot = await userRef.collection('bank_connections').get();
    
    if (bankAccounts.length === 0 && subSnapshot.empty) {
        res.json({ success: true, message: "No connections to remove" });
        return;
    }

    const plaidClient = getPlaidClient();

    // 1. Remove from Plaid (Array)
    for (const account of bankAccounts) {
        if (account.accessToken) {
            try {
                await plaidClient.itemRemove({ access_token: account.accessToken });
            } catch (err) {
                console.warn(`Failed to remove item from Plaid: ${err.message}`);
            }
        }
    }

    // 2. Remove from Plaid (Legacy Subcollection)
    for (const doc of subSnapshot.docs) {
        const { accessToken } = doc.data();
        if (accessToken) {
            try {
                await plaidClient.itemRemove({ access_token: accessToken });
            } catch (err) {
                console.warn(`Failed to remove legacy item from Plaid: ${err.message}`);
            }
        }
    }

    // 3. Clear Firestore
    const batch = db.batch();
    
    // Clear Array
    batch.update(userRef, { bankAccounts: [] });
    
    // Clear Subcollection
    subSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
    console.log("All connections removed from Firestore");

    res.json({ success: true });

  } catch (error) {
    console.error("Error disconnecting bank:", error);
    res.status(500).json({ error: error.message });
  }
});
