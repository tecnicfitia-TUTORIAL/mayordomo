const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenAI, Type } = require("@google/genai");

const googleGenAiKey = defineSecret("GOOGLE_GEN_AI_KEY");

const getAI = () => {
  if (!googleGenAiKey.value()) {
    throw new Error("GOOGLE_GEN_AI_KEY is missing.");
  }
  return new GoogleGenAI({ apiKey: googleGenAiKey.value() });
};

/**
 * 1. CHAT RESPONSE
 */
exports.generateChatResponse = onRequest({ cors: true, secrets: [googleGenAiKey], maxInstances: 10 }, async (req, res) => {
  // MANUAL CORS FIX
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { history, currentMessage, pillars, profile, attachments } = req.body;
    
    // Defensive check
    if (!currentMessage) {
        return res.json({ text: "No he recibido ningún mensaje." });
    }

    const ai = getAI();

    // Construct Pillar Context
    const pillarContext = pillars ? pillars.map(p => 
      `- ${p.name.toUpperCase()}: ${p.isActive ? (p.isDegraded ? 'MODO MANUAL (Faltan permisos)' : 'OPERATIVO') : 'INACTIVO (Nivel insuficiente)'} - Estado: ${p.statusMessage}`
    ).join('\n') : "Información de pilares no disponible.";

    const systemInstruction = `
    Eres "El Mayordomo Digital".
    
    TU OBJETIVO:
    Gestionar la vida del usuario basándote estrictamente en sus 5 Pilares y sus Permisos.

    PERFIL DEL SEÑOR:
    - Nombre: ${profile?.name || 'Señor'}
    - Arquetipo: ${profile?.archetype || 'Desconocido'}
    - Rango: ${profile?.subscriptionTier || 'Invitado'}

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
      history: Array.isArray(history) ? history.filter(h => h.parts && h.parts[0] && h.parts[0].text !== '') : [],
    });

    let messagePayload = currentMessage;
    if (attachments && attachments.length > 0) {
       messagePayload = { parts: [{ text: currentMessage }] }; 
    }

    const result = await chat.sendMessage({ message: messagePayload });
    res.json({ text: result.text || "Disculpe, no he podido procesar esa orden." });

  } catch (error) {
    console.error("Gemini Chat Error:", error);
    // Graceful degradation: Return a polite error message instead of 500
    res.json({ text: "Mis sistemas están experimentando una breve interrupción. Por favor, inténtelo de nuevo en unos instantes." });
  }
});

/**
 * 2. INFER OBLIGATIONS
 * Enhanced error handling to prevent 500 errors
 */
exports.inferObligations = onRequest({ cors: true, secrets: [googleGenAiKey], maxInstances: 10 }, async (req, res) => {
  // MANUAL CORS FIX
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { profile } = req.body;
    
    // Defensive Check - Validate profile exists
    if (!profile) {
        console.warn("[inferObligations] Called without profile.");
        return res.status(200).json({ obligations: [] });
    }

    // Validate API key availability
    let ai;
    try {
      ai = getAI();
    } catch (apiKeyError) {
      console.error("[inferObligations] API Key Error:", apiKeyError.message);
      return res.status(200).json({ 
        obligations: [], 
        error: "AI service temporarily unavailable" 
      });
    }
    
    // Extract profile data with safe defaults
    const jurisdiction = profile.lifeContext?.currentJurisdiction?.name || "Global";
    const occupation = profile.occupation || "Digital Citizen";
    const age = profile.age || 30;

    console.log(`[inferObligations] Processing: age=${age}, occupation=${occupation}, jurisdiction=${jurisdiction}`);

    const prompt = `
      ACTÚA COMO UN EXPERTO LEGAL, FISCAL Y ADMINISTRATIVO INTERNACIONAL.
      
      PERFIL DEL CLIENTE:
      - Edad: ${age}
      - Ocupación: ${occupation}
      - Jurisdicción de Residencia: ${jurisdiction}

      TAREA:
      Genera una lista CONCISA de las 3 a 5 obligaciones críticas (Burocracia, Identidad, Vivienda) para este perfil en ${jurisdiction}.
      No inventes textos largos. Sé directo.
      Responde ÚNICAMENTE con el objeto JSON crudo. No uses bloques de código markdown.

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

    // Call Gemini API with error handling
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          maxOutputTokens: 4000,
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
    } catch (geminiError) {
      console.error("[inferObligations] Gemini API Error:", geminiError.message);
      return res.status(200).json({ 
        obligations: [], 
        error: "AI inference temporarily unavailable" 
      });
    }

    // Parse and validate response
    if (response && response.text) {
      try {
        const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanText);
        
        // Validate that we got an array
        if (Array.isArray(data)) {
          console.log(`[inferObligations] Success: Generated ${data.length} obligations`);
          return res.status(200).json({ obligations: data });
        } else {
          console.warn("[inferObligations] Invalid response format (not an array):", typeof data);
          return res.status(200).json({ obligations: [] });
        }
      } catch (parseError) {
        console.error("[inferObligations] JSON Parse Error:", parseError.message);
        console.error("[inferObligations] Raw response:", response.text?.substring(0, 200));
        return res.status(200).json({ obligations: [] });
      }
    } else {
      console.warn("[inferObligations] Empty response from Gemini");
      return res.status(200).json({ obligations: [] });
    }

  } catch (error) {
    // Catch-all for unexpected errors
    console.error("[inferObligations] Unexpected Error:", error);
    console.error("[inferObligations] Stack:", error.stack);
    
    // Return 200 with empty array to prevent client crash
    return res.status(200).json({ 
      obligations: [], 
      error: "Internal processing error" 
    });
  }
});

/**
 * 3. EVOLUTION (GAP ANALYSIS)
 */
exports.analyzeGapAndPropose = onRequest({ cors: true, secrets: [googleGenAiKey], maxInstances: 10 }, async (req, res) => {
  // MANUAL CORS FIX
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { event, profile, activeModules } = req.body;
    
    if (!event || !profile) {
        return res.json({ proposalRequired: false });
    }

    const ai = getAI();
    
    const microContext = JSON.stringify({
      age: profile.age,
      role: profile.occupation,
      currentModules: activeModules ? activeModules.map(m => m.title) : [],
      currentPermissions: activeModules ? activeModules.flatMap(m => m.permissions.map(p => p.label)) : []
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 1000,
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

    if (response.text) {
      const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanText);
      res.json(result);
    } else {
      res.json({ proposalRequired: false });
    }

  } catch (error) {
    console.error("Evolution Engine Error:", error);
    // Graceful degradation
    res.json({ proposalRequired: false, error: error.message });
  }
});
