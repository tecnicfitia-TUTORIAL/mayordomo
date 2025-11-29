
import { SubscriptionTier } from '../types';
import { STRIPE_URLS } from '../constants';

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
   */
  getCurrentUserTier: async (userId?: string): Promise<SubscriptionTier> => {
    
    // 1. Check for Simulation Override (Admin Console)
    if (_simulatedTierOverride) {
        console.log(`[SubscriptionService] Serving SIMULATED Tier: ${_simulatedTierOverride}`);
        return _simulatedTierOverride;
    }

    // =================================================================================
    // TODO: BACKEND INTEGRATION
    // =================================================================================
    // Aquí se debe llamar al endpoint GET /user/subscription del Backend
    // =================================================================================

    console.log(`[SubscriptionService] Verifying real tier for user: ${userId || 'Anonymous'}`);
    
    // SAFETY: Default fallback is FREE to enforce Zero Trust until backend is ready.
    const DEFAULT_TIER = SubscriptionTier.FREE; 

    // Simula latencia
    await new Promise(resolve => setTimeout(resolve, 500));

    return DEFAULT_TIER;
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
