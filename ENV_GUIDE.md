# Guía de Variables de Entorno y Scripts (.env)

Este documento lista todas las claves secretas y configuraciones necesarias para conectar el Frontend con los servicios externos (Backend).

---

## 1. Variables de Entorno (Frontend)

Crea un archivo `.env` en la raíz del proyecto (o configúralas en el panel de Cloud Run / Vercel).

### 🤖 Google Gemini (Inteligencia Artificial)
*Necesario para: Chatbot, Insights y Análisis.*
```bash
VITE_GOOGLE_API_KEY=AIzaSy...  # Tu clave actual de AI Studio
```

### 🔥 Firebase / Supabase (Base de Datos & Auth)
*Necesario para: Login, Registro y Guardar datos.*
```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 💳 Stripe (Pagos y Suscripciones)
*Necesario para: Cobrar planes Basic, Premium y Elite.*
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
# IDs de Productos (Copia desde el Dashboard de Stripe)
VITE_STRIPE_PRICE_BASIC=price_1P...
VITE_STRIPE_PRICE_PREMIUM=price_1P...
VITE_STRIPE_PRICE_ELITE=price_1P...
```

### 🐶 Datadog (Monitoreo y Errores)
*Necesario para: Ver si la app falla en tiempo real.*
```bash
VITE_DD_CLIENT_TOKEN=pub...
VITE_DD_APPLICATION_ID=...
VITE_DD_SITE=datadoghq.com
VITE_DD_SERVICE=confort-os
VITE_DD_ENV=production
```

---

## 2. Scripts de Automatización (package.json)

Estos comandos se usan en la terminal para construir la App o desplegar el Backend.

| Comando | Descripción |
| :--- | :--- |
| `npm run build` | Compila la web para producción (Vite). |
| `npx cap sync` | Sincroniza los cambios web con la App Nativa (Android). |
| `npx cap open android` | Abre Android Studio para generar la APK. |
| `firebase deploy` | Sube las Cloud Functions (si usas Firebase Backend). |

---

## 3. Ubicación de Integraciones en Código

Busca el texto `// ECHO` en tu editor para encontrar los puntos exactos de conexión:

*   **Login/Registro:** `components/Onboarding.tsx`
*   **Pagos:** `components/Onboarding.tsx` y `components/SettingsModal.tsx`
*   **Base de Datos:** `App.tsx` (Carga inicial)
*   **Logs de Error:** `services/geminiService.ts`
