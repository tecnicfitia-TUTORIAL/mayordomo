const axios = require('axios');
const { onRequest } = require("firebase-functions/v2/https");

// CREDENCIALES (Idealmente usar defineSecret en producción)
const GC_SECRET_ID = process.env.GOCARDLESS_SECRET_ID || "user_token";
const GC_SECRET_KEY = process.env.GOCARDLESS_SECRET_KEY || "live_rnaSQ2wgd0lJ4JP8loeeybUv8BF2xACGy5kZjHt1";

const BASE_URL = 'https://bankaccountdata.gocardless.com/api/v2';

// Cache simple para el token (en memoria de la instancia)
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
    const now = Date.now();
    if (cachedToken && now < tokenExpiry) {
        return cachedToken;
    }

    try {
        const response = await axios.post(`${BASE_URL}/token/new/`, {
            secret_id: GC_SECRET_ID,
            secret_key: GC_SECRET_KEY
        });
        
        cachedToken = response.data.access;
        // Expira en response.data.access_expires segundos (usualmente 24h)
        // Restamos 60s por seguridad
        tokenExpiry = now + (response.data.access_expires * 1000) - 60000;
        return cachedToken;
    } catch (error) {
        console.error("Error obteniendo token GoCardless:", error.response?.data || error.message);
        throw new Error("Fallo autenticación bancaria");
    }
}

exports.createBankLink = onRequest({ cors: true }, async (req, res) => {
    try {
        const token = await getAccessToken();
        const { institutionId, redirectUrl } = req.body; // ID del banco (ej: 'SANDBOXFINANCE_SFIN0000')

        // 1. Crear Requisición
        const response = await axios.post(`${BASE_URL}/requisitions/`, {
            redirect: redirectUrl || 'http://localhost:5173/dashboard',
            institution_id: institutionId || 'SANDBOXFINANCE_SFIN0000', // Default Sandbox
            reference: `user_${Date.now()}`,
            user_language: 'ES'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json({ 
            link: response.data.link, 
            requisitionId: response.data.id 
        });

    } catch (error) {
        console.error("Error creando link bancario:", error.response?.data || error.message);
        res.status(500).json({ error: error.message });
    }
});

exports.getBankData = onRequest({ cors: true }, async (req, res) => {
    try {
        const token = await getAccessToken();
        const { requisitionId } = req.query;

        if (!requisitionId) {
            return res.status(400).json({ error: "Falta requisitionId" });
        }

        // 1. Obtener detalles de la requisición para ver las cuentas vinculadas
        const reqResponse = await axios.get(`${BASE_URL}/requisitions/${requisitionId}/`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const accounts = reqResponse.data.accounts;
        if (!accounts || accounts.length === 0) {
            return res.json({ balance: 0, transactions: [] });
        }

        // 2. Obtener saldo de la primera cuenta (Simplificación)
        const accountId = accounts[0];
        const balanceResponse = await axios.get(`${BASE_URL}/accounts/${accountId}/balances/`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // 3. Obtener transacciones
        const transactionsResponse = await axios.get(`${BASE_URL}/accounts/${accountId}/transactions/`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Procesar saldo
        const balances = balanceResponse.data.balances;
        const mainBalance = balances.find(b => b.balanceType === 'interimAvailable') || balances[0];
        
        res.json({
            balance: parseFloat(mainBalance?.balanceAmount?.amount || 0),
            currency: mainBalance?.balanceAmount?.currency || 'EUR',
            transactions: transactionsResponse.data.transactions?.booked || []
        });

    } catch (error) {
        console.error("Error leyendo datos bancarios:", error.response?.data || error.message);
        res.status(500).json({ error: error.message });
    }
});
