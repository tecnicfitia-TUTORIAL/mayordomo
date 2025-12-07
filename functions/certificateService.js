const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require('firebase-admin');
const crypto = require('crypto');
// Lazy load node-forge to avoid initialization timeout
let forge;
function getForge() {
  if (!forge) {
    forge = require('node-forge');
  }
  return forge;
}

// Inicializar Firestore si no está inicializado
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// SECRETS
const encryptionKey = defineSecret('PLAID_ENCRYPTION_KEY'); // Reutilizamos la misma clave de encriptación

// ============================================
// ENCRYPTION UTILITIES (Reutilizadas de bankService)
// ============================================
/**
 * Encripta datos usando AES-256-GCM
 * @param {string} plaintext - Datos en texto plano
 * @returns {string} - Datos encriptados en formato base64 (iv:encryptedData:authTag)
 */
function encryptData(plaintext) {
  if (!plaintext) return null;
  
  try {
    const key = Buffer.from(encryptionKey.value(), 'hex');
    if (key.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex characters)');
    }
    
    const iv = crypto.randomBytes(16); // Initialization Vector
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    
    // Formato: iv:encryptedData:authTag (todo en base64)
    return `${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`;
  } catch (error) {
    console.error('[Encryption] Error encrypting data:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Desencripta datos usando AES-256-GCM
 * @param {string} encryptedData - Datos encriptados en formato base64 (iv:encryptedData:authTag)
 * @returns {string} - Datos en texto plano
 */
function decryptData(encryptedData) {
  if (!encryptedData) return null;
  
  try {
    const key = Buffer.from(encryptionKey.value(), 'hex');
    if (key.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex characters)');
    }
    
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'base64');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'base64');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Decryption] Error decrypting data:', error);
    throw new Error('Failed to decrypt data');
  }
}

// ============================================
// CERTIFICATE VALIDATION & PARSING
// ============================================
/**
 * Valida y parsea un certificado PKCS#12 (.p12/.pfx)
 * @param {Buffer} certBuffer - Buffer del archivo certificado
 * @param {string} password - Contraseña del certificado
 * @returns {Object} - Información del certificado parseado
 */
function parsePKCS12(certBuffer, password) {
  try {
    // Lazy load forge
    const forge = getForge();
    
    // Convertir buffer a base64 y luego a formato que node-forge entiende
    const p12Base64 = certBuffer.toString('base64');
    const p12Der = forge.util.decode64(p12Base64);
    
    // Parsear PKCS#12
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
    
    // Extraer certificado y clave privada
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    
    if (!certBags[forge.pki.oids.certBag] || certBags[forge.pki.oids.certBag].length === 0) {
      throw new Error('No certificate found in PKCS#12 file');
    }
    
    if (!keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || keyBags[forge.pki.oids.pkcs8ShroudedKeyBag].length === 0) {
      throw new Error('No private key found in PKCS#12 file');
    }
    
    const cert = certBags[forge.pki.oids.certBag][0].cert;
    const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;
    
    // Validar fecha de expiración
    const now = new Date();
    const validUntil = cert.validity.notAfter;
    
    if (validUntil < now) {
      throw new Error('CERTIFICATE_EXPIRED');
    }
    
    // Extraer información del certificado
    const subject = cert.subject;
    const issuer = cert.issuer;
    
    return {
      cert: cert,
      privateKey: privateKey,
      certPem: forge.pki.certificateToPem(cert),
      keyPem: forge.pki.privateKeyToPem(privateKey),
      subject: {
        commonName: subject.getField('CN')?.value || '',
        organization: subject.getField('O')?.value || '',
        email: subject.getField('E')?.value || ''
      },
      issuer: {
        commonName: issuer.getField('CN')?.value || '',
        organization: issuer.getField('O')?.value || ''
      },
      serialNumber: cert.serialNumber,
      validFrom: cert.validity.notBefore,
      validUntil: cert.validity.notAfter,
      hasPrivateKey: !!privateKey
    };
    
  } catch (error) {
    if (error.message === 'CERTIFICATE_EXPIRED') {
      throw error; // Re-lanzar error de expiración
    }
    if (error.message.includes('Invalid password') || error.message.includes('MAC verify failure')) {
      throw new Error('INVALID_PASSWORD');
    }
    throw new Error(`Failed to parse certificate: ${error.message}`);
  }
}

// ============================================
// UPLOAD USER CERTIFICATE
// ============================================
/**
 * Cloud Function para subir certificado digital del usuario
 * Valida, encripta y guarda en Firestore
 */
exports.uploadUserCertificate = onRequest(
  { cors: true, secrets: [encryptionKey], maxInstances: 10, maxRequestSize: '10MB' },
  async (req, res) => {
    // MANUAL CORS FIX
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      // Verificar autenticación
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      }

      const token = authHeader.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(token);
      } catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }

      const userId = decodedToken.uid;
      const { fileBase64, fileName, password } = req.body;

      if (!fileBase64 || !fileName || !password) {
        return res.status(400).json({ 
          error: 'Missing required fields: fileBase64, fileName, password' 
        });
      }

      // Validar extensión del archivo
      const fileExtension = fileName.toLowerCase().split('.').pop();
      if (fileExtension !== 'p12' && fileExtension !== 'pfx') {
        return res.status(400).json({ 
          error: 'Invalid file type. Only .p12 and .pfx files are allowed' 
        });
      }

      console.log(`[CertificateService] Uploading certificate for user: ${userId}`);

      // Convertir base64 a buffer
      let certBuffer;
      try {
        certBuffer = Buffer.from(fileBase64, 'base64');
      } catch (error) {
        return res.status(400).json({ error: 'Invalid base64 encoding' });
      }

      // Validar tamaño (máximo 5MB)
      if (certBuffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
      }

      // Parsear y validar certificado
      let certInfo;
      try {
        certInfo = parsePKCS12(certBuffer, password);
      } catch (error) {
        if (error.message === 'CERTIFICATE_EXPIRED') {
          return res.status(400).json({ 
            error: 'CERTIFICATE_EXPIRED',
            message: 'El certificado ha expirado. Por favor, renueve su certificado digital.'
          });
        }
        if (error.message === 'INVALID_PASSWORD') {
          return res.status(400).json({ 
            error: 'INVALID_PASSWORD',
            message: 'Contraseña incorrecta. Verifique la contraseña del certificado.'
          });
        }
        throw error;
      }

      // Encriptar archivo completo y contraseña
      console.log(`[CertificateService] Encrypting certificate data...`);
      const encryptedFile = encryptData(certBuffer.toString('base64'));
      const encryptedPassword = encryptData(password);

      // Guardar en Firestore: users/{uid}/vault/certificate
      const vaultRef = db.collection('users').doc(userId).collection('vault').doc('certificate');
      
      const certificateData = {
        // Metadatos (no sensibles)
        fileName: fileName,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        validFrom: admin.firestore.Timestamp.fromDate(certInfo.validFrom),
        validUntil: admin.firestore.Timestamp.fromDate(certInfo.validUntil),
        issuer: certInfo.issuer.organization || certInfo.issuer.commonName || 'Unknown',
        subject: certInfo.subject.commonName || certInfo.subject.email || 'Unknown',
        serialNumber: certInfo.serialNumber,
        hasPrivateKey: certInfo.hasPrivateKey,
        
        // Datos encriptados (sensibles)
        encryptedFile: encryptedFile,
        encryptedPassword: encryptedPassword,
        certPem: encryptData(certInfo.certPem), // Certificado en formato PEM (encriptado)
        keyPem: encryptData(certInfo.keyPem), // Clave privada en formato PEM (encriptado)
        
        status: 'ACTIVE'
      };

      await vaultRef.set(certificateData);

      console.log(`[CertificateService] Certificate saved successfully for user: ${userId}`);

      // Retornar solo información no sensible
      res.json({
        success: true,
        certificate: {
          id: vaultRef.id,
          fileName: fileName,
          issuer: certificateData.issuer,
          subject: certificateData.subject,
          validFrom: certInfo.validFrom.toISOString(),
          validUntil: certInfo.validUntil.toISOString(),
          serialNumber: certInfo.serialNumber,
          hasPrivateKey: certInfo.hasPrivateKey,
          status: 'ACTIVE'
        }
      });

    } catch (error) {
      console.error(`[CertificateService] Error:`, error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }
);

// ============================================
// GET USER CERTIFICATE STATUS
// ============================================
/**
 * Obtiene el estado del certificado del usuario (sin datos sensibles)
 */
exports.getUserCertificateStatus = onRequest(
  { cors: true, secrets: [encryptionKey], maxInstances: 10 },
  async (req, res) => {
    // MANUAL CORS FIX
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      // Verificar autenticación
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(token);
      } catch (error) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = decodedToken.uid;
      const vaultRef = db.collection('users').doc(userId).collection('vault').doc('certificate');
      const doc = await vaultRef.get();

      if (!doc.exists) {
        return res.json({
          success: true,
          certificate: null
        });
      }

      const data = doc.data();
      const now = new Date();
      const validUntil = data.validUntil.toDate();
      const isExpired = validUntil < now;

      // Retornar solo información no sensible
      res.json({
        success: true,
        certificate: {
          id: doc.id,
          fileName: data.fileName,
          issuer: data.issuer,
          subject: data.subject,
          serialNumber: data.serialNumber,
          validFrom: data.validFrom.toDate().toISOString(),
          validUntil: validUntil.toISOString(),
          hasPrivateKey: data.hasPrivateKey,
          status: isExpired ? 'EXPIRED' : data.status,
          isExpired: isExpired
        }
      });

    } catch (error) {
      console.error(`[CertificateService] Error:`, error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }
);

// ============================================
// DELETE USER CERTIFICATE
// ============================================
/**
 * Elimina el certificado del usuario
 */
exports.deleteUserCertificate = onRequest(
  { cors: true, secrets: [encryptionKey], maxInstances: 10 },
  async (req, res) => {
    // MANUAL CORS FIX
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      // Verificar autenticación
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(token);
      } catch (error) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = decodedToken.uid;
      const vaultRef = db.collection('users').doc(userId).collection('vault').doc('certificate');
      
      await vaultRef.delete();

      console.log(`[CertificateService] Certificate deleted for user: ${userId}`);

      res.json({
        success: true,
        message: 'Certificate deleted successfully'
      });

    } catch (error) {
      console.error(`[CertificateService] Error:`, error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }
);

