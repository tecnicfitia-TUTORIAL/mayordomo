# 🚀 CHECKLIST DE DEPLOYMENT

## 📋 RESUMEN

Antes de que la aplicación funcione completamente, necesitas desplegar:

1. ✅ **Firestore Rules** (actualizadas recientemente)
2. ✅ **Firebase Functions** (Cloud Functions con las mejoras)
3. ⚠️ **Frontend** (solo si despliegas en producción)

---

## 🔥 PASO 1: DESPLEGAR FIRESTORE RULES

**¿Por qué?** Hemos actualizado las reglas para incluir `vault/certificate` y `processed_emails`.

```bash
# Desde la raíz del proyecto
firebase deploy --only firestore:rules
```

**Tiempo estimado:** 30 segundos

---

## ☁️ PASO 2: DESPLEGAR FIREBASE FUNCTIONS

**¿Por qué?** Las Cloud Functions tienen las mejoras implementadas (certificados, emails, etc.).

```bash
# Opción A: Desde la raíz del proyecto
firebase deploy --only functions

# Opción B: Desde la carpeta functions
cd functions
npm run deploy
```

**Tiempo estimado:** 3-5 minutos

**Nota:** Si es la primera vez, Firebase te pedirá configurar secrets:
- `GOOGLE_GEN_AI_KEY`
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENCRYPTION_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

---

## 🌐 PASO 3: FRONTEND (Solo si despliegas en producción)

### Opción A: Desarrollo Local
```bash
npm run dev
```
La app estará disponible en `http://localhost:8080`

### Opción B: Build para Producción (Vercel)
```bash
npm run build
```
Esto genera la carpeta `dist/` que Vercel despliega automáticamente.

**Si usas Vercel:** El build se hace automáticamente en el deploy. No necesitas hacerlo manualmente.

---

## ✅ VERIFICACIÓN POST-DEPLOY

### 1. Verificar Firestore Rules
```bash
firebase firestore:rules:get
```

### 2. Verificar Functions
```bash
firebase functions:list
```

Deberías ver todas las funciones:
- `createCheckoutSession`
- `createLinkToken`
- `exchangePublicToken`
- `getBankData`
- `disconnectBank`
- `getDEHUNotifications`
- `getAEATStatus`
- `getDGTPoints`
- `uploadUserCertificate`
- `getUserCertificateStatus`
- `deleteUserCertificate`
- `generateChatResponse`
- `inferObligations`
- `analyzeGapAndPropose`
- `processEmailWithAI`
- `stripeWebhook`
- etc.

### 3. Probar la App
1. Abre la app en el navegador
2. Inicia sesión
3. Intenta conectar un banco (debería funcionar)
4. Intenta subir un certificado (debería funcionar)

---

## 🎯 ORDEN RECOMENDADO

1. **Primero:** `firebase deploy --only firestore:rules` (rápido)
2. **Segundo:** `firebase deploy --only functions` (tarda más)
3. **Tercero:** Si despliegas frontend, `npm run build` o deja que Vercel lo haga

---

## ⚠️ NOTAS IMPORTANTES

### Si es la primera vez desplegando:
- Firebase te pedirá autenticarte: `firebase login`
- Firebase te pedirá seleccionar el proyecto: `firebase use --add`
- Firebase te pedirá configurar secrets para las funciones

### Si ya has desplegado antes:
- Solo necesitas actualizar las rules y functions
- Los secrets ya están configurados

### Si algo falla:
- Revisa los logs: `firebase functions:log`
- Verifica que los secrets estén configurados: `firebase functions:secrets:access`

---

## 📝 COMANDOS RÁPIDOS

```bash
# Desplegar todo (rules + functions)
firebase deploy --only firestore:rules,functions

# Solo rules
firebase deploy --only firestore:rules

# Solo functions
firebase deploy --only functions

# Ver logs de functions
firebase functions:log

# Ver estado de secrets
firebase functions:secrets:access
```

---

## ✅ CONCLUSIÓN

**Mínimo necesario:**
1. ✅ `firebase deploy --only firestore:rules` (30 seg)
2. ✅ `firebase deploy --only functions` (3-5 min)

**Frontend:**
- Desarrollo: `npm run dev` (no necesita deploy)
- Producción: Vercel lo hace automáticamente

**Total tiempo:** ~5 minutos

