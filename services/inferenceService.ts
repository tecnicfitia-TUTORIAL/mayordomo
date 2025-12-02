
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, LifeObligation, ObligationCategory, ObligationStatus } from "../types";

const getAI = () => {
  // COPIADO DEL CHAT (geminiService.ts) - Configuración probada y funcional
  if (!process.env.API_KEY) {
    console.error("CRITICAL: API_KEY is missing (Chat Config).");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const InferenceEngine = {
  
  /**
   * Deduces the critical life obligations for a user based on their profile.
   * This replaces static task lists with dynamic, AI-generated contexts.
   */
  inferObligations: async (profile: UserProfile): Promise<LifeObligation[]> => {
    try {
      const ai = getAI();
      if (!ai) return [];
      
      const jurisdiction = profile.lifeContext?.currentJurisdiction?.name || "Global";
      const occupation = profile.occupation;
      const age = profile.age;

      const prompt = `
        ACTÚA COMO UN EXPERTO LEGAL, FISCAL Y ADMINISTRATIVO INTERNACIONAL.
        
        PERFIL DEL CLIENTE:
        - Edad: ${age}
        - Ocupación: ${occupation}
        - Jurisdicción de Residencia: ${jurisdiction}

        TAREA:
        Genera una lista CONCISA de las 3 a 5 obligaciones críticas (Burocracia, Identidad, Vivienda) para este perfil en ${jurisdiction}.
        No inventes textos largos. Sé directo.
        IMPORTANTE: DEVUELVE SOLO EL JSON PURO. NO USES BLOQUES DE CÓDIGO MARKDOWN.

        FORMATO JSON REQUERIDO (Array de objetos):
        [
          {
            "id": "string (slug único)",
            "title": "string (max 30 chars)",
            "category": "IDENTITY" | "TAX" | "HOUSING" | "LEGAL",
            "jurisdiction": "${jurisdiction}",
            "description": "string (max 100 chars)",
            "status": "WARNING"
          }
        ]
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // COPIADO DEL CHAT (geminiService.ts)
        contents: prompt,
        config: {
          maxOutputTokens: 2000, // Increased limit
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                category: { type: Type.STRING, enum: [
                  'IDENTITY', 'TAX', 'HEALTH', 'ASSET', 'HOUSING', 'LEGAL'
                ]},
                jurisdiction: { type: Type.STRING },
                description: { type: Type.STRING },
                status: { type: Type.STRING, enum: ['MISSING', 'WARNING', 'OK'] }
              }
            }
          }
        }
      });

      if (response.text) {
        // Clean potential Markdown code blocks
        const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
            const data = JSON.parse(cleanText);
            // Map to LifeObligation interface ensuring enums match
            return data.map((item: any) => ({
              ...item,
              category: item.category as ObligationCategory,
              status: item.status as ObligationStatus
            }));
        } catch (parseError) {
            console.warn("Inference Engine: Failed to parse JSON response. Falling back to empty list.", parseError);
            return [];
        }
      }

      return [];

    } catch (error) {
      console.error("Inference Engine Error:", error);
      // Fallback: Empty list (User will see manual entry)
      return [];
    }
  }
};
