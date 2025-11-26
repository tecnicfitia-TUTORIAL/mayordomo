
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: any;

// Esta función actúa como un "Proxy Seguro".
// Recibe el mensaje del Frontend, le añade la API Key (que vive segura en el servidor)
// y se lo envía a Google. Así la Key nunca toca el navegador del usuario.

const CORSAir = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Manejo de CORS (Permitir peticiones desde tu web)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORSAir });
  }

  try {
    const { history, message, context } = await req.json();
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

    if (!GOOGLE_API_KEY) {
      throw new Error("API Key no configurada en el Backend");
    }

    // Llamada a la API REST de Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            ...history, // Historial previo
            { role: 'user', parts: [{ text: `Contexto del Sistema: ${JSON.stringify(context)}\n\n${message}` }] }
          ]
        })
      }
    );

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...CORSAir, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORSAir, "Content-Type": "application/json" },
    });
  }
});
