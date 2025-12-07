# 🔧 CONFIGURACIÓN REQUERIDA: STRIPE CHECKOUT DINÁMICO

## ✅ LO QUE YA ESTÁ IMPLEMENTADO

1. ✅ Cloud Function `createCheckoutSession` creada en `functions/index.js`
2. ✅ Frontend actualizado para usar la función dinámica (`services/stripeService.ts`)
3. ✅ Fallback a URLs hardcoded si la función falla

## ⚠️ LO QUE NECESITAS CONFIGURAR EN STRIPE

### Paso 1: Obtener Price IDs de Stripe

1. Ve a tu [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navega a **Products** → Crea o selecciona tus productos:
   - **BASIC** (Asistente)
   - **PRO** (Mayordomo)  
   - **VIP** (Gobernante)
3. Para cada producto, crea un **Price** (precio de suscripción recurrente)
4. Copia los **Price IDs** (empiezan con `price_...`)

### Paso 2: Configurar Variables de Entorno

Tienes dos opciones:

#### Opción A: Variables de Entorno en Firebase Functions (Recomendado)

Edita `functions/index.js` línea ~175 y reemplaza los placeholders:

```javascript
const PRICE_ID_MAPPING = {
  'BASIC': 'price_xxxxxxxxxxxxx_basic',  // Reemplaza con tu Price ID real
  'PRO': 'price_xxxxxxxxxxxxx_pro',      // Reemplaza con tu Price ID real
  'VIP': 'price_xxxxxxxxxxxxx_vip'       // Reemplaza con tu Price ID real
};
```

#### Opción B: Secrets de Firebase (Más Seguro)

1. Define los secrets en `functions/index.js`:
```javascript
const stripePriceIdBasic = defineSecret("STRIPE_PRICE_ID_BASIC");
const stripePriceIdPro = defineSecret("STRIPE_PRICE_ID_PRO");
const stripePriceIdVip = defineSecret("STRIPE_PRICE_ID_VIP");
```

2. Actualiza la función para usar los secrets:
```javascript
const PRICE_ID_MAPPING = {
  'BASIC': stripePriceIdBasic.value(),
  'PRO': stripePriceIdPro.value(),
  'VIP': stripePriceIdVip.value()
};
```

3. Al hacer deploy, Firebase te pedirá los valores:
```bash
firebase functions:secrets:set STRIPE_PRICE_ID_BASIC
firebase functions:secrets:set STRIPE_PRICE_ID_PRO
firebase functions:secrets:set STRIPE_PRICE_ID_VIP
```

### Paso 3: Configurar Success/Cancel URLs

En `functions/index.js` línea ~200, actualiza las URLs:

```javascript
success_url: `${req.headers.origin || 'https://mayordomo.app'}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${req.headers.origin || 'https://mayordomo.app'}/app?checkout=cancelled`,
```

Reemplaza `'https://mayordomo.app'` con tu dominio real.

### Paso 4: Deploy

```bash
cd functions
npm install  # Si agregaste nuevos secrets
firebase deploy --only functions:createCheckoutSession
```

## 🧪 TESTING

1. Inicia sesión en tu app
2. Intenta suscribirte a un plan
3. Deberías ser redirigido a Stripe Checkout
4. Completa el pago de prueba
5. Verifica que el webhook actualiza el tier en Firestore

## 📝 NOTAS

- El webhook de Stripe (`stripeWebhook`) ya está configurado y funcionando
- La función crea automáticamente un Stripe Customer si no existe
- Si la función falla, el frontend usa las URLs hardcoded como fallback
- Los Price IDs deben ser de suscripciones recurrentes (no one-time payments)

## ❓ PROBLEMAS COMUNES

**Error: "Invalid tier or Price ID not configured"**
- Verifica que los Price IDs estén correctos
- Asegúrate de que los productos tengan precios de suscripción creados

**Error: "Unauthorized: Missing or invalid token"**
- Verifica que el usuario esté autenticado
- Revisa que el token de Firebase Auth se esté enviando correctamente

**Checkout no redirige**
- Verifica las URLs de success/cancel
- Revisa la consola del navegador para errores

