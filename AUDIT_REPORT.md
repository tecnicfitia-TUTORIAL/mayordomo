# 🔒 AUDITORÍA DE FLUJO DE DATOS Y SEGURIDAD
**Fecha:** $(date)  
**Proyecto:** Mayordomo Digital  
**Alcance:** Análisis exhaustivo de conexiones externas, seguridad y persistencia de datos

---

## 📊 RESUMEN EJECUTIVO

### Estado General: ⚠️ **REQUIERE ATENCIÓN**

**Fortalezas:**
- ✅ Separación correcta de secretos (backend vs frontend)
- ✅ Sanitización de datos antes de localStorage
- ✅ Uso de Firebase Secrets para claves sensibles
- ✅ Arquitectura serverless para operaciones críticas

**Vulnerabilidades Críticas:**
- 🔴 **CRÍTICO:** Access tokens de Plaid almacenados en Firestore sin encriptar
- 🔴 **CRÍTICO:** Reglas de Firestore demasiado permisivas (cualquier usuario autenticado puede leer/escribir todo)
- 🟡 **MEDIO:** Secrets de MFA almacenados en Firestore sin encriptación adicional
- 🟡 **MEDIO:** Claves públicas de Firebase expuestas en bundle (normal pero verificar)

---

## 🔌 1. TUBERÍAS Y CONEXIONES EXTERNAS

### 1.1 Stripe (Pagos)
**Estado:** ✅ **Bien Implementado**

**Conexiones:**
- **Frontend:** `services/stripeService.ts`
  - Usa clave pública (`VITE_STRIPE_PUBLISHABLE_KEY`) - ✅ Correcto
  - Redirige a URLs de checkout y portal de Stripe
  - No procesa pagos directamente en frontend

- **Backend:** `functions/index.js` (líneas 93-157)
  - Webhook handler: `stripeWebhook`
  - Usa `defineSecret()` para claves privadas - ✅ Correcto
  - Actualiza `subscriptionTier` en Firestore automáticamente

**Datos Sensibles:**
- ✅ Clave secreta de Stripe: Solo en backend (Firebase Secrets)
- ✅ Webhook secret: Solo en backend
- ✅ Clave pública: Expuesta en frontend (normal y seguro)

**Flujo:**
```
Usuario → Frontend (clave pública) → Stripe Checkout → Webhook → Backend (clave secreta) → Firestore
```

---

### 1.2 Firebase (Auth + Firestore)
**Estado:** ⚠️ **Requiere Mejoras**

**Conexiones:**
- **Frontend:** `services/firebaseConfig.ts`
  - Configuración expuesta en bundle (normal para Firebase)
  - Claves públicas: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, etc.

- **Backend:** Firebase Functions
  - Acceso a Firestore Admin SDK
  - Operaciones privilegiadas

**Datos Almacenados en Firestore:**
- ✅ Perfiles de usuario (`users/{uid}`)
- 🔴 **PROBLEMA:** Access tokens de Plaid (sin encriptar) - `users/{uid}.bankAccounts[]`
- 🟡 Secrets de MFA (`users/{uid}/secrets/{secretId}`) - sin encriptación adicional
- ✅ Datos de suscripción, permisos, configuración

**Reglas de Seguridad:**
```javascript
// firestore.rules (ACTUAL - MUY PERMISIVO)
match /{document=**} {
  allow read, write: if request.auth != null;
}
```
🔴 **CRÍTICO:** Cualquier usuario autenticado puede leer/escribir TODOS los documentos.

---

### 1.3 Plaid (Bancos)
**Estado:** 🔴 **VULNERABILIDAD CRÍTICA**

**Conexiones:**
- **Frontend:** `services/bankService.ts`
  - Llama a Cloud Functions vía HTTP
  - No maneja tokens directamente

- **Backend:** `functions/bankService.js`
  - Usa `defineSecret()` para `PLAID_CLIENT_ID` y `PLAID_SECRET` - ✅ Correcto
  - Genera link tokens, intercambia public tokens

**Problema Crítico:**
```javascript
// functions/bankService.js (líneas 117-128)
const newConnection = {
  accessToken,  // 🔴 TOKEN SENSIBLE SIN ENCRIPTAR
  itemId,
  institutionId,
  createdAt: Date.now(),
  provider: 'PLAID',
  status: 'ACTIVE'
};

await db.collection('users').doc(userId).set({
    bankAccounts: admin.firestore.FieldValue.arrayUnion(newConnection)
}, { merge: true });
```

🔴 **Los access tokens de Plaid se guardan en Firestore en texto plano.**

**Impacto:**
- Si alguien accede a Firestore (por reglas permisivas o compromiso), puede acceder a cuentas bancarias de usuarios.

---

### 1.4 Google Gmail API (Emails)
**Estado:** ✅ **Bien Implementado**

**Conexiones:**
- **Frontend:** `services/emailService.ts`
  - Obtiene URL de autorización OAuth
  - Escanea emails vía backend

- **Backend:** `functions/emailService.js`
  - Usa `defineSecret()` para `GMAIL_CLIENT_ID` y `GMAIL_CLIENT_SECRET` - ✅ Correcto
  - Maneja OAuth flow completo
  - Almacena refresh tokens (verificar si están encriptados)

**Datos:**
- ✅ Claves OAuth: Solo en backend
- ⚠️ Refresh tokens: Verificar si se almacenan en Firestore y si están encriptados

---

### 1.5 Google Gemini AI (Chat e Inferencia)
**Estado:** ✅ **Bien Implementado**

**Conexiones:**
- **Frontend:** `services/geminiService.ts`
  - Llama a Cloud Function `generateChatResponse`
  - No expone API key

- **Backend:** `functions/aiService.js`
  - Usa `defineSecret()` para `GOOGLE_GEN_AI_KEY` - ✅ Correcto
  - Procesa requests de chat e inferencia

**Datos:**
- ✅ API Key: Solo en backend (Firebase Secrets)

---

## 🔐 2. ANÁLISIS DE SEGURIDAD

### 2.1 Exposición de Datos Sensibles al Frontend

#### ✅ **Bien Protegido:**
- Claves secretas de Stripe: Solo backend
- Claves secretas de Plaid: Solo backend
- Claves secretas de Gmail: Solo backend
- API Key de Google Gemini: Solo backend
- Passwords: Nunca se almacenan (Firebase Auth maneja esto)

#### ⚠️ **Expuesto (Normal pero Verificar):**
- Claves públicas de Firebase: En bundle (normal para Firebase)
- Clave pública de Stripe: En bundle (normal para Stripe)
- `VITE_FIREBASE_PROJECT_ID`: En bundle (normal)

#### 🔴 **Problemas Encontrados:**
1. **Access Tokens de Plaid en Firestore sin encriptar**
   - Ubicación: `users/{uid}.bankAccounts[].accessToken`
   - Riesgo: Acceso no autorizado a cuentas bancarias
   - Solución: Encriptar antes de guardar en Firestore

2. **Secrets de MFA en Firestore sin encriptación adicional**
   - Ubicación: `users/{uid}/secrets/{secretId}`
   - Riesgo: Compromiso de autenticación 2FA
   - Solución: Encriptar con clave derivada del usuario

---

### 2.2 Persistencia de Datos

#### localStorage (Frontend)
**Estado:** ✅ **Bien Implementado**

**Datos Almacenados:**
- Perfil de usuario (`mayordomo_profile`)
- **Sanitización activa:** `sanitizeProfileForStorage()` elimina campos sensibles antes de guardar

**Campos Eliminados (líneas 55-71 en ClientApp.tsx):**
```typescript
'password', 'passwordHash', 'hash', 'privateKey', 'secretKey', 
'secret', 'accessToken', 'refreshToken', 'sessionToken', 'token',
'credential', 'credentials', 'apiKey', 'encryptedData', 'sensitiveInfo'
```

✅ **No se guardan tokens ni credenciales en localStorage.**

**Datos Permitidos:**
- `uid`, `email`, `name`, `role`, `age`, `gender`, `occupation`
- `archetype`, `subscriptionTier`, `grantedPermissions`
- `dashboardConfig`, `themePreference`, `themeConfig`
- `lifeContext` (obligaciones, etc.)

---

#### Firestore (Backend)
**Estado:** ⚠️ **Requiere Mejoras**

**Colecciones y Datos:**

1. **`users/{uid}`** (Documento principal)
   - ✅ Perfil básico (email, name, age, etc.)
   - ✅ Configuración de suscripción
   - ✅ Permisos otorgados
   - 🔴 **`bankAccounts[]`** - Array con access tokens de Plaid sin encriptar
   - ⚠️ `stripeCustomerId` - ID de cliente de Stripe (no sensible pero verificar)

2. **`users/{uid}/secrets/{secretId}`** (Subcolección MFA)
   - 🟡 Secrets de TOTP sin encriptación adicional
   - Solo accesible por el usuario (verificar reglas)

3. **`users/{uid}/user_context/`** (Subcolección)
   - Contexto de vida del usuario
   - Datos no sensibles

4. **`users/{uid}/life_obligations/`** (Subcolección)
   - Obligaciones legales y administrativas
   - Datos no sensibles

5. **`users/{uid}/audit_logs/`** (Subcolección)
   - Logs de auditoría (append-only)
   - Datos no sensibles

---

### 2.3 Reglas de Seguridad de Firestore

**Estado Actual:**
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

🔴 **CRÍTICO:** Regla demasiado permisiva.

**Problemas:**
1. Cualquier usuario autenticado puede leer/escribir TODOS los documentos
2. Un usuario puede acceder a datos de otros usuarios
3. No hay validación de ownership
4. No hay protección para subcolecciones sensibles

**Recomendación:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios solo pueden acceder a sus propios documentos
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Subcolecciones protegidas
      match /secrets/{secretId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /user_context/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /life_obligations/{obligationId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /audit_logs/{logId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow create: if request.auth != null && request.auth.uid == userId;
        // No permitir update/delete (append-only)
      }
    }
  }
}
```

---

## 📋 3. RESUMEN DE VULNERABILIDADES

### 🔴 CRÍTICAS (Acción Inmediata Requerida)

1. **Access Tokens de Plaid sin Encriptar en Firestore**
   - **Ubicación:** `functions/bankService.js:118`
   - **Impacto:** Acceso no autorizado a cuentas bancarias
   - **Solución:** 
     - Encriptar tokens antes de guardar usando Cloud KMS o encriptación AES-256
     - Usar `VaultItem` interface existente para almacenar datos encriptados

2. **Reglas de Firestore Demasiado Permisivas**
   - **Ubicación:** `firestore.rules`
   - **Impacto:** Usuarios pueden acceder a datos de otros usuarios
   - **Solución:** Implementar reglas restrictivas por ownership (ver ejemplo arriba)

### 🟡 MEDIAS (Acción Recomendada)

3. **Secrets de MFA sin Encriptación Adicional**
   - **Ubicación:** `users/{uid}/secrets/`
   - **Impacto:** Compromiso de autenticación 2FA si Firestore es comprometido
   - **Solución:** Encriptar secrets con clave derivada del usuario

4. **Verificar Almacenamiento de Refresh Tokens de Gmail**
   - **Ubicación:** Verificar `functions/emailService.js`
   - **Impacto:** Acceso no autorizado a emails si tokens están en texto plano
   - **Solución:** Si se almacenan, encriptar antes de guardar

### 🟢 BAJAS (Mejoras Opcionales)

5. **Claves Públicas en Bundle**
   - **Estado:** Normal para Firebase/Stripe, pero verificar que no hay claves secretas
   - **Recomendación:** Auditoría periódica del bundle

---

## ✅ 4. BUENAS PRÁCTICAS IMPLEMENTADAS

1. ✅ **Separación de Secretos:** Claves privadas solo en backend (Firebase Secrets)
2. ✅ **Sanitización de localStorage:** Función `sanitizeProfileForStorage()` activa
3. ✅ **Arquitectura Serverless:** Operaciones sensibles en Cloud Functions
4. ✅ **Uso de `defineSecret()`:** Todas las claves sensibles usan Firebase Secrets
5. ✅ **No almacenamiento de passwords:** Firebase Auth maneja esto
6. ✅ **Interface `VaultItem`:** Preparado para almacenar datos encriptados (no usado aún)

---

## 🎯 5. RECOMENDACIONES PRIORITARIAS

### Prioridad 1 (Inmediato)
1. **Encriptar Access Tokens de Plaid**
   - Implementar encriptación AES-256 antes de guardar en Firestore
   - Usar Cloud KMS para gestión de claves o clave derivada del usuario

2. **Actualizar Reglas de Firestore**
   - Implementar reglas restrictivas por ownership
   - Probar en entorno de desarrollo antes de producción

### Prioridad 2 (Corto Plazo)
3. **Encriptar Secrets de MFA**
   - Implementar encriptación para secrets de TOTP
   - Usar clave derivada del UID del usuario

4. **Auditoría de Refresh Tokens de Gmail**
   - Verificar si se almacenan en Firestore
   - Si se almacenan, encriptar

### Prioridad 3 (Mediano Plazo)
5. **Implementar VaultItem para Datos Sensibles**
   - Migrar access tokens a estructura `VaultItem` con encriptación
   - Centralizar gestión de datos sensibles

6. **Monitoreo y Alertas**
   - Implementar alertas para accesos no autorizados
   - Logging de operaciones sensibles

---

## 📝 6. CHECKLIST DE ACCIONES

- [ ] Encriptar access tokens de Plaid antes de guardar en Firestore
- [ ] Actualizar reglas de Firestore con restricciones por ownership
- [ ] Verificar y encriptar refresh tokens de Gmail si se almacenan
- [ ] Encriptar secrets de MFA con clave derivada del usuario
- [ ] Implementar estructura VaultItem para datos sensibles
- [ ] Probar reglas de Firestore en entorno de desarrollo
- [ ] Documentar proceso de encriptación/desencriptación
- [ ] Implementar rotación de claves de encriptación
- [ ] Auditoría periódica del bundle para verificar no exposición de secretos
- [ ] Implementar monitoreo de accesos no autorizados

---

**Fin del Reporte**

