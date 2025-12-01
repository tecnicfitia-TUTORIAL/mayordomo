import axios from 'axios';

// Ajustar URL base según entorno (Local Emulator vs Production)
// En Codespaces/DevContainer, localhost:5001 puede necesitar port forwarding o usar la URL pública.
// Para este ejemplo, asumimos que las funciones están desplegadas o emuladas.
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project';
const REGION = 'us-central1';
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const BASE_URL = IS_LOCAL 
    ? `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}`
    : `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;

export interface BankTransaction {
    transactionId: string;
    bookingDate: string;
    transactionAmount: { amount: string; currency: string };
    remittanceInformationUnstructured?: string;
}

export interface BankData {
    balance: number;
    currency: string;
    transactions: BankTransaction[];
}

export const BankService = {
    
    /**
     * Inicia el flujo de conexión bancaria (GoCardless)
     */
    connectBank: async (): Promise<{ link: string; requisitionId: string }> => {
        try {
            // Llama a la Cloud Function
            const response = await axios.post(`${BASE_URL}/createBankLink`, {
                redirectUrl: window.location.origin + '/dashboard?bank_connected=true', // Redirige de vuelta a la app
                institutionId: 'SANDBOXFINANCE_SFIN0000' // Sandbox Bank por defecto
            });
            return response.data;
        } catch (error) {
            console.error("Error connecting bank:", error);
            throw new Error("No se pudo iniciar la conexión bancaria.");
        }
    },

    /**
     * Obtiene saldo y movimientos
     */
    getBankData: async (requisitionId: string): Promise<BankData> => {
        try {
            const response = await axios.get(`${BASE_URL}/getBankData`, {
                params: { requisitionId }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching bank data:", error);
            throw new Error("Error obteniendo datos bancarios.");
        }
    }
};
