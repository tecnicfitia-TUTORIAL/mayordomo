import { httpsCallableFromURL } from 'firebase/functions';
import { functions } from './firebaseConfig';

// CLOUD RUN URL CONFIGURATION (Firebase Functions Gen 2)
const PROJECT_HASH = 'qky5eul2mq'; // Hash from deployment logs
const REGION = 'us-central1';
const getFunctionUrl = (name: string) => `https://${name.toLowerCase()}-${PROJECT_HASH}-uc.a.run.app`;

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
            const url = getFunctionUrl('createLinkToken');
            const createLinkTokenFn = httpsCallableFromURL(functions, url);
            const result = await createLinkTokenFn({ userId });
            const data = result.data as any;
            return data.link_token;
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
            const url = getFunctionUrl('exchangePublicToken');
            const exchangePublicTokenFn = httpsCallableFromURL(functions, url);
            await exchangePublicTokenFn({
                publicToken,
                userId
            });
        } catch (error: any) {
            console.error("Error exchanging token FULL:", error);
            throw new Error(`Error vinculando la cuenta bancaria: ${error.message}`);
        }
    },

    /**
     * 3. Obtiene saldo y movimientos usando el token guardado en backend
     */
    getBankData: async (userId: string): Promise<BankData> => {
        try {
            const url = getFunctionUrl('getBankData');
            const getBankDataFn = httpsCallableFromURL(functions, url);
            const result = await getBankDataFn({ userId });
            return result.data as BankData;
        } catch (error) {
            console.error("Error fetching bank data:", error);
            throw new Error("Error obteniendo datos bancarios.");
        }
    }
};

