
import { SubscriptionTier } from '../types';
import { STRIPE_URLS } from '../constants';

/**
 * STRIPE SERVICE (Frontend)
 * -------------------------
 * Manages the interaction between the Client and the Stripe Billing Portal.
 * Note: Actual sensitive operations (generating tokens) happen on the Backend.
 */

// ECHO [ENV]: Configure these in your .env or backend config
// Safety check: ensure env object exists before accessing properties
const env = (import.meta as any).env || {};
const API_BASE_URL = env.VITE_API_BASE_URL || '/api'; 

let _publishableKey: string | null = null;

export const StripeService = {

  /**
   * Inicializa el servicio de Stripe con la clave pública del entorno (Vercel/Local).
   */
  initStripe: (key: string) => {
    if (!key) {
      console.warn("[Stripe] No Publishable Key provided.");
      return;
    }
    _publishableKey = key;
    console.log("[Stripe] Service Initialized.");
    // Aquí se inicializaría stripe-js con loadStripe(key) si estuviéramos procesando pagos directos
  },

  /**
   * Opens the Stripe Customer Portal for the current user.
   * This allows them to Upgrade, Downgrade, Cancel, or Update Payment Methods.
   */
  openCustomerPortal: async (userEmail: string): Promise<void> => {
    try {
      console.log(`[Stripe] Redirecting to Portal for: ${userEmail}`);
      
      // Use fixed URL for MVP phase as per requirements
      window.location.href = STRIPE_URLS.PORTAL;

    } catch (error) {
      console.error("[Stripe] Failed to open portal:", error);
      alert("No se pudo conectar con el sistema de facturación. Inténtelo más tarde.");
    }
  },

  /**
   * Redirects to the Checkout page for a specific plan.
   * Now uses dynamic Cloud Function to create checkout session.
   */
  openCheckout: async (tier: SubscriptionTier, userId?: string): Promise<void> => {
      try {
          console.log(`[Stripe] Creating checkout session for tier: ${tier}`);
          
          // Get Firebase Auth token
          const { getAuth } = await import('firebase/auth');
          const auth = getAuth();
          if (!auth.currentUser) {
              alert("Debe iniciar sesión para continuar.");
              return;
          }

          const token = await auth.currentUser.getIdToken();
          
          // Get Cloud Functions base URL
          const functionsBaseUrl = env.VITE_FIREBASE_FUNCTIONS_URL || 'https://us-central1-mayordomo-ai.cloudfunctions.net';
          const response = await fetch(`${functionsBaseUrl}/createCheckoutSession`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ tier })
          });

          const data = await response.json();

          if (!response.ok) {
              throw new Error(data.error || 'Error creating checkout session');
          }

          if (data.url) {
              console.log(`[Stripe] Redirecting to checkout session: ${data.sessionId}`);
              window.location.href = data.url;
          } else {
              // Fallback to hardcoded URL if dynamic session creation fails
              console.warn(`[Stripe] No URL returned, falling back to hardcoded URL`);
              const url = STRIPE_URLS[tier];
              if (url) {
                  window.location.href = url;
              } else {
                  throw new Error("No checkout URL available");
              }
          }
      } catch (error: any) {
          console.error("[Stripe] Failed to create checkout session:", error);
          // Fallback to hardcoded URL on error
          const url = STRIPE_URLS[tier];
          if (url) {
              console.log(`[Stripe] Using fallback URL for tier: ${tier}`);
              window.location.href = url;
          } else {
              alert("No se pudo crear la sesión de pago. Inténtelo más tarde.");
          }
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
