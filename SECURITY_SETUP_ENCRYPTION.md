# 🔐 Configuración de Encriptación para Access Tokens de Plaid

## Resumen de Cambios

Se ha implementado encriptación AES-256-GCM para los access tokens de Plaid antes de guardarlos en Firestore.

## Configuración Requerida

### 1. Generar Clave de Encriptación

La clave de encriptación debe ser de **32 bytes (256 bits)** para AES-256.

**Opción A: Generar con OpenSSL (Recomendado)**
```bash
openssl rand -hex 32
```

Esto generará una cadena hexadecimal de 64 caracteres (32 bytes).

**Opción B: Generar con Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Configurar Secret en Firebase

Ejecuta este comando para configurar el secret de encriptación:

```bash
firebase functions:secrets:set PLAID_ENCRYPTION_KEY
```

Cuando se te solicite, pega la clave hexadecimal generada en el paso anterior.

**Alternativa: Usando Google Cloud Console**
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Navega a **Secret Manager**
3. Crea un nuevo secret llamado `PLAID_ENCRYPTION_KEY`
4. Pega la clave hexadecimal generada

### 3. Verificar Configuración

Para verificar que el secret está configurado correctamente:

```bash
firebase functions:secrets:access PLAID_ENCRYPTION_KEY
```

## Migración de Tokens Existentes

Los tokens existentes en Firestore están en texto plano. El código incluye compatibilidad hacia atrás:

- **Tokens nuevos**: Se encriptan automáticamente al guardar
- **Tokens legacy**: Se detectan automáticamente y se usan tal cual (sin encriptar)
- **Recomendación**: Forzar reconexión de cuentas bancarias para migrar tokens a formato encriptado

## Formato de Token Encriptado

Los tokens encriptados se almacenan en formato:
```
iv:encryptedData:authTag
```

Donde:
- `iv`: Initialization Vector (16 bytes, base64)
- `encryptedData`: Token encriptado (base64)
- `authTag`: Authentication Tag de GCM (16 bytes, base64)

## Seguridad

- ✅ **Algoritmo**: AES-256-GCM (Autenticado, resistente a tampering)
- ✅ **IV Aleatorio**: Cada token usa un IV único
- ✅ **Clave en Secret Manager**: Nunca expuesta en código
- ✅ **Compatibilidad Legacy**: Soporta tokens sin encriptar para migración gradual

## Funciones Afectadas

Las siguientes funciones ahora requieren el secret `PLAID_ENCRYPTION_KEY`:
- `exchangePublicToken` - Encripta tokens al guardar
- `getBankData` - Desencripta tokens al leer
- `disconnectBank` - Desencripta tokens al eliminar

## Troubleshooting

### Error: "Encryption key must be 32 bytes"
- Verifica que el secret `PLAID_ENCRYPTION_KEY` sea exactamente 64 caracteres hexadecimales
- Regenera la clave si es necesario

### Error: "Failed to decrypt access token"
- El token puede estar en formato legacy (sin encriptar)
- El código intentará usarlo tal cual
- Si persiste, verifica que la clave de encriptación sea correcta

### Tokens Legacy
- Los tokens existentes seguirán funcionando
- Se recomienda forzar reconexión para migrar a formato encriptado

