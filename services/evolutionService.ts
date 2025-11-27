
import { GoogleGenAI, Type } from "@google/genai";
import { MacroContextEvent, PermissionProposal, UserProfile, PermissionModule, SubscriptionTier } from "../types";

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

const getAI = () => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY not found in environment");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper for simple backoff
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    const ai = getAI();
    
    // Context for the AI
    const microContext = JSON.stringify({
      age: profile.age,
      role: profile.occupation,
      currentModules: activeModules.map(m => m.title),
      currentPermissions: activeModules.flatMap(m => m.permissions.map(p => p.label))
    });

    const macroContext = JSON.stringify(event);

    const prompt = `
      ACTÚA COMO EL MOTOR DE EVOLUCIÓN DE 'CONFORT'.
      
      INPUTS:
      1. MICRO-CONTEXTO (Usuario): ${microContext}
      2. MACRO-CONTEXTO (Evento de Internet): ${macroContext}

      MANDATO:
      Analiza si el evento del Macro-Contexto representa un RIESGO o una OPORTUNIDAD que los permisos actuales del usuario NO cubren.
      Si existe una brecha, GENERA una propuesta de NUEVO PERMISO (Nivel 5).

      Si el usuario ya está protegido o el evento no es relevante para su perfil (Edad/Ocupación), devuelve NULL.
      
      REGLAS:
      - Si el riesgo es "CRITICAL", la propuesta debe ser muy persuasiva.
      - El "targetModuleId" debe coincidir con uno de los módulos existentes o sugerir uno muy obvio.

      FORMATO JSON ESPERADO (si hay propuesta):
      {
        "proposalRequired": true,
        "title": "Definición del Permiso (Nombre corto)",
        "targetModuleId": "ID del módulo (ej. finanzas_crecimiento)",
        "justification": "Justificación clara del riesgo mitigado o la oportunidad ganada.",
        "permissionLabel": "Texto del interruptor (ej. 'Activar Monitoreo de...')",
        "permissionId": "unique_id_suggestion"
      }

      FORMATO JSON ESPERADO (si NO hay propuesta):
      {
        "proposalRequired": false
      }
    `;

    let response;
    let attempts = 0;
    const maxAttempts = 4; 

    while (attempts < maxAttempts) {
        try {
            response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: {
                maxOutputTokens: 1000, // SAFETY: Prevent infinite loops
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        proposalRequired: { type: Type.BOOLEAN },
                        title: { type: Type.STRING },
                        targetModuleId: { type: Type.STRING },
                        justification: { type: Type.STRING },
                        permissionLabel: { type: Type.STRING },
                        permissionId: { type: Type.STRING }
                    }
                }
              }
            });
            break; // Success, exit loop
        } catch (e: any) {
            attempts++;
            
            // Robust detection of Quota/RateLimit errors
            let isQuotaError = false;
            
            // Check specifically for the XML object structure mentioned by user
            if (e?.error?.code === 429 || e?.error?.status === 'RESOURCE_EXHAUSTED') isQuotaError = true;
            // Check for status on error object directly
            if (e?.status === 429 || e?.status === 503) isQuotaError = true;
            
            // Fallback: Check string message
            const msg = (e?.message || JSON.stringify(e)).toLowerCase();
            if (msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota')) {
                isQuotaError = true;
            }

            if (attempts < maxAttempts && isQuotaError) {
                // Increased Exponential backoff: 10s, 20s, 40s... to span > 1 minute
                // This allows the quota window to reset
                const waitTime = 15000 * Math.pow(2, attempts - 1); 
                console.warn(`Evolution Engine rate limited (Attempt ${attempts}). Retrying in ${waitTime/1000}s...`);
                await delay(waitTime);
                continue;
            }
            
            if (isQuotaError) {
               console.warn("Evolution Engine: Quota exhausted after retries. Pausing cycle.");
               return null;
            }
            
            // Non-quota error, log warning and abort
            console.warn("Evolution Engine API Error (Non-Quota):", e);
            return null;
        }
    }

    if (response && response.text) {
      // SAFETY: Clean Markdown before parsing
      const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
          const result = JSON.parse(cleanText);
          if (result.proposalRequired) {
            return {
              id: Math.random().toString(36).substring(7),
              relatedMacroEventId: event.id,
              title: result.title,
              targetModuleId: result.targetModuleId,
              reasoning: result.justification,
              proposedPermission: {
                id: result.permissionId || `new_${Date.now()}`,
                label: result.permissionLabel,
                defaultEnabled: false, // Always OFF by default, user must accept
                minTier: SubscriptionTier.PRO // New evolutionary features default to Premium (mapped to PRO)
              }
            };
          }
      } catch (parseError) {
          console.warn("Evolution Engine: JSON Parse Error - Response truncated or malformed.", parseError);
          return null;
      }
    }
    return null;

  } catch (error) {
    console.error("Evolution Engine Unexpected Error:", error);
    return null;
  }
};
