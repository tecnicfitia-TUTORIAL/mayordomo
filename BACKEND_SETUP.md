# Manual de Ingeniería: Confort 65/35

Esta guía detalla los pasos para transformar el prototipo actual (Frontend React) en un producto completo (SaaS + App Móvil) con persistencia de datos y cobros reales.

---

## 1. Arquitectura Objetivo

*   **Frontend:** React + Vite + Tailwind (Código Actual)
*   **Móvil:** Capacitor (Wrapper Nativo)
*   **Backend/DB:** Supabase (PostgreSQL + Auth)
*   **Pagos:** Stripe
*   **IA:** Google Gemini (vía Edge Functions para ocultar API Key)

---

## 2. Configuración de Base de Datos (Supabase)

1.  Crea un proyecto en [supabase.com](https://supabase.com).
2.  Ve al **SQL Editor** y ejecuta este script para crear la estructura:

```sql
-- 1. Tabla de Perfiles de Usuario
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  name text,
  age integer,
  gender text,
  occupation text,
  archetype text,
  subscription_tier text default 'FREE', -- FREE, BASIC, PREMIUM, ELITE
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabla de Sectores (Estado de la Casa)
create table public.sectors (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  sector_id_ref text not null, -- id interno (ej: 'finance-1')
  name text,
  type text,
  owner text, -- 'AI' o 'USER'
  efficiency integer,
  status text,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Políticas de Seguridad (RLS)
alter table public.profiles enable row level security;
alter table public.sectors enable row level security;

create policy "Usuarios pueden ver su propio perfil" on public.profiles
  for select using (auth.uid() = id);

create policy "Usuarios pueden editar su propio perfil" on public.profiles
  for update using (auth.uid() = id);

create policy "Usuarios ven sus sectores" on public.sectors
  for select using (auth.uid() = user_id);

create policy "Usuarios editan sus sectores" on public.sectors
  for all using (auth.uid() = user_id);
```

---

## 3. Generación de App Móvil (APK Android)

Para crear la aplicación instalable en móviles:

**Requisitos:**
*   Tener instalado [Android Studio](https://developer.android.com/studio).
*   Tener Node.js instalado.

**Pasos:**

1.  **Instalar Capacitor:**
    ```bash
    npm install @capacitor/core @capacitor/cli @capacitor/android
    npx cap init "Confort OS" com.confort.app
    ```

2.  **Configurar `capacitor.config.json`:**
    Asegúrate de que `webDir` apunte a `dist` (o `build` según tu vite.config).
    ```json
    {
      "appId": "com.confort.app",
      "appName": "Confort OS",
      "webDir": "build", 
      "bundledWebRuntime": false
    }
    ```

3.  **Compilar y Sincronizar:**
    ```bash
    npm run build
    npx cap add android
    npx cap sync
    ```

4.  **Generar APK:**
    *   Ejecuta: `npx cap open android`
    *   En Android Studio, ve a **Build > Generate Signed Bundle / APK**.
    *   Sigue el asistente para crear tu clave de firma.
    *   El archivo `.apk` resultante es el que puedes instalar en tu móvil o subir a Google Play.

---

## 4. Conexión de Pagos (Stripe)

No proceses pagos en el frontend. Usa Stripe Checkout.

1.  Crea un producto en Stripe para cada Plan (Basic, Premium, Elite).
2.  Crea una **Edge Function** en Supabase llamada `create-checkout-session`:

```javascript
// Ejemplo conceptual para Supabase Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2022-11-15',
})

serve(async (req) => {
  const { priceId, userId } = await req.json()
  
  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `https://tu-app.com/success`,
    cancel_url: `https://tu-app.com/cancel`,
    metadata: { userId: userId } // Importante para el Webhook
  })

  return new Response(JSON.stringify({ url: session.url }), { headers: { "Content-Type": "application/json" } })
})
```

3.  Configura un **Webhook** en Stripe que apunte a tu backend para recibir el evento `checkout.session.completed` y actualizar la tabla `profiles` con el nuevo `subscription_tier`.

---

## 5. Seguridad de la IA (Ocultar API Key)

Actualmente, la `API_KEY` se inyecta en el navegador. Para producción:

1.  Mueve la lógica de `geminiService.ts` a una Supabase Edge Function llamada `chat-completion`.
2.  En el Frontend, cambia la llamada directa a Google por:
    ```javascript
    const response = await supabase.functions.invoke('chat-completion', {
      body: { message, history, context }
    })
    ```
3.  Guarda la `API_KEY` en los "Secretos" de Supabase, nunca en el código.
