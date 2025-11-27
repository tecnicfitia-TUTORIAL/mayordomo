
import { UserProfile, DashboardItem, Mission, SubscriptionTier, PillarId } from '../types';
import { SixthSenseService } from './sixthSenseService';

/**
 * DASHBOARD BUILDER (Generative UI)
 * ---------------------------------
 * Construye dinámicamente el panel de inicio basándose en la "Regla del 30% / 65%"
 * y el contexto actual del usuario.
 */
export const DashboardBuilder = {
  
  buildDashboard: async (profile: UserProfile, mission: Mission | null): Promise<DashboardItem[]> => {
    const items: DashboardItem[] = [];
    const tier = profile.subscriptionTier;

    // 0. SEXTO SENTIDO (NUEVO - EMERGENTE)
    // Genera oportunidades latentes basadas en el cruce de datos
    const sixthSenseOpps = SixthSenseService.generateOpportunities(profile, mission);
    if (sixthSenseOpps.length > 0) {
        items.push({
            id: 'sixth_sense_widget',
            type: 'SIXTH_SENSE',
            title: 'Sexto Sentido',
            description: 'Oportunidades latentes detectadas.',
            priority: 200, // Absolute Top Priority
            opportunities: sixthSenseOpps
        });
    }

    // 1. CARDS DE DECISIÓN (Prioridad Máxima)
    // Si hay una misión activa con items financieros pendientes de firma
    if (mission) {
       const pendingApprovals = mission.checklist.filter(i => i.requiresApproval && !i.approved && i.isReady);
       
       pendingApprovals.forEach(item => {
           items.push({
               id: item.id,
               type: 'DECISION',
               title: 'Autorización Requerida',
               description: `${item.label}: ${item.cost} ${item.currency}`,
               pillarId: item.sourcePillar,
               priority: 100, // Top priority
               metadata: { cost: item.cost, currency: item.currency, actionLabel: 'Firmar' }
           });
       });
    }

    // 2. LÓGICA TIER 1 (INVITADO) -> Generar "Envidia/Deseo" (Nostalgia + Bloqueos)
    if (tier === SubscriptionTier.FREE) {
        // Tarjeta Bloqueada (Upselling)
        items.push({
            id: 'upsell_finance',
            type: 'DECISION',
            title: 'Oportunidad de Inversión',
            description: 'Detectado excedente de 1.200€. Optimización disponible.',
            priority: 40,
            isLocked: true,
            pillarId: PillarId.PATRIMONIO
        });
    }

    // 3. LÓGICA TIER 4 (GOBERNANTE) -> Eficiencia y Zen
    if (tier === SubscriptionTier.VIP) {
        // El VIP no quiere nostalgia ni ruido. Solo decisiones o silencio.
        // Si no hay decisiones y no hay sexto sentido urgente, Zen.
        const hasActionableItems = items.some(i => i.type === 'DECISION' || i.type === 'SIXTH_SENSE');
        
        if (!hasActionableItems) {
            items.push({
                id: 'zen_mode',
                type: 'ZEN',
                title: 'Sin Novedades',
                description: 'Todo está bajo control, Señor. Disfrute de su tiempo.',
                priority: 10
            });
        }
    }

    // Sort by priority desc
    return items.sort((a, b) => b.priority - a.priority);
  }
};
