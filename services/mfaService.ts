import { auth } from './firebaseConfig';

const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project';
const REGION = 'us-central1';

const BASE_URL = IS_LOCAL 
    ? `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}`
    : `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;

export const MfaService = {
  
  /**
   * 1. Start Setup: Get Secret & QR Code
   */
  generateSetup: async (): Promise<{ secret: string; qrCodeUrl: string }> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const response = await fetch(`${BASE_URL}/generateMfaSetup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.uid, email: user.email })
    });

    if (!response.ok) throw new Error("Failed to generate MFA setup");
    return await response.json();
  },

  /**
   * 2. Verify Setup: Activate MFA
   */
  verifySetup: async (token: string): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const response = await fetch(`${BASE_URL}/verifyMfaSetup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.uid, token })
    });

    if (!response.ok) return false;
    const data = await response.json();
    return data.success === true;
  },

  /**
   * 3. Validate Action: The Gate
   */
  validateAction: async (token: string): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const response = await fetch(`${BASE_URL}/validateMfa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.uid, token })
    });

    if (!response.ok) return false;
    const data = await response.json();
    return data.valid === true;
  }
};
