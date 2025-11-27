
import { SubscriptionTier } from '../types';

/**
 * STRIPE SERVICE (Frontend)
 * -------------------------
 * Manages the interaction between the Client and the Stripe Billing Portal.
 * Note: Actual sensitive operations (generating tokens) happen on the Backend.
 */

// ECHO [ENV]: Configure these in your .env or backend config
const API_BASE_URL = process.env.VITE_API_BASE_URL || '/api'; 

export const StripeService = {

  /**
   * Opens the Stripe Customer Portal for the current user.
   * This allows them to Upgrade, Downgrade, Cancel, or Update Payment Methods.
   */
  openCustomerPortal: async (userEmail: string): Promise<void> => {
    try {
      console.log(`[Stripe] Requesting Portal Session for: ${userEmail}`);

      // 1. Call Backend to generate the secure link
      // In a real app, this fetches from your Cloud Function:
      // const response = await fetch(`${API_BASE_URL}/create-portal-session`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email: userEmail })
      // });
      // const { url } = await response.json();
      
      // MOCK FOR MVP: Direct link to Stripe Test Portal (replace with your real Test Link)
      const MOCK_PORTAL_URL = 'https://billing.stripe.com/p/login/test_portal'; 
      
      // 2. Redirect
      window.location.href = MOCK_PORTAL_URL; // or use 'url' from backend

    } catch (error) {
      console.error("[Stripe] Failed to open portal:", error);
      alert("No se pudo conectar con el sistema de facturación. Inténtelo más tarde.");
    }
  },

  /**
   * Forces a check against the Backend to see if the Plan has changed.
   * Useful when returning from the Portal.
   */
  refreshSubscriptionStatus: async (uid: string): Promise<SubscriptionTier | null> => {
    try {
      console.log(`[Stripe] Refreshing status for ${uid}...`);
      
      // 1. Call Backend
      // const response = await fetch(`${API_BASE_URL}/user/subscription/${uid}`);
      // const data = await response.json();
      // return data.tier;

      // MOCK: Return null to let the app keep using its local or SubscriptionService logic
      return null; 
    } catch (error) {
      console.warn("[Stripe] Sync failed:", error);
      return null;
    }
  }
};
