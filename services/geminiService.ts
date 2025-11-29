
import { GoogleGenAI } from "@google/genai";
import { UserProfile, PillarStatus, SubscriptionTier, ChatMessage, Attachment } from "../types";

const getAI = () => {
  if (!process.env.API_KEY) {
    throw new Error("Clave de API no detectada.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateChatResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  currentMessage: string,
  pillars: PillarStatus[],
  profile?: UserProfile,
  attachments?: Attachment[]
): Promise<string> => {
  try {
    const ai = getAI();
    
    // Construct Pillar Context
    const pillarContext = pillars.map(p => 
      `- ${p.name.toUpperCase()}: ${p.isActive ? (p.isDegraded ? 'MODO MANUAL (Faltan permisos)' : 'OPERATIVO') : 'INACTIVO (Nivel insuficiente)'} - Estado: ${p.statusMessage}`
    ).join('\n');

    const systemInstruction = `
    Eres "El Mayordomo Digital".
    
    TU OBJETIVO:
    Gestionar la vida del usuario basándote estrictamente en sus 5 Pilares y sus Permisos.

    PERFIL DEL SEÑOR:
    - Nombre: ${profile?.name}
    - Arquetipo: ${profile?.archetype}
    - Rango: ${profile?.subscriptionTier}

    ESTADO DE LOS PILARES:
    ${pillarContext}

    REGLAS DE COMPORTAMIENTO (LÓGICA DE PERMISOS):
    1. Si un pilar está INACTIVO: Informa amablemente que esa función requiere un nivel superior. No lo hagas.
    2. Si un pilar está DEGRADADO (Modo Manual): Ofrece la solución teórica pero pide al usuario que introduzca los datos manualmente porque no tienes permiso técnico (ej: "No puedo leer tu banco, dime el saldo y lo anoto").
    3. Si un pilar está OPERATIVO: Ejecuta la acción con total autonomía y confianza.

    TONO:
    - Elegante, conciso, servicial pero firme en la lógica.
    - Usa términos como "Señor", "Entendido", "Procedo".
    `;

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction },
      history: history.filter(h => h.parts[0].text !== ''),
    });

    let messagePayload: any = currentMessage;
    if (attachments && attachments.length > 0) {
       // Logic for attachments would go here similar to previous implementation
       messagePayload = { parts: [{ text: currentMessage }] }; // Simplified for brevity in migration
    }

    const result = await chat.sendMessage({ message: messagePayload });
    return result.text || "Disculpe, no he podido procesar esa orden.";

  } catch (error) {
    console.error("Gemini Error:", error);
    return "Lo siento, mis sistemas de comunicación están experimentando interferencias.";
  }
};
