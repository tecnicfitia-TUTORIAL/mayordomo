
import axios from 'axios';
import { MacroContextEvent, PermissionProposal, UserProfile, PermissionModule, SubscriptionTier } from "../types";

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project';
const REGION = 'us-central1';
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const BASE_URL = IS_LOCAL 
    ? `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}`
    : `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;

// Mock "Internet" Data Stream - Expanded to 15 items for daily variety
const MOCK_MACRO_EVENTS: MacroContextEvent[] = [
  {
    id: 'evt_01',
    source: 'LEGAL_UPDATE',
    title: 'Nueva Normativa de Herencia Digital (UE-2025)',
    description: 'Las plataformas deben permitir designar herederos para criptoactivos y nubes privadas.',
    timestamp: new Date(),
    riskLevel: 'HIGH'
  },
  {
    id: 'evt_02',
    source: 'TECH_TREND',
    title: 'Aumento de Phishing por Voz (Deepfake Audio)',
    description: 'Criminales usan IA para clonar voces de familiares y solicitar transferencias.',
    timestamp: new Date(),
    riskLevel: 'CRITICAL'
  },
  {
    id: 'evt_03',
    source: 'MARKET_DATA',
    title: 'Inflación en Seguros de Salud Privados',
    description: 'Se detecta un aumento del 15% en renovaciones automáticas no reclamadas.',
    timestamp: new Date(),
    riskLevel: 'MODERATE'
  },
  {
    id: 'evt_04',
    source: 'TECH_TREND',
    title: 'Vulnerabilidad Zero-Day en Nubes Compartidas',
    description: 'Archivos PDF compartidos pueden contener scripts ocultos indetectables.',
    timestamp: new Date(),
    riskLevel: 'HIGH'
  },
  {
    id: 'evt_05',
    source: 'INTERNET_GLOBAL',
    title: 'Tendencia de Ayuno de Dopamina',
    description: 'Nuevos protocolos de bienestar sugieren bloqueo estricto de apps de 8pm a 8am.',
    timestamp: new Date(),
    riskLevel: 'LOW'
  },
  {
    id: 'evt_06',
    source: 'LEGAL_UPDATE',
    title: 'Reforma Fiscal para Nómadas Digitales',
    description: 'Nuevas obligaciones de reporte para ingresos generados en plataformas extranjeras.',
    timestamp: new Date(),
    riskLevel: 'HIGH'
  },
  {
    id: 'evt_07',
    source: 'MARKET_DATA',
    title: 'Caída de Rentabilidad en Cuentas de Ahorro',
    description: 'Bancos principales ajustan tasas de interés a la baja por cambios regulatorios.',
    timestamp: new Date(),
    riskLevel: 'MODERATE'
  },
  {
    id: 'evt_08',
    source: 'TECH_TREND',
    title: 'Filtración Masiva de Contraseñas en Apps de Fitness',
    description: 'Datos de ubicación y rutas de usuarios expuestos en foro público.',
    timestamp: new Date(),
    riskLevel: 'CRITICAL'
  },
  {
    id: 'evt_09',
    source: 'INTERNET_GLOBAL',
    title: 'Auge del "Slow Living" Digital',
    description: 'Movimiento social que prioriza desconexión total fines de semana.',
    timestamp: new Date(),
    riskLevel: 'LOW'
  },
  {
    id: 'evt_10',
    source: 'LEGAL_UPDATE',
    title: 'Derecho a la Reparación de Dispositivos',
    description: 'Nueva ley obliga a fabricantes a vender repuestos a usuarios finales.',
    timestamp: new Date(),
    riskLevel: 'LOW'
  },
  {
    id: 'evt_11',
    source: 'MARKET_DATA',
    title: 'Incremento de Estafas en Alquileres Vacacionales',
    description: 'Plataformas reportan duplicación de anuncios falsos generados por IA.',
    timestamp: new Date(),
    riskLevel: 'HIGH'
  },
  {
    id: 'evt_12',
    source: 'TECH_TREND',
    title: 'Obsolescencia Programada en Smart Home',
    description: 'Dispositivos de domótica de 2020 dejarán de recibir actualizaciones de seguridad.',
    timestamp: new Date(),
    riskLevel: 'MODERATE'
  },
  {
    id: 'evt_13',
    source: 'INTERNET_GLOBAL',
    title: 'Viralización de "Retos Financieros" de Alto Riesgo',
    description: 'Redes sociales promueven esquemas de inversión fraudulentos a jóvenes.',
    timestamp: new Date(),
    riskLevel: 'CRITICAL'
  },
  {
    id: 'evt_14',
    source: 'LEGAL_UPDATE',
    title: 'Restricciones de IA en Educación',
    description: 'Instituciones prohíben uso no declarado de asistentes en tareas académicas.',
    timestamp: new Date(),
    riskLevel: 'MODERATE'
  },
  {
    id: 'evt_15',
    source: 'MARKET_DATA',
    title: 'Burbuja en Precios de Suscripciones de Streaming',
    description: 'El coste promedio de entretenimiento digital sube un 25% anual.',
    timestamp: new Date(),
    riskLevel: 'LOW'
  }
];

// 1. Scan Macro Context (Simulated)
export const scanMacroContext = async (): Promise<MacroContextEvent> => {
  // In a real app, this would search Google. Here we pick a random mock event.
  const randomIndex = Math.floor(Math.random() * MOCK_MACRO_EVENTS.length);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_MACRO_EVENTS[randomIndex]);
    }, 1500);
  });
};

// 2. Analyze Gap & Generate Proposal
// "Comparación: Yo Observado (Micro) vs Yo Referencial (Macro)"
export const analyzeGapAndPropose = async (
  event: MacroContextEvent, 
  profile: UserProfile,
  activeModules: PermissionModule[]
): Promise<PermissionProposal | null> => {
  try {
    const response = await axios.post(`${BASE_URL}/analyzeGapAndPropose`, {
      event,
      profile,
      activeModules
    });

    return response.data;

  } catch (error) {
    console.error("Evolution Engine Unexpected Error:", error);
    return null;
  }
};
