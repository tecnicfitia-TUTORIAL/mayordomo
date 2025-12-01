const { google } = require('googleapis');
const { onRequest } = require("firebase-functions/v2/https");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:5173/auth/google/callback'; // Ajustar según entorno

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

exports.getGmailAuthUrl = onRequest({ cors: true }, (req, res) => {
    const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly'
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });

    res.json({ url });
});

exports.scanGmail = onRequest({ cors: true }, async (req, res) => {
    try {
        const { code } = req.body; // Auth Code del frontend

        if (!code) {
            return res.status(400).json({ error: "Falta auth code" });
        }

        // 1. Canjear código por tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // 2. Buscar correos de facturas
        // Query: "subject:(factura OR receipt OR order OR confirmación) has:attachment"
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: 'subject:(factura OR receipt OR recibo OR order OR pedido) has:attachment',
            maxResults: 5
        });

        const messages = response.data.messages || [];
        const invoices = [];

        // 3. Procesar cada correo
        for (const msg of messages) {
            const details = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'full'
            });

            const headers = details.data.payload.headers;
            const subject = headers.find(h => h.name === 'Subject')?.value || 'Sin Asunto';
            const from = headers.find(h => h.name === 'From')?.value || 'Desconocido';
            const snippet = details.data.snippet;

            // Extracción Regex Simple
            // Busca patrones de dinero: "12.50 €", "12,50€", "$12.50"
            const amountRegex = /(\d+[.,]\d{2})\s?[€$]|[€$]\s?(\d+[.,]\d{2})/;
            const amountMatch = snippet.match(amountRegex);
            const amount = amountMatch ? (amountMatch[1] || amountMatch[2]) : '???';

            // Simplificar remitente (ej: "Amazon <no-reply@amazon.com>" -> "Amazon")
            const senderName = from.split('<')[0].trim().replace(/"/g, '');

            invoices.push({
                id: msg.id,
                subject,
                sender: senderName,
                amount: amount,
                date: new Date(parseInt(details.data.internalDate)).toISOString(),
                snippet
            });
        }

        res.json({ invoices });

    } catch (error) {
        console.error("Error escaneando Gmail:", error);
        res.status(500).json({ error: error.message });
    }
});
