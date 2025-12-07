
import { UserProfile, DashboardItem, Mission, SubscriptionTier, PillarId, LifeObligation } from '../types';
import { SixthSenseService } from './sixthSenseService';
import { db } from './firebaseConfig';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { COLLECTIONS } from './firestoreSchema';

/**
 * DASHBOARD BUILDER (Generative UI)
 * ---------------------------------
 * Construye dinámicamente el panel de inicio basándose en la "Regla del 30% / 65%"
 * y el contexto actual del usuario.
 * Ahora lee datos reales de Firestore.
 */
export const DashboardBuilder = {
  
  buildDashboard: async (profile: UserProfile, mission: Mission | null): Promise<DashboardItem[]> => {
    const items: DashboardItem[] = [];
    const tier = profile.subscriptionTier;

    // Fetch real data from Firestore
    let realObligations: LifeObligation[] = [];
    let processedEmailsCount = 0;
    let bankAccountsCount = 0;

    try {
      if (db && !(db as any)._isMock && profile.uid) {
        // 1. Read life_obligations
        const obligationsRef = collection(db, COLLECTIONS.USERS, profile.uid, COLLECTIONS.LIFE_OBLIGATIONS);
        const obligationsQuery = query(obligationsRef, orderBy('dueDate', 'asc'), limit(10));
        const obligationsSnap = await getDocs(obligationsQuery);
        realObligations = obligationsSnap.docs.map(doc => doc.data() as LifeObligation);

        // 2. Read processed_emails count (if collection exists)
        try {
          const emailsRef = collection(db, COLLECTIONS.USERS, profile.uid, 'processed_emails');
          const emailsSnap = await getDocs(emailsRef);
          processedEmailsCount = emailsSnap.size;
        } catch (e) {
          // Collection might not exist yet, that's OK
          console.log("[DashboardBuilder] processed_emails collection not found or empty");
        }

        // 3. Read bank_connections count (if collection exists)
        try {
          const bankRef = collection(db, COLLECTIONS.USERS, profile.uid, 'bank_connections');
          const bankSnap = await getDocs(bankRef);
          bankAccountsCount = bankSnap.size;
        } catch (e) {
          // Collection might not exist yet, that's OK
          console.log("[DashboardBuilder] bank_connections collection not found or empty");
        }
      }
    } catch (error) {
      console.error("[DashboardBuilder] Error fetching real data:", error);
      // Continue with empty data, will use fallback logic
    }

    // 0. SEXTO SENTIDO (Capital Latente)
    // Solo visible si hay oportunidades reales y el usuario tiene cierto nivel (o teaser para Free)
    const sixthSenseOpps = SixthSenseService.generateOpportunities(profile, mission);
    if (sixthSenseOpps.length > 0) {
        items.push({
            id: 'sixth_sense_widget',
            type: 'SIXTH_SENSE',
            title: 'Sexto Sentido',
            description: 'Oportunidades latentes detectadas.',
            priority: 200, // Absolute Top Priority -> Ocupa ancho completo
            opportunities: sixthSenseOpps,
            requiredPermission: 'sys_ai_inference' // Example: Needs AI permission
        });
    }

    // 1. CARDS DE DECISIÓN (Prioridad Máxima - Ejecución)
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
               priority: 100,
               metadata: { cost: item.cost, currency: item.currency, actionLabel: 'Firmar Orden' },
               requiredPermission: 'sys_finance_write' // Needs write access to finance
           });
       });
    }

    // 2. LÓGICA TIER 1 (INVITADO) -> Generar "Envidia/Deseo" (Nostalgia + Bloqueos)
    if (tier === SubscriptionTier.FREE) {
        
        // A. Tarjeta Bloqueada (Upselling - Deseo de Futuro)
        items.push({
            id: 'upsell_finance',
            type: 'DECISION',
            title: 'Oportunidad de Inversión',
            description: 'Detectado excedente de 1.200€. Optimización disponible.',
            priority: 40,
            isLocked: true,
            pillarId: PillarId.PATRIMONIO,
            metadata: { actionLabel: 'Desbloquear' },
            requiredPermission: 'sys_finance_read' // Needs read access to see details
        });

        // B. Tarjeta Nostalgia (Conexión Emocional)
        items.push({
            id: 'memory_01',
            type: 'NOSTALGIA',
            title: 'Hace 1 año',
            description: 'Viaje a Lisboa. Revive el momento.',
            priority: 50,
            metadata: { 
                image: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=800' 
            },
            requiredPermission: 'sys_storage' // Needs storage access
        });
    }

    // 4. REAL DATA SUMMARY CARDS (If user has connected services)
    if (bankAccountsCount > 0 || processedEmailsCount > 0) {
      if (bankAccountsCount > 0) {
        items.push({
          id: 'bank_summary',
          type: 'INFO',
          title: 'Cuentas Bancarias',
          description: `${bankAccountsCount} ${bankAccountsCount === 1 ? 'cuenta conectada' : 'cuentas conectadas'}`,
          priority: 30,
          pillarId: PillarId.PATRIMONIO,
          metadata: { actionLabel: 'Ver Detalles' }
        });
      }

      if (processedEmailsCount > 0) {
        items.push({
          id: 'emails_summary',
          type: 'INFO',
          title: 'Emails Procesados',
          description: `${processedEmailsCount} ${processedEmailsCount === 1 ? 'documento procesado' : 'documentos procesados'}`,
          priority: 25,
          pillarId: PillarId.PATRIMONIO,
          metadata: { actionLabel: 'Ver Detalles' }
        });
      }
    }

    // 5. LÓGICA TIER 4 (GOBERNANTE) -> Eficiencia y Zen
    if (tier === SubscriptionTier.VIP) {
        // El VIP no quiere nostalgia ni ruido. Solo decisiones o silencio.
        // Si no hay decisiones y no hay sexto sentido urgente, Zen.
        const hasActionableItems = items.some(i => i.type === 'DECISION' || i.type === 'SIXTH_SENSE');
        
        if (!hasActionableItems && realObligations.length === 0) {
            items.push({
                id: 'zen_mode',
                type: 'ZEN',
                title: 'Todo en Orden',
                description: 'Sus sistemas están sincronizados, Señor. Disfrute de su tiempo.',
                priority: 10
            });
        }
    }

    // 6. PERMISSION ENFORCEMENT (SECURITY LAYER)
    // If the user lacks the required permission, lock the card and obfuscate details.
    const secureItems = items.map(item => {
        if (item.requiredPermission && !profile.grantedPermissions?.includes(item.requiredPermission)) {
            return {
                ...item,
                isLocked: true,
                description: 'Acceso restringido por configuración de privacidad.',
                // Keep title but maybe obfuscate specific data if it was in title? 
                // For now, title is usually generic enough ("Sexto Sentido", "Autorización Requerida")
                // But let's be safe for Sixth Sense
                opportunities: item.type === 'SIXTH_SENSE' ? [] : item.opportunities, 
                metadata: { ...item.metadata, actionLabel: 'Habilitar Permiso' }
            };
        }
        return item;
    });

    // Sort by priority desc
    return secureItems.sort((a, b) => b.priority - a.priority);
  }
};
