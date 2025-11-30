
import { UserProfile, SixthSenseOpportunity, SubscriptionTier, Mission } from '../types';

/**
 * SIXTH SENSE SERVICE (Motor de Intuición)
 * ----------------------------------------
 * Genera oportunidades de valor añadido ("Capital Latente") basándose en el cruce de datos.
 * Aplica filtros de densidad estrictos según el nivel de suscripción.
 */

// CUOTAS DE DENSIDAD (Max Opportunities per Load)
const OPPORTUNITY_QUOTAS: Record<SubscriptionTier, number> = {
    [SubscriptionTier.FREE]: 1,
    [SubscriptionTier.BASIC]: 3,
    [SubscriptionTier.PRO]: 5,
    [SubscriptionTier.VIP]: 99 // Unlimited
};

export const SixthSenseService = {

    /**
     * Genera oportunidades contextuales y aplica el filtro de densidad.
     */
    generateOpportunities: (profile: UserProfile, activeMission: Mission | null): SixthSenseOpportunity[] => {
        const potentialOpportunities: SixthSenseOpportunity[] = [];
        const tier = profile.subscriptionTier;

        // --- 1. GENERACIÓN DE OPORTUNIDADES (Lógica de Cruce de Datos) ---

        // OPORTUNIDAD: PARKING VIP (Requiere: Tier VIP + Viaje Activo)
        if (tier === SubscriptionTier.VIP && activeMission?.type === 'RELOCATION') {
            potentialOpportunities.push({
                id: 'opp_parking_vip',
                type: 'LOGISTICS',
                title: 'Parking Larga Estancia Detectado',
                description: 'Su vuelo sale de T4. He localizado plaza con descuento del 40% por reserva anticipada.',
                impactLabel: 'Ahorro 85€',
                actionLabel: 'Reservar Plaza'
            });
        }

        // OPORTUNIDAD: NETWORKING (Requiere: Tier PRO+ + Ocupación Tech)
        if ((tier === SubscriptionTier.PRO || tier === SubscriptionTier.VIP) && profile.occupation.toLowerCase().includes('dev')) {
            potentialOpportunities.push({
                id: 'opp_network_tech',
                type: 'NETWORKING',
                title: 'Evento Exclusivo: AI Summit',
                description: 'Detectado evento relevante en su ciudad la próxima semana. Quedan 2 entradas.',
                impactLabel: 'Network +',
                actionLabel: 'Ver Agenda'
            });
        }

        // OPORTUNIDAD: AHORRO SUMINISTROS (Requiere: Tier BASIC+)
        if (tier !== SubscriptionTier.FREE) {
            potentialOpportunities.push({
                id: 'opp_utility_save',
                type: 'SAVING',
                title: 'Optimización Tarifa Luz',
                description: 'Su consumo actual sugiere un cambio a discriminación horaria.',
                impactLabel: '-15% Factura',
                actionLabel: 'Comparar'
            });
        }

        // OPORTUNIDAD: NOSTALGIA / MEMORIA (Para TODOS, especial Tier FREE)
        potentialOpportunities.push({
            id: 'opp_memory_01',
            type: 'NOSTALGIA',
            title: 'Recuerdo Desbloqueado',
            description: 'Hace 1 año estabas en Lisboa. ¿Quieres ver el resumen?',
            impactLabel: 'Bienestar',
            actionLabel: 'Ver Fotos'
        });
        
        // OPORTUNIDAD: SALUD / ESTRÉS (Requiere: Tier PRO+)
        if ((tier === SubscriptionTier.PRO || tier === SubscriptionTier.VIP)) {
            potentialOpportunities.push({
                id: 'opp_stress_alert',
                type: 'SAVING', // Categorized broadly
                title: 'Pico de Estrés Previsto',
                description: 'Su agenda de mañana está al 120% de capacidad. Recomiendo bloquear la tarde.',
                impactLabel: 'Salud',
                actionLabel: 'Bloquear Agenda'
            });
        }

        // --- 2. FILTRO DE DENSIDAD (Quotas) ---
        const maxItems = OPPORTUNITY_QUOTAS[tier];
        
        // Priorizar: Las de tipo SAVING/LOGISTICS van primero para VIPs, NOSTALGIA para Free.
        const sorted = potentialOpportunities.sort((a, b) => {
            if (tier === SubscriptionTier.FREE) {
                return a.type === 'NOSTALGIA' ? -1 : 1; // Prioriza Nostalgia
            }
            // Prioriza Valor (Saving/Logistics) para pago
            const score = (type: string) => (['LOGISTICS', 'SAVING'].includes(type) ? 2 : 1);
            return score(b.type) - score(a.type);
        });

        return sorted.slice(0, maxItems);
    }
};
