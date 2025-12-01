import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseConfig';

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
            const createLinkTokenFn = httpsCallable(functions, 'createLinkToken');
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
            const exchangePublicTokenFn = httpsCallable(functions, 'exchangePublicToken');
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
            const getBankDataFn = httpsCallable(functions, 'getBankData');
            const result = await getBankDataFn({ userId });
            return result.data as BankData;
        } catch (error) {
            console.error("Error fetching bank data:", error);
            throw new Error("Error obteniendo datos bancarios.");
        }
    }
};

