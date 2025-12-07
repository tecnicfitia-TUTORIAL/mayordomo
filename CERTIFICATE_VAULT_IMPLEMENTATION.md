# 🔐 IMPLEMENTACIÓN: BÓVEDA DE CERTIFICADOS DIGITALES

## ✅ Resumen de Implementación

Sistema completo para subir, encriptar y gestionar certificados digitales (.p12/.pfx) desde la aplicación móvil/web, con almacenamiento seguro en Firestore.

---

## 📋 Componentes Implementados

### 1. Backend (Cloud Functions)

#### `functions/certificateService.js`
**Funciones creadas:**
- ✅ `uploadUserCertificate` - Sube, valida, encripta y guarda certificado
- ✅ `getUserCertificateStatus` - Obtiene estado del certificado (sin datos sensibles)
- ✅ `deleteUserCertificate` - Elimina certificado del vault

**Características de seguridad:**
- ✅ Validación de tipo de archivo (.p12/.pfx únicamente)
- ✅ Validación de tamaño (máximo 5MB)
- ✅ Validación de contraseña (detecta contraseña incorrecta)
- ✅ Validación de expiración (detecta certificado caducado)
- ✅ Encriptación AES-256-GCM del archivo completo
- ✅ Encriptación AES-256-GCM de la contraseña
- ✅ Almacenamiento en Firestore: `users/{uid}/vault/certificate`
- ✅ Autenticación mediante Firebase Auth token

**Dependencias agregadas:**
- `node-forge` - Para parsear certificados PKCS#12

#### `functions/governmentService.js` (Actualizado)
**Cambios:**
- ✅ Lee certificado desde Firestore en lugar del disco
- ✅ Desencripta certificado y clave privada en memoria
- ✅ Configura agente HTTPS con certificado desencriptado
- ✅ Maneja errores de certificado expirado
- ✅ Autenticación mediante Firebase Auth token

**Ubicación del certificado:**
- ❌ **ANTES:** `functions/certs/idcat.cer` (disco)
- ✅ **AHORA:** `users/{uid}/vault/certificate` (Firestore encriptado)

---

### 2. Frontend

#### `services/certificateService.ts` (Actualizado)
**Cambios:**
- ✅ Reemplazado mock por implementación real
- ✅ Usa `fetch` con autenticación Bearer
- ✅ Maneja errores específicos (certificado expirado, contraseña incorrecta)
- ✅ Convierte archivo a base64 antes de enviar

**Funciones:**
- `uploadCertificate(file, password)` - Sube certificado
- `getStatus()` - Obtiene estado del certificado
- `revokeCertificate(certId)` - Elimina certificado

#### `components/CertificateManager.tsx` (NUEVO)
**Características:**
- ✅ Pantalla completa de gestión de certificados
- ✅ Muestra estado del certificado (activo/expirado)
- ✅ Formulario de subida con validación
- ✅ Input de contraseña
- ✅ Botón de eliminación
- ✅ Manejo de errores y mensajes de éxito
- ✅ Indicadores visuales (🟢 Activo / 🔴 Expirado)

---

## 🔒 Seguridad Implementada

### Encriptación
- **Algoritmo:** AES-256-GCM
- **Clave:** Reutiliza `PLAID_ENCRYPTION_KEY` (32 bytes)
- **Datos encriptados:**
  - Archivo completo del certificado (base64)
  - Contraseña del certificado
  - Certificado en formato PEM
  - Clave privada en formato PEM

### Validaciones
- ✅ Tipo de archivo (.p12/.pfx únicamente)
- ✅ Tamaño máximo (5MB)
- ✅ Contraseña correcta (detecta `INVALID_PASSWORD`)
- ✅ Certificado no expirado (detecta `CERTIFICATE_EXPIRED`)
- ✅ Autenticación Firebase (Bearer token)

### Almacenamiento
- **Ubicación:** `users/{uid}/vault/certificate`
- **Estructura:**
  ```typescript
  {
    // Metadatos (no sensibles)
    fileName: string;
    uploadedAt: Timestamp;
    validFrom: Timestamp;
    validUntil: Timestamp;
    issuer: string;
    subject: string;
    serialNumber: string;
    hasPrivateKey: boolean;
    status: 'ACTIVE' | 'EXPIRED';
    
    // Datos encriptados (sensibles)
    encryptedFile: string;        // Archivo completo encriptado
    encryptedPassword: string;    // Contraseña encriptada
    certPem: string;              // Certificado PEM encriptado
    keyPem: string;              // Clave privada PEM encriptada
  }
  ```

---

## 🚀 Uso

### Para el Usuario

1. **Abrir CertificateManager:**
   ```typescript
   import { CertificateManager } from './components/CertificateManager';
   
   <CertificateManager onClose={() => setShowCertManager(false)} />
   ```

2. **Subir Certificado:**
   - Click en "Seleccionar Archivo .p12 / .pfx"
   - Seleccionar archivo
   - Ingresar contraseña
   - Click en "Subir y Encriptar Certificado"

3. **Ver Estado:**
   - El componente muestra automáticamente el estado del certificado
   - 🟢 Verde = Activo
   - 🔴 Rojo = Expirado

4. **Eliminar Certificado:**
   - Click en botón de eliminar (🗑️)
   - Confirmar eliminación

### Para el Desarrollador

**Integrar en SettingsModal o crear ruta:**
```typescript
const [showCertManager, setShowCertManager] = useState(false);

// En SettingsModal o donde corresponda:
<button onClick={() => setShowCertManager(true)}>
  Gestionar Certificado Digital
</button>

{showCertManager && (
  <CertificateManager onClose={() => setShowCertManager(false)} />
)}
```

---

## 📦 Dependencias

### Backend (`functions/package.json`)
```json
{
  "node-forge": "^1.3.1"  // ✅ Agregado
}
```

**Instalar:**
```bash
cd functions
npm install node-forge
```

### Frontend
- Ya incluidas: `firebase/auth`, `lucide-react`

---

## 🔧 Configuración

### Firebase Secrets (Ya configurados)
- `PLAID_ENCRYPTION_KEY` - Reutilizado para encriptar certificados

### Firestore Security Rules
Asegúrate de que las reglas permitan acceso a `users/{uid}/vault/certificate`:
```firestore
match /users/{userId}/vault/certificate {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## 🐛 Manejo de Errores

### Errores Específicos

1. **Certificado Expirado:**
   - Error: `CERTIFICATE_EXPIRED`
   - Mensaje: "El certificado ha expirado. Por favor, renueve su certificado digital."
   - Acción: Usuario debe subir certificado renovado

2. **Contraseña Incorrecta:**
   - Error: `INVALID_PASSWORD`
   - Mensaje: "Contraseña incorrecta. Verifique la contraseña del certificado."
   - Acción: Usuario debe verificar contraseña

3. **Tipo de Archivo Inválido:**
   - Error: Solo se permiten .p12 o .pfx
   - Acción: Usuario debe seleccionar archivo correcto

4. **Archivo Demasiado Grande:**
   - Error: Máximo 5MB
   - Acción: Usuario debe comprimir o usar archivo más pequeño

---

## ✅ Checklist de Implementación

- [x] Cloud Function `uploadUserCertificate` creada
- [x] Cloud Function `getUserCertificateStatus` creada
- [x] Cloud Function `deleteUserCertificate` creada
- [x] `governmentService.js` actualizado para leer desde Firestore
- [x] `certificateService.ts` actualizado (frontend)
- [x] `CertificateManager.tsx` creado
- [x] Validación de tipo de archivo
- [x] Validación de contraseña
- [x] Validación de expiración
- [x] Encriptación AES-256-GCM
- [x] Manejo de errores específicos
- [x] `node-forge` agregado a dependencias
- [ ] Instalar dependencias: `cd functions && npm install`
- [ ] Desplegar functions: `firebase deploy --only functions`
- [ ] Integrar `CertificateManager` en la UI principal

---

## 📝 Notas Técnicas

### Parseo de PKCS#12
El código usa `node-forge` para parsear certificados .p12/.pfx:
- Extrae certificado y clave privada
- Valida contraseña
- Valida fecha de expiración
- Convierte a formato PEM para uso con `https.Agent`

### Desencriptación en Memoria
Cuando `governmentService.js` necesita usar el certificado:
1. Lee desde Firestore
2. Desencripta certificado y clave privada
3. Configura `https.Agent` en memoria
4. **Nunca** guarda datos desencriptados en disco

### Compatibilidad
- ✅ Certificados .p12 (PKCS#12)
- ✅ Certificados .pfx (PKCS#12)
- ❌ Certificados .cer (solo público) - No soportados actualmente

---

**Implementación completada** ✅

