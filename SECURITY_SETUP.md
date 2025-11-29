# Manual de Seguridad y Secretos

Este proyecto utiliza una arquitectura de seguridad estricta para separar las credenciales públicas (Cliente) de las privadas (Servidor).

## 1. Configuración Local (Frontend)

Para que la aplicación funcione en tu ordenador:

1.  Duplica el archivo `.env.example`.
2.  Renómbralo a `.env`.
3.  Pega tus claves **Públicas**.

> **⚠️ IMPORTANTE:** El archivo `.env` está ignorado por Git. Nunca lo subas al repositorio.

## 2. Configuración del Servidor (Backend / Cloud Functions)

Las claves sensibles (como la `STRIPE_SECRET_KEY` para cobrar dinero) **NUNCA** deben estar en el código React. Viven exclusivamente en el entorno seguro de Google Cloud.

### Opción A: Usando Firebase CLI (Recomendado)

Ejecuta estos comandos en tu terminal para inyectar los secretos en la nube:

```bash
# 1. Configurar clave de Stripe Privada
firebase functions:config:set stripe.secret="sk_live_..."

# 2. Configurar clave de Webhook de Stripe (para detectar pagos)
firebase functions:config:set stripe.webhook="whsec_..."

# 3. Configurar clave de Google AI (para el motor de inferencia serverless)
firebase functions:config:set google.api_key="AIzaSy..."
```

### Opción B: Usando Google Cloud Console

1.  Ve a [Google Cloud Console](https://console.cloud.google.com/).
2.  Navega a **Cloud Run** o **Cloud Functions**.
3.  Selecciona tu función (`stripeWebhook` o `onProfileUpdate`).
4.  Pulsa **Editar e Implementar nueva revisión**.
5.  En la pestaña **Variables de entorno**, añade:
    *   `STRIPE_SECRET_KEY`
    *   `STRIPE_WEBHOOK_SECRET`
    *   `GOOGLE_API_KEY`

## 3. Acceso a Secretos en el Código

### En React (Frontend)
Usamos `import.meta.env` (Estándar Vite).
```typescript
// Correcto
const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
```

### En Node.js (Backend)
Usamos `process.env` o `functions.config()`.
```javascript
// Correcto
const stripe = require('stripe')(functions.config().stripe.secret);
// O si usas variables de entorno estándar:
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
```
