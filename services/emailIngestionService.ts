
import { UserProfile, SubscriptionTier, PillarId } from '../types';
import { getTierLevel } from '../constants';

// Interface interna para simular el objeto Email
export interface IncomingEmail {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  hasAttachments: boolean;
  timestamp: Date;
}

export type IngestionResult = 
  | { status: 'IGNORED_SEMANTIC'; reason: string }
  | { status: 'BLOCKED_TIER'; reason: string; requiredTier: SubscriptionTier }
  | { status: 'PROCESSED'; type: string; summary: string };

/**
 * EMAIL INGESTION SERVICE
 * -----------------------
 * Gestiona la entrada de datos desestructurados (Emails) asegurando privacidad y acceso.
 */
export const EmailIngestionService = {

  /**
   * Proceso Principal: Pipeline de Ingesta
   */
  processIncomingEmail: async (email: IncomingEmail, profile: UserProfile): Promise<IngestionResult> => {
    console.log(`[EmailIngestion] Analyzing: "${email.subject}" from ${email.sender}`);

    // --- FASE 1: FILTRO SEMÁNTICO (AI Trust) ---
    // Descarta ruido personal (newsletters, familia, spam)
    const relevance = analyzeRelevance(email);
    
    if (!relevance.isRelevant) {
      console.log(`[EmailIngestion] ❌ IGNORED (Semantic): ${relevance.reason}`);
      return { status: 'IGNORED_SEMANTIC', reason: relevance.reason || 'No relevant content' };
    }

    console.log(`[EmailIngestion] ✅ SEMANTIC MATCH: ${relevance.detectedType}`);

    // --- FASE 2: FILTRO DE ACCESO (Subscription Gating) ---
    // Verifica si el usuario paga por la capacidad de procesar este tipo de dato
    const access = checkSubscriptionAccess(profile, relevance.detectedType);

    if (!access.hasAccess) {
      console.log(`[EmailIngestion] 🔒 BLOCKED (Tier): User is ${profile.subscriptionTier} (Level ${getTierLevel(profile.subscriptionTier)}), needs ${access.requiredTier} (Level ${getTierLevel(access.requiredTier || SubscriptionTier.FREE)})`);
      return { 
        status: 'BLOCKED_TIER', 
        reason: `Feature requires ${access.requiredTier}`, 
        requiredTier: access.requiredTier! 
      };
    }

    // --- FASE 3: EXTRACCIÓN Y ALMACENAMIENTO ---
    // (Simulada: Aquí se llamaría a Gemini para extraer JSON estructurado)
    console.log(`[EmailIngestion] 🚀 PROCESSING: Extracting data to ${relevance.targetPillar}...`);
    
    return { 
      status: 'PROCESSED', 
      type: relevance.detectedType, 
      summary: `Documento archivado en ${relevance.targetPillar}` 
    };
  }
};

// --- HELPER LOGIC ---

type DocType = 'INVOICE' | 'LEGAL_NOTICE' | 'TRAVEL_TICKET' | 'MEDICAL_REPORT';

interface RelevanceAnalysis {
  isRelevant: boolean;
  detectedType: DocType;
  targetPillar: PillarId;
  reason?: string;
}

const analyzeRelevance = (email: IncomingEmail): RelevanceAnalysis => {
  const text = (email.subject + " " + email.snippet).toLowerCase();
  
  // 1. BILLING / INVOICES
  if (text.includes('factura') || text.includes('invoice') || text.includes('recibo') || text.includes('pago confirmado')) {
    return { isRelevant: true, detectedType: 'INVOICE', targetPillar: PillarId.PATRIMONIO };
  }

  // 2. LEGAL / GOV
  if (text.includes('notificación') || text.includes('sede electrónica') || text.includes('dgt') || text.includes('hacienda')) {
    return { isRelevant: true, detectedType: 'LEGAL_NOTICE', targetPillar: PillarId.CENTINELA };
  }

  // 3. TRAVEL
  if (text.includes('booking') || text.includes('reserva') || text.includes('vuelo') || text.includes('check-in')) {
    return { isRelevant: true, detectedType: 'TRAVEL_TICKET', targetPillar: PillarId.CONCIERGE };
  }

  // 4. MEDICAL
  if (text.includes('cita médica') || text.includes('resultados') || text.includes('analítica') || text.includes('sanitas')) {
    return { isRelevant: true, detectedType: 'MEDICAL_REPORT', targetPillar: PillarId.VITAL };
  }

  return { isRelevant: false, detectedType: 'INVOICE', targetPillar: PillarId.PATRIMONIO, reason: 'No business keywords found' };
};

const checkSubscriptionAccess = (profile: UserProfile, type: DocType): { hasAccess: boolean; requiredTier?: SubscriptionTier } => {
  // CRITICAL FIX: Use Robust Numeric Comparison
  const userLevel = getTierLevel(profile.subscriptionTier);

  // MAPA DE REQUISITOS (Hardcoded logic based on Permissions Matrix)
  let requiredTier = SubscriptionTier.FREE;

  switch (type) {
    case 'INVOICE': // Reading emails for expenses
      requiredTier = SubscriptionTier.BASIC; 
      break;
    case 'TRAVEL_TICKET': // Travel management
      requiredTier = SubscriptionTier.BASIC;
      break;
    case 'LEGAL_NOTICE': // Official notifications
      requiredTier = SubscriptionTier.PRO;
      break;
    case 'MEDICAL_REPORT': // Health documents
      requiredTier = SubscriptionTier.PRO;
      break;
  }

  const requiredLevel = getTierLevel(requiredTier);

  return {
    hasAccess: userLevel >= requiredLevel,
    requiredTier
  };
};
