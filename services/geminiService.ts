
import { GoogleGenAI, Type } from "@google/genai";
import { HouseSector, Insight, UserProfile, SubscriptionTier, Attachment } from "../types";

// Helper to get AI instance
const getAI = () => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY not found in environment");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper for delay (Exponential Backoff)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Robust Retry Wrapper
async function runWithRetry<T>(fn: () => Promise<T>, retries = 3, context: string = "API Operation"): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Enhanced Quota Detection (Handles 429, 503, and Resource Exhausted strings)
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

      if (isQuotaError && i < retries - 1) {
        const waitTime = 2000 * Math.pow(2, i); // 2s, 4s, 8s...
        console.warn(`[${context}] Quota limit hit (${i+1}/${retries}). Retrying in ${waitTime}ms...`);
        await delay(waitTime);
        continue;
      }
      
      // If it's not a quota error (or we run out of retries), throw immediately
      if (!isQuotaError) throw error;
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
      // Simplificamos el contexto para enviar lo relevante
      const contextString = JSON.stringify(context.map(c => ({ name: c.name, owner: c.owner, status: c.status, efficiency: c.efficiency })));
      
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: `${getSystemInstruction(profile)}\n\nEstado actual del Ecosistema: ${contextString}`,
        },
        history: history,
      });

      // Construct message with attachments if present
      let messagePayload: any = { text: currentMessage };
      
      if (attachments && attachments.length > 0) {
        const parts = [];
        
        // Add attachments as inlineData
        for (const att of attachments) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.data
            }
          });
        }
        
        // Add text part if exists
        if (currentMessage.trim()) {
          parts.push({ text: currentMessage });
        } else {
          parts.push({ text: "Analiza este archivo adjunto." });
        }
        
        messagePayload = { parts };
      }

      const result = await chat.sendMessage({ message: messagePayload });
      return result.text || "Analizando patrones del ecosistema...";
    }, 3, "Chat Generation");
    
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    if (error?.status === 429 || error?.error?.code === 429) {
        return "El núcleo está recibiendo demasiadas solicitudes simultáneas. Dame unos segundos para liberar recursos.";
    }
    return "Error de conexión con el núcleo de Confort (O el archivo es demasiado grande).";
  }
};

export const generateInsights = async (sectors: HouseSector[], profile?: UserProfile): Promise<Insight[]> => {
  try {
    return await runWithRetry(async () => {
        const ai = getAI();
        
        // If Free tier, simple insights only
        const complexityInstruction = profile?.subscriptionTier === SubscriptionTier.FREE 
          ? "Genera solo insights de alerta básica (Low Impact)." 
          : "Genera insights profundos y accionables.";

        const prompt = `
          Analiza la Zona de Confort de: ${profile ? `${profile.name} (Nivel: ${profile.subscriptionTier})` : 'Usuario'}.
          Identifica 3 puntos de fricción o mejora en su ecosistema actual.
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
                  impact: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] },
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
    }, 3, "Insight Generation"); // Retry up to 3 times
    
  } catch (error: any) {
    // Detect Quota Error BEFORE logging to console to prevent scary red errors
    const isQuotaError = 
        error?.status === 429 || 
        error?.error?.code === 429 || 
        error?.error?.status === 'RESOURCE_EXHAUSTED' ||
        (error?.message && (error.message.includes('exhausted') || error.message.includes('429')));
    
    if (isQuotaError) {
        console.warn("Gemini Insight Quota Exceeded (Handled Fallback)");
        return [{
            id: 'system-load',
            sectorId: 'system',
            title: 'Saturación de Red',
            description: 'El tráfico neuronal es alto. Estamos optimizando recursos para tu siguiente análisis.',
            impact: 'LOW',
            actionable: false
        }];
    }
    
    console.error("Gemini Insight Error:", error);
    return [];
  }
};

export const optimizeSector = async (sector: HouseSector, profile?: UserProfile): Promise<{ newEfficiency: number, message: string }> => {
  try {
    return await runWithRetry(async () => {
        const ai = getAI();
        const prompt = `Actúa como el sistema operativo de la vida de ${profile?.name}. 
        Optimiza la dimensión: "${sector.name}".
        Nivel de Servicio: ${profile?.subscriptionTier || 'Basic'}.
        Explica brevemente qué proceso automatizaste o mejoraste.
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
        throw new Error("No response");
    }, 3, "Sector Optimization");
    
  } catch (error) {
    console.error("Optimize Sector Failed:", error);
    return { newEfficiency: sector.efficiency, message: "Optimización diferida por carga del sistema. Inténtalo en unos minutos." };
  }
};
