import axios from 'axios';

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project';
const REGION = 'us-central1';
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const BASE_URL = IS_LOCAL 
    ? `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}`
    : `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;

export interface InvoiceEmail {
    id: string;
    subject: string;
    sender: string;
    amount: string;
    date: string;
    snippet: string;
}

export const EmailService = {

    /**
     * Obtiene la URL para iniciar sesión con Google
     */
    getAuthUrl: async (): Promise<string> => {
        try {
            // Pass current origin as redirect URI to handle dynamic environments (localhost vs codespaces)
            const redirectUri = window.location.origin;
            const response = await axios.post(`${BASE_URL}/getGmailAuthUrl`, {
                redirectUri
            });
            return response.data.url;
        } catch (error) {
            console.error("Error getting auth url:", error);
            throw error;
        }
    },

    /**
     * Escanea el correo usando el código de autorización o conexión existente
     */
    scanInvoices: async (authCode: string | null, userId: string): Promise<InvoiceEmail[]> => {
        try {
            const redirectUri = window.location.origin;
            const response = await axios.post(`${BASE_URL}/scanGmail`, {
                code: authCode,
                userId: userId,
                redirectUri // Required for code exchange
            });
            return response.data.invoices;
        } catch (error) {
            console.error("Error scanning gmail:", error);
            throw error;
        }
    }
};
