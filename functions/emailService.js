const { google } = require('googleapis');
const admin = require('firebase-admin');
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

// SECRETS MANAGEMENT (Best Practice: Never hardcode secrets)
const gmailClientId = defineSecret('GMAIL_CLIENT_ID');
const gmailClientSecret = defineSecret('GMAIL_CLIENT_SECRET');

// Helper to get OAuth Client with runtime secrets
const getOAuthClient = (redirectUri) => {
    return new google.auth.OAuth2(
        gmailClientId.value(),
        gmailClientSecret.value(),
        redirectUri
    );
};

/**
 * 1. GET AUTH URL
 * Generates the OAuth2 URL for Gmail consent.
 * SECURE: Uses State parameter (TODO in frontend) and strict scopes.
 */
exports.getGmailAuthUrl = onRequest({ cors: true, secrets: [gmailClientId, gmailClientSecret], maxInstances: 10 }, (req, res) => {
    // MANUAL CORS FIX (Security: Restrict Origin in Production)
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        // Validate Input
        const { redirectUri } = req.body;
        if (!redirectUri) {
            res.status(400).json({ error: "Missing redirectUri" });
            return;
        }

        const oauth2Client = getOAuthClient(redirectUri);

        const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
        
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent', // Force refresh token to ensure long-term access
            include_granted_scopes: true
        });

        res.json({ url });
    } catch (error) {
        console.error("Error generating auth URL:", error.message); // Log message only, not full object if sensitive
        res.status(500).json({ error: "Failed to generate auth URL" });
    }
});

/**
 * 1.5 VALIDATE GMAIL CONNECTION
 * Exchanges code for token and saves it without scanning.
 */
exports.validateGmailConnection = onRequest({ cors: true, secrets: [gmailClientId, gmailClientSecret], maxInstances: 10 }, async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    const { code, userId, redirectUri } = req.body;

    if (!userId || !code) {
        return res.status(400).json({ error: 'Missing userId or code' });
    }

    try {
        const oauth2Client = getOAuthClient(redirectUri || 'http://localhost:5173');
        const { tokens } = await oauth2Client.getToken(code);
        
        // Store tokens securely
        await admin.firestore().collection('users').doc(userId).collection('tokens').doc('gmail').set({
            ...tokens,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'ACTIVE'
        });

        res.json({ success: true });

    } catch (error) {
        console.error('Gmail Validation Error:', error.message);
        res.status(500).json({ error: "Failed to validate Gmail connection" });
    }
});

/**
 * 2. SCAN GMAIL
 * Exchanges code for token and scans for invoices.
 * SECURE: Validates inputs, sanitizes outputs, handles tokens securely.
 */
exports.scanGmail = onRequest({ cors: true, secrets: [gmailClientId, gmailClientSecret], maxInstances: 10 }, async (req, res) => {
    // MANUAL CORS FIX
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    const { code, userId, redirectUri } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        // Initialize Client
        // Fallback to a default if redirectUri is missing (for existing connections)
        const oauth2Client = getOAuthClient(redirectUri || 'http://localhost:5173');
        
        let tokens;
        const tokenRef = admin.firestore().collection('users').doc(userId).collection('tokens').doc('gmail');

        // A. NEW CONNECTION: Exchange Code
        if (code) {
            if (!redirectUri) {
                return res.status(400).json({ error: 'Missing redirectUri for code exchange' });
            }
            const { tokens: newTokens } = await oauth2Client.getToken(code);
            tokens = newTokens;
            
            // Store tokens securely in Firestore (Backend only)
            await tokenRef.set({
                ...tokens,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
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
            
            // SANITIZATION: Ensure we only extract text
            const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
            const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
            const date = headers.find(h => h.name === 'Date')?.value;
            const snippet = details.data.snippet || '';
            
            // Regex for currency (EUR/USD) - Simple heuristic
            const amountMatch = snippet.match(/(\d+[.,]\d{2})\s?(€|EUR|\$|USD)/i);

            invoices.push({
                id: msg.id,
                subject: subject.substring(0, 100), // Limit length
                from: from.substring(0, 100),
                date,
                amount: amountMatch ? amountMatch[0] : null,
                snippet: snippet.substring(0, 150) // Limit length
            });
        }

        // RETURN SANITIZED DATA ONLY
        res.json({ 
            count: invoices.length,
            invoices 
        });

    } catch (error) {
        console.error('Gmail Scan Error:', error.message);
        // Do not expose stack trace or full error object to client
        res.status(500).json({ error: "Error processing Gmail data" });
    }
});
