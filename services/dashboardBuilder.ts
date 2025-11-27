
import { UserProfile, DashboardItem, DashboardItemType, Mission, SubscriptionTier, PillarId } from '../types';

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
        // Tarjeta de Nostalgia (Gancho emocional)
        items.push({
            id: 'nostalgia_01',
            type: 'NOSTALGIA',
            title: 'Hace 2 años',
            description: 'Recuerdo de tu viaje a Bali. "La libertad es esto."',
            priority: 50,
            metadata: { image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80' }
        });

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
        if (items.length === 0) {
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
