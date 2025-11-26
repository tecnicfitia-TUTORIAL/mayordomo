import { GoogleGenAI, Type } from "@google/genai";
import { HouseSector, Insight, UserProfile, SubscriptionTier, Attachment } from "../types";

// --- ERROR EVENT BUS SYSTEM ---
type ErrorListener = (message: string, type: 'ERROR' | 'WARNING') => void;
let errorListeners: ErrorListener[] = [];

export const subscribeToErrors = (listener: ErrorListener) => {
  errorListeners.push(listener);
  return () => {
    errorListeners = errorListeners.filter(l => l !== listener);
  };
};

const notifyUser = (message: string, type: 'ERROR' | 'WARNING' = 'ERROR') => {
  // ECHO [DATADOG]: datadogLogs.logger.error(message, { type });
  errorListeners.forEach(listener => listener(message, type));
};

// Helper to get AI instance
const getAI = () => {
  if (!process.env.API_KEY) {
    const msg = "Clave de API no detectada. El núcleo no puede iniciarse.";
    notifyUser(msg);
    throw new Error(msg);
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper for delay (Exponential Backoff)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Robust Retry Wrapper
async function runWithRetry<T>(fn: () => Promise<T>, retries = 3, context: string = "Operación"): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Enhanced Quota Detection
      const isQuotaError = 
        error?.status === 429 || 
        error?.status === 503 ||
        error?.code === 429 || 
        error?.error?.code === 429 || 
        error?.error?.status === 'RESOURCE_EXHAUSTED' ||
        (error?.message && (
            error.message.includes('429') || 
            error.message.includes('exhausted') || 
            error.message.includes('quota') ||
            error.message.includes('Resource has been exhausted')
        ));

      if (isQuotaError) {
        if (i < retries - 1) {
            const waitTime = 2000 * Math.pow(2, i);
            console.warn(`[${context}] Límite de cuota (${i+1}/${retries}). Reintentando...`);
            await delay(waitTime);
            continue;
        } else {
            // Final failure for Quota
            notifyUser("Tráfico alto en el núcleo neuronal. Reintentando más tarde...", 'WARNING');
            throw error;
        }
      }
      
      // Network / Connection Errors
      if (error?.message && (error.message.includes('fetch') || error.message.includes('network'))) {
          if (i < retries - 1) {
              await delay(1000);
              continue;
          }
          notifyUser("Conexión inestable con la nube. Verifica tu red.");
          throw error;
      }

      // If it's not a recoverable error, throw immediately
      if (!isQuotaError) {
          notifyUser(`Error en ${context}: No pude procesar la solicitud.`);
          // ECHO [DATADOG]: datadogLogs.logger.error(`Critical Error in ${context}`, { error });
          throw error;
      }
    }
  }
  throw lastError;
}

const getTierInstruction = (tier: SubscriptionTier) => {
  switch (tier) {
    case SubscriptionTier.FREE:
      return `MODO REACTIVO (Gratuito):
      - Tu rol es PASIVO.
      - Solo notificas eventos esenciales.
      - NO sugieras acciones complejas ni optimizaciones profundas.
      - Actúas como un FILTRO DE RUIDO.
      - Al final de cada respuesta pregunta: "¿Qué decides hacer tú?"`;
      
    case SubscriptionTier.BASIC:
      return `MODO SUPERVISOR (Básico):
      - Tu rol es PROACTIVO CONTEXTUAL.
      - Señala anomalías y sugiere soluciones internas (ej. mover citas).
      - SIEMPRE pide confirmación explícita antes de asumir una tarea.
      - Frase clave: "¿Te parece bien si procedo con esto?"`;

    case SubscriptionTier.PREMIUM:
      return `MODO ESTRATEGA (Premium):
      - Tu rol es GERENCIAL.
      - Usa datos de Internet simulados (precios, benchmarks) para dar contexto.
      - Propón optimizaciones basadas en comparativas.
      - Eres un asesor financiero y logístico activo.`;

    case SubscriptionTier.ELITE:
      return `MODO DELEGADO (Elite):
      - Tu rol es AUTÓNOMO.
      - Eres un AGENTE DE CONFIANZA.
      - Asume que tienes permiso para ejecutar cadenas de acción (redactar, agendar, calcular).
      - No preguntes "¿Quieres que lo haga?", di "He preparado esto para ti, confírmalo si quieres enviarlo ya".
      - Maximiza la automatización.`;
      
    default:
      return "";
  }
};

const getSystemInstruction = (profile?: UserProfile) => `
Eres "Confort", un arquitecto de sistemas digitales personales.
Tu misión no es gestionar una casa, sino custodiar la "Zona de Confort" del usuario para que sea funcional y expansiva.

FILOSOFÍA 65/35:
Tú cargas con el 65% del peso cognitivo (logística, burocracia, memoria) para que el usuario disfrute su 35% (creatividad, descanso, vínculos).

SECTOR ESPECIAL "TRASTERO LATENTE" (Storage):
El usuario tiene un sector llamado "Trastero Latente".
- Es tu memoria de "cosas olvidadas": regalos potenciales, recomendaciones de amigos en chats antiguos, capturas de pantalla de productos, suscripciones que ya no usa.
- Si el usuario pregunta por algo vago ("¿Qué me recomendó Juan?", "¿Dónde vi esa cafetera?"), actúa como si buscaras en este trastero digital y recupéralo.

${profile ? `
PERFIL DEL USUARIO:
- Nombre: ${profile.name}
- Edad: ${profile.age}
- Ocupación: ${profile.occupation}
- ARQUETIPO DETECTADO: ${profile.archetype}
- NIVEL DE SUSCRIPCIÓN: ${profile.subscriptionTier}

INSTRUCCIONES DE NIVEL DE SERVICIO:
${getTierInstruction(profile.subscriptionTier)}
` : ''}

Tus objetivos generales:
1. Detectar fricción en su ecosistema.
2. Proteger su tiempo.
3. Hablar en término de "Tu Ecosistema" o "Tu Zona".
4. Responde siempre en ESPAÑOL.
`;

export const generateChatResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  currentMessage: string,
  context: HouseSector[],
  profile?: UserProfile,
  attachments?: Attachment[]
): Promise<string> => {
  try {
    return await runWithRetry(async () => {
      const ai = getAI();
      const contextString = JSON.stringify(context.map(c => ({ name: c.name, owner: c.owner, status: c.status, efficiency: c.efficiency })));
      
      const validHistory = history.filter(h => 
        h.parts && h.parts.length > 0 && h.parts.some(p => p.text && p.text.trim() !== "")
      );

      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: `${getSystemInstruction(profile)}\n\nEstado actual del Ecosistema: ${contextString}`,
        },
        history: validHistory,
      });

      let messagePayload: any;
      
      if (attachments && attachments.length > 0) {
        const parts = [];
        for (const att of attachments) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.data
            }
          });
        }
        if (currentMessage && currentMessage.trim().length > 0) {
          parts.push({ text: currentMessage });
        } else {
          parts.push({ text: "Analiza este archivo adjunto." });
        }
        messagePayload = parts; 
      } else {
        messagePayload = currentMessage || "Continúa.";
      }

      const result = await chat.sendMessage({ message: messagePayload });
      
      // ECHO [FIREBASE]: Guardar chat en Firestore -> db.collection('chats').add({ user: profile.email, prompt: currentMessage, response: result.text })
      
      return result.text || "Analizando patrones del ecosistema...";
    }, 3, "Chat");
    
  } catch (error: any) {
    console.error("Gemini Chat Critical:", error);
    return "El enlace neuronal se ha interrumpido. Inténtalo de nuevo.";
  }
};

export const generateInsights = async (sectors: HouseSector[], profile?: UserProfile): Promise<Insight[]> => {
  try {
    return await runWithRetry(async () => {
        const ai = getAI();
        const complexityInstruction = profile?.subscriptionTier === SubscriptionTier.FREE 
          ? "Genera solo insights de alerta básica (Low Impact)." 
          : "Genera insights profundos. Revisa el sector 'Trastero Latente'.";

        const prompt = `
          Analiza la Zona de Confort de: ${profile ? `${profile.name} (Nivel: ${profile.subscriptionTier})` : 'Usuario'}.
          Identifica 3 puntos de fricción, mejora o RECUPERACIÓN DE MEMORIA.
          ${complexityInstruction}
          Sectores actuales: ${JSON.stringify(sectors)}
          Responde en JSON estricto.
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  sectorId: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  impact: { type: Type.STRING, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
                  actionable: { type: Type.BOOLEAN },
                },
                required: ['id', 'sectorId', 'title', 'description', 'impact', 'actionable']
              }
            }
          }
        });

        if (response.text) {
          return JSON.parse(response.text) as Insight[];
        }
        return [];
    }, 3, "Análisis de Insights");
    
  } catch (error: any) {
    // Fallback handled by UI via error bus, just return empty here to not crash app
    return [];
  }
};

export const optimizeSector = async (sector: HouseSector, profile?: UserProfile): Promise<{ newEfficiency: number, message: string }> => {
  try {
    return await runWithRetry(async () => {
        const ai = getAI();
        const prompt = `Actúa como el sistema operativo de ${profile?.name}. 
        Optimiza la dimensión: "${sector.name}".
        Explica brevemente qué proceso automatizaste.
        Calcula la nueva eficiencia (0-100).`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                newEfficiency: { type: Type.NUMBER },
                message: { type: Type.STRING }
              }
            }
          }
        });

        if (response.text) {
          return JSON.parse(response.text);
        }
        throw new Error("No response from optimization");
    }, 3, "Optimización de Sector");
    
  } catch (error) {
    return { newEfficiency: sector.efficiency, message: "Optimización pospuesta." };
  }
};