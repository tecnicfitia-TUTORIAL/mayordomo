
import { SubscriptionTier } from '../types';
import { STRIPE_URLS } from '../constants';
import { db } from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

/**
 * SUBSCRIPTION SERVICE (Single Source of Truth)
 * ---------------------------------------------
 * Este servicio es el único responsable de determinar el nivel de acceso del usuario.
 */

// Variable privada en memoria para la simulación durante la sesión
let _simulatedTierOverride: SubscriptionTier | null = null;

export const SubscriptionService = {
  
  /**
   * Obtiene el nivel de suscripción actual del usuario.
   * Si hay una simulación activa, devuelve ese valor.
   * Lee directamente de Firestore donde el webhook de Stripe actualiza el tier.
   */
  getCurrentUserTier: async (userId?: string): Promise<SubscriptionTier> => {
    
    // 1. Check for Simulation Override (Admin Console)
    if (_simulatedTierOverride) {
        console.log(`[SubscriptionService] Serving SIMULATED Tier: ${_simulatedTierOverride}`);
        return _simulatedTierOverride;
    }

    // 2. Read from Firestore (Real Backend Integration)
    if (!userId) {
        console.warn(`[SubscriptionService] No userId provided, returning FREE`);
        return SubscriptionTier.FREE;
    }

    try {
        // Check if DB is initialized
        if (!db || (db as any)._isMock) {
            console.warn(`[SubscriptionService] DB not initialized or in mock mode, returning FREE`);
            return SubscriptionTier.FREE;
        }

        console.log(`[SubscriptionService] Reading tier from Firestore for user: ${userId}`);
        
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.warn(`[SubscriptionService] User document not found, returning FREE`);
            return SubscriptionTier.FREE;
        }

        const userData = userSnap.data();
        const tier = userData.subscriptionTier as SubscriptionTier;

        if (tier && Object.values(SubscriptionTier).includes(tier)) {
            console.log(`[SubscriptionService] Tier from Firestore: ${tier}`);
            return tier;
        } else {
            console.warn(`[SubscriptionService] Invalid tier in Firestore: ${tier}, returning FREE`);
            return SubscriptionTier.FREE;
        }
    } catch (error) {
        console.error(`[SubscriptionService] Error reading tier from Firestore:`, error);
        // Fallback to FREE on error
        return SubscriptionTier.FREE;
    }
  },

  /**
   * Permite al Panel de Admin forzar un nivel específico para pruebas.
   */
  setSimulationOverride: (tier: SubscriptionTier) => {
      _simulatedTierOverride = tier;
  },

  /**
   * Fuerza una revalidación del estado.
   */
  refreshSubscriptionStatus: async (): Promise<boolean> => {
    return true;
  }
};
