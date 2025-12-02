const { google } = require('googleapis');
const admin = require('firebase-admin');
const { onRequest } = require("firebase-functions/v2/https");

// CONFIGURATION
// In production, use functions.config().gmail.client_id
const CLIENT_ID = process.env.GMAIL_CLIENT_ID || 'mock-client-id';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || 'mock-client-secret';
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:5173';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

/**
 * Generates the OAuth2 URL for Gmail consent
 */
exports.getGmailAuthUrl = onRequest({ cors: true, maxInstances: 10 }, (req, res) => {
    try {
        const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent' // Force refresh token
        });
        res.json({ url });
    } catch (error) {
        console.error("Error generating auth URL:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Exchanges code for token and scans for invoices
 */
exports.scanGmail = onRequest({ cors: true, maxInstances: 10 }, async (req, res) => {
    const { code, userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        let tokens;
        const tokenRef = admin.firestore().collection('users').doc(userId).collection('tokens').doc('gmail');

        // A. NEW CONNECTION: Exchange Code
        if (code) {
            const { tokens: newTokens } = await oauth2Client.getToken(code);
            tokens = newTokens;
            await tokenRef.set(tokens);
        } 
        // B. EXISTING CONNECTION: Load from DB
        else {
            const doc = await tokenRef.get();
            if (!doc.exists) {
                return res.status(401).json({ error: 'No Gmail connection found' });
            }
            tokens = doc.data();
        }

        oauth2Client.setCredentials(tokens);

        // C. SCAN LOGIC
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        // Search for keywords in last 30 days
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const dateQuery = oneMonthAgo.toISOString().split('T')[0].replace(/-/g, '/');
        
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: `subject:(factura OR invoice OR recibo OR bill) after:${dateQuery}`,
            maxResults: 15
        });

        const messages = response.data.messages || [];
        const invoices = [];

        // Fetch details for each message
        for (const msg of messages) {
            const details = await gmail.users.messages.get({ userId: 'me', id: msg.id });
            const headers = details.data.payload.headers;
            
            const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
            const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
            const date = headers.find(h => h.name === 'Date')?.value;
            
            // Simple Heuristic for Amount
            const snippet = details.data.snippet;
            // Regex for currency (EUR/USD)
            const amountMatch = snippet.match(/(\d+[.,]\d{2})\s?(€|EUR|\$|USD)/i);

            invoices.push({
                id: msg.id,
                subject,
                from,
                date,
                amount: amountMatch ? amountMatch[0] : null,
                snippet: snippet.substring(0, 100) + '...'
            });
        }

        res.json({ 
            count: invoices.length,
            invoices 
        });

    } catch (error) {
        console.error('Gmail Scan Error:', error);
        res.status(500).json({ error: error.message });
    }
});
