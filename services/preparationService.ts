

import { Mission, PillarId, UserProfile, ProtocolItem, MissionContext, LifeObligation } from '../types';
import { db } from './firebaseConfig';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { COLLECTIONS } from './firestoreSchema';

/**
 * MOTOR DE GESTIÓN CONTEXTUAL (Antes Preparation Engine)
 * ----------------------------------------------------------
 * Detecta transiciones de vida (Mudanzas, Cambios de Estado Civil)
 * y genera PROTOCOLOS DE TRANSICIÓN completos.
 * Ahora basado en obligaciones reales de Firestore.
 */

export const PreparationService = {

  /**
   * Escanea el contexto vital para detectar protocolos activos.
   * Lee obligaciones reales de Firestore y genera misiones basadas en ellas.
   */
  getNextMission: async (profile: UserProfile): Promise<Mission | null> => {
    
    if (!profile || !profile.uid) return null;

    // Read real obligations from Firestore
    let realObligations: LifeObligation[] = [];
    
    try {
      if (db && !(db as any)._isMock) {
        const obligationsRef = collection(db, COLLECTIONS.USERS, profile.uid, COLLECTIONS.LIFE_OBLIGATIONS);
        // Get obligations due in the next 60 days, ordered by due date
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 60);
        
        const obligationsQuery = query(
          obligationsRef,
          where('dueDate', '>=', now.toISOString()),
          where('dueDate', '<=', futureDate.toISOString()),
          orderBy('dueDate', 'asc'),
          limit(20)
        );
        
        const obligationsSnap = await getDocs(obligationsQuery);
        realObligations = obligationsSnap.docs.map(doc => doc.data() as LifeObligation);
      }
    } catch (error) {
      console.error("[PreparationService] Error fetching obligations:", error);
      // Continue with empty array, will fall back to simulated mission if needed
    }

    // If we have real obligations, create a mission from them
    if (realObligations.length > 0) {
      const nextObligation = realObligations[0];
      const dueDate = nextObligation.dueDate ? new Date(nextObligation.dueDate) : new Date();
      
      const mission: Mission = {
        id: `mission_${nextObligation.id || 'real_001'}`,
        title: nextObligation.title || 'Obligación Pendiente',
        date: dueDate,
        type: nextObligation.type || 'TASK',
        context: {
          origin: 'Sistema',
          destination: nextObligation.pillarId || PillarId.CENTINELA,
          effectiveDate: dueDate,
          criticalAlert: nextObligation.description || 'Sin descripción',
          weatherCondition: 'NORMAL',
          trafficStatus: 'CLEAR'
        },
        checklist: realObligations.slice(0, 10).map((obl, index) => ({
          id: obl.id || `check_${index}`,
          label: obl.title || 'Tarea',
          type: obl.type || 'TASK',
          sourcePillar: obl.pillarId || PillarId.CENTINELA,
          jurisdiction: 'ES',
          phase: 'ENTRY',
          isReady: true,
          notes: obl.description || '',
          requiresApproval: false,
          approved: false
        }))
      };

      return mission;
    }

    // Fallback: Simulated mission (only if no real obligations exist)
    // Simular latencia de "pensamiento contextual"
    await new Promise(resolve => setTimeout(resolve, 800));

    // FECHA DE TRANSICIÓN SIMULADA: Dentro de 30 días
    const transitionDate = new Date();
    transitionDate.setDate(transitionDate.getDate() + 30);

    // Contexto del Protocolo
    const relocationContext: MissionContext = {
      origin: 'España (Residente Fiscal)',
      destination: 'Tailandia (Nómada Digital)',
      effectiveDate: transitionDate,
      criticalAlert: 'Requiere Visado LTR antes del vuelo',
      weatherCondition: 'Tropical (Monzón)', // Dato ambiental para Pillar Vital
      trafficStatus: 'CLEAR'
    };

    // PROTOCOLO: REUBICACIÓN INTERNACIONAL (ES -> TH)
    const relocationProtocol: Mission = {
      id: 'proto_reloc_es_th_001',
      title: 'Protocolo: Reubicación Internacional',
      date: transitionDate,
      type: 'RELOCATION',
      context: relocationContext,
      checklist: [
        // --- FASE 1: SALIDA (ESPAÑA) ---
        {
          id: 'exit_es_01',
          label: 'Baja Fiscal (Modelo 030)',
          type: 'LEGAL',
          sourcePillar: PillarId.CENTINELA,
          jurisdiction: 'ES',
          phase: 'EXIT',
          isReady: false,
          notes: 'Notificar cambio de domicilio a Hacienda',
          actionUrl: 'https://sede.agenciatributaria.gob.es/'
        },
        {
          id: 'exit_es_02',
          label: 'Baja Padrón Municipal',
          type: 'DOC',
          sourcePillar: PillarId.CENTINELA,
          jurisdiction: 'ES',
          phase: 'EXIT',
          isReady: true,
          notes: 'Certificado digital requerido'
        },
        {
          id: 'exit_es_03',
          label: 'Cancelación Suministros (Luz/Gas)',
          type: 'TASK',
          sourcePillar: PillarId.PATRIMONIO,
          jurisdiction: 'ES',
          phase: 'EXIT',
          isReady: false,
          notes: 'Avisar 15 días antes'
        },

        // --- FASE 2: ENTRADA (TAILANDIA) ---
        {
          id: 'entry_th_01',
          label: 'Visado LTR (Long Term Resident)',
          type: 'DOC',
          sourcePillar: PillarId.CENTINELA,
          jurisdiction: 'TH',
          phase: 'ENTRY',
          isReady: true, // Prepared by AI
          notes: 'Formulario y tasas preparadas para pago.',
          requiresApproval: true,
          cost: 1500,
          currency: 'EUR',
          approved: false
        },
        {
          id: 'entry_th_02',
          label: 'Seguro Médico Internacional',
          type: 'ASSET',
          sourcePillar: PillarId.VITAL,
          jurisdiction: 'GLOBAL',
          phase: 'ENTRY',
          isReady: true, // Prepared by AI
          notes: 'Póliza Allianz Premium seleccionada',
          requiresApproval: true,
          cost: 850,
          currency: 'EUR',
          approved: false
        },
        {
          id: 'entry_th_03',
          label: 'Vacunación Tropical',
          type: 'TASK',
          sourcePillar: PillarId.VITAL,
          jurisdiction: 'TH',
          phase: 'ENTRY',
          isReady: false,
          notes: 'Fiebre Tifoidea y Tétanos'
        }
      ]
    };

    return relocationProtocol;
  }
};