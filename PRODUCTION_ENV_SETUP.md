# 🔐 CONFIGURACIÓN DE VARIABLES DE ENTORNO PARA PRODUCCIÓN

## 📋 Variables Requeridas

### 🔴 CRÍTICAS (Obligatorias para Producción)

#### 1. Plaid (Bancos - Producción)
```bash
# Entorno de Plaid (sandbox, development, production)
PLAID_ENV=production

# Claves de Plaid para PRODUCCIÓN (diferentes de sandbox)
PLAID_CLIENT_ID=tu_client_id_produccion
PLAID_SECRET=tu_secret_produccion

# Clave de encriptación para tokens (32 bytes = 64 caracteres hex)
# Generar con: openssl rand -hex 32
PLAID_ENCRYPTION_KEY=tu_clave_hex_64_caracteres
```

#### 2. Gobierno (Certificado Digital)
```bash
# Password del certificado (si es .p12/.pfx)
# Si el certificado es .cer sin password, dejar vacío
GOVERNMENT_CERT_PASSWORD=tu_password_del_certificado

# URLs de APIs gubernamentales (opcional, tienen defaults)
DEHU_API_URL=https://sede.gob.es/notificaciones/api/v1/notificaciones
AEAT_API_URL=https://www.agenciatributaria.gob.es/...
DGT_API_URL=https://sede.dgt.gob.es/consultas/consulta-puntos
```

### 🟡 OPCIONALES (Mejoras)

#### 3. Stripe (Ya configurado, verificar)
```bash
# Ya deberías tener estas configuradas
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### 4. Firebase (Ya configurado)
```bash
# Ya deberías tener estas en .env.local (frontend)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## 🔧 Configuración en Firebase Secrets

### Para Backend (Cloud Functions):

```bash
# 1. Plaid Environment
firebase functions:secrets:set PLAID_ENV
# Valor: production (o development/sandbox)

# 2. Plaid Production Keys
firebase functions:secrets:set PLAID_CLIENT_ID
# Valor: Tu Client ID de producción

firebase functions:secrets:set PLAID_SECRET
# Valor: Tu Secret de producción

# 3. Encryption Key (si no la tienes)
firebase functions:secrets:set PLAID_ENCRYPTION_KEY
# Valor: Genera con: openssl rand -hex 32

# 4. Certificado Password (si aplica)
firebase functions:secrets:set GOVERNMENT_CERT_PASSWORD
# Valor: Password de tu certificado .p12/.pfx
# Si es .cer sin password, puedes omitir esto
```

### Para Variables de Entorno (Opcional):

Si prefieres usar variables de entorno en lugar de secrets para URLs:

```bash
# En Google Cloud Console → Cloud Functions → Variables de Entorno
DEHU_API_URL=https://sede.gob.es/...
AEAT_API_URL=https://www.agenciatributaria.gob.es/...
DGT_API_URL=https://sede.dgt.gob.es/...
```

---

## 📁 Estructura de Archivos

```
functions/
├── certs/
│   └── idcat.cer          # Tu certificado digital
├── governmentService.js   # Servicio de gobierno (NUEVO)
├── bankService.js         # Actualizado para producción
└── index.js               # Exporta nuevos servicios
```

---

## ✅ Checklist de Configuración

### Antes de Desplegar:

- [ ] Certificado colocado en `functions/certs/idcat.cer`
- [ ] `PLAID_ENV` configurado como `production` o `development`
- [ ] Claves de Plaid de producción configuradas
- [ ] `PLAID_ENCRYPTION_KEY` generada y configurada
- [ ] `GOVERNMENT_CERT_PASSWORD` configurado (si aplica)
- [ ] URLs de APIs gubernamentales verificadas (opcional)
- [ ] Instalado `axios` en functions: `cd functions && npm install axios`

### Verificación Post-Despliegue:

1. **Plaid:**
   ```bash
   # Verificar que usa entorno correcto en logs
   firebase functions:log --only createLinkToken
   # Debe mostrar: "[Plaid] Using PRODUCTION environment"
   ```

2. **Gobierno:**
   ```bash
   # Probar conexión (verá error real si falla handshake)
   curl -X POST https://YOUR-FUNCTION-URL/getDEHUNotifications \
     -H "Content-Type: application/json" \
     -d '{"userId":"test"}'
   ```

---

## 🔍 Troubleshooting

### Error: "Certificate not found"
- Verificar que `functions/certs/idcat.cer` existe
- Verificar permisos de lectura del archivo

### Error: "CERT_HAS_EXPIRED"
- El certificado ha expirado
- Renovar certificado

### Error: "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
- Falta cadena de certificados intermedios
- Agregar certificados CA a la configuración

### Error: "ENOTFOUND" o "ECONNREFUSED"
- URL de API incorrecta
- Verificar `DEHU_API_URL`, `AEAT_API_URL`, `DGT_API_URL`

### Plaid sigue usando Sandbox
- Verificar que `PLAID_ENV` secret está configurado
- Verificar valor: debe ser exactamente `production` o `development`
- Re-desplegar functions después de configurar secret

---

## 📝 Notas Importantes

1. **Certificado .cer vs .p12/.pfx:**
   - `.cer`: Solo certificado público (X.509 PEM)
   - `.p12/.pfx`: Certificado + clave privada (requiere password)
   - Si tienes `.p12`, necesitarás convertir o usar librería adicional

2. **Encriptación de Tokens:**
   - ✅ Ya implementada en `bankService.js`
   - ✅ Se aplica automáticamente a todos los tokens
   - ✅ Verificado en líneas 196 y 250 de `bankService.js`

3. **Seguridad:**
   - Nunca commitees `functions/certs/` al repositorio
   - Agrega `functions/certs/` a `.gitignore`
   - Usa Firebase Secrets para passwords

---

**Fin del Documento**

