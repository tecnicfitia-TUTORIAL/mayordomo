

import { Mission, PillarId, UserProfile, ProtocolItem, MissionContext } from '../types';

/**
 * MOTOR DE GESTIÓN CONTEXTUAL (Antes Preparation Engine)
 * ----------------------------------------------------------
 * Detecta transiciones de vida (Mudanzas, Cambios de Estado Civil)
 * y genera PROTOCOLOS DE TRANSICIÓN completos.
 */

export const PreparationService = {

  /**
   * Escanea el contexto vital para detectar protocolos activos.
   * CASO DE USO: EL VIAJERO PERMANENTE (Transición España -> Tailandia)
   */
  getNextMission: async (profile: UserProfile): Promise<Mission | null> => {
    
    // Simular latencia de "pensamiento contextual"
    await new Promise(resolve => setTimeout(resolve, 800));

    if (!profile) return null;

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