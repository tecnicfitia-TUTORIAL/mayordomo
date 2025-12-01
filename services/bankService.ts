import axios from 'axios';

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project';
const REGION = 'us-central1';
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const BASE_URL = IS_LOCAL 
    ? `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}`
    : `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;

export interface BankTransaction {
    transaction_id: string;
    date: string;
    amount: number;
    name: string;
}

export interface BankData {
    balance: number;
    currency: string;
    transactions: BankTransaction[];
}

export const BankService = {
    
    /**
     * 1. Obtiene un Link Token del backend para inicializar Plaid Link
     */
    createLinkToken: async (userId: string): Promise<string> => {
        try {
            const response = await axios.post(`${BASE_URL}/createLinkToken`, { userId });
            return response.data.link_token;
        } catch (error) {
            console.error("Error creating link token:", error);
            throw new Error("No se pudo iniciar la conexión bancaria.");
        }
    },

    /**
     * 2. Intercambia el Public Token por un Access Token permanente
     */
    exchangePublicToken: async (publicToken: string, userId: string): Promise<void> => {
        try {
            await axios.post(`${BASE_URL}/exchangePublicToken`, {
                publicToken,
                userId
            });
        } catch (error: any) {
            console.error("Error exchanging token FULL:", error.response?.data || error);
            throw new Error(`Error vinculando la cuenta bancaria: ${JSON.stringify(error.response?.data || error.message)}`);
        }
    },

    /**
     * 3. Obtiene saldo y movimientos usando el token guardado en backend
     */
    getBankData: async (userId: string): Promise<BankData> => {
        try {
            const response = await axios.get(`${BASE_URL}/getBankData`, {
                params: { userId }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching bank data:", error);
            throw new Error("Error obteniendo datos bancarios.");
        }
    }
};
