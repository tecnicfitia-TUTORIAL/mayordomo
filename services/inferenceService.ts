
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, LifeObligation, ObligationCategory, ObligationStatus } from "../types";

const getAI = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found. Inference Engine will return empty results.");
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
        Genera una lista de las 3 a 5 obligaciones críticas (Burocracia, Identidad, Vivienda) que esta persona debería tener activas en su "Panel de Control de Vida" según las leyes locales de ${jurisdiction}.
        
        EJEMPLO PARA ESPAÑA: "Renovación DNI", "Declaración IRPF", "Certificado Digital".
        EJEMPLO PARA TAILANDIA: "90-Day Reporting", "Visa Extension", "TM30 Notification".

        FORMATO JSON REQUERIDO:
        [
          {
            "id": "string (unique_slug)",
            "title": "string (Titulo corto)",
            "category": "IDENTITY" | "TAX" | "HOUSING" | "LEGAL",
            "jurisdiction": "${jurisdiction}",
            "description": "Breve explicación de por qué es obligatorio",
            "status": "WARNING" (Por defecto, ya que no lo tenemos registrado)
          }
        ]
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
        const data = JSON.parse(response.text);
        // Map to LifeObligation interface ensuring enums match
        return data.map((item: any) => ({
          ...item,
          category: item.category as ObligationCategory,
          status: item.status as ObligationStatus
        }));
      }

      return [];

    } catch (error) {
      console.error("Inference Engine Error:", error);
      // Fallback: Empty list (User will see manual entry)
      return [];
    }
  }
};
