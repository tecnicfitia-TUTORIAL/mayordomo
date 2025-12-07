const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require('firebase-admin');
const https = require('https');
const axios = require('axios');
const crypto = require('crypto');

// Inicializar Firestore si no está inicializado
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// SECRETS
const encryptionKey = defineSecret('PLAID_ENCRYPTION_KEY'); // Reutilizamos la misma clave de encriptación

// ============================================
// DECRYPTION UTILITIES
// ============================================
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
// CERTIFICATE CONFIGURATION (FROM FIRESTORE)
// ============================================
/**
 * Recupera y configura el agente HTTPS con el certificado del usuario desde Firestore
 * @param {string} userId - ID del usuario
 * @returns {Promise<https.Agent>} - Agente HTTPS configurado con certificado
 */
async function getHttpsAgent(userId) {
  try {
    console.log(`[GovernmentService] Loading certificate from Firestore for user: ${userId}`);
    
    // Leer certificado desde Firestore
    const vaultRef = db.collection('users').doc(userId).collection('vault').doc('certificate');
    const doc = await vaultRef.get();
    
    if (!doc.exists) {
      throw new Error('No certificate found in vault. Please upload a certificate first.');
    }
    
    const data = doc.data();
    
    // Verificar que el certificado no esté expirado
    const now = new Date();
    const validUntil = data.validUntil.toDate();
    if (validUntil < now) {
      throw new Error('CERTIFICATE_EXPIRED');
    }
    
    // Desencriptar certificado y clave privada
    console.log(`[GovernmentService] Decrypting certificate data...`);
    const certPem = decryptData(data.certPem);
    const keyPem = decryptData(data.keyPem);
    
    if (!certPem || !keyPem) {
      throw new Error('Failed to decrypt certificate or private key');
    }
    
    // Configurar agente HTTPS con certificado y clave privada
    const agent = new https.Agent({
      cert: certPem,
      key: keyPem,
      rejectUnauthorized: true, // Verificar certificado del servidor
      keepAlive: true
    });

    console.log(`[GovernmentService] HTTPS Agent configured successfully`);
    return agent;
    
  } catch (error) {
    console.error(`[GovernmentService] Error configuring HTTPS agent:`, error.message);
    if (error.message === 'CERTIFICATE_EXPIRED') {
      throw error; // Re-lanzar para manejo específico
    }
    throw new Error(`Failed to configure certificate: ${error.message}`);
  }
}

// ============================================
// DEHÚ (Sede Electrónica)
// ============================================
/**
 * Consulta el buzón de notificaciones de DEHú
 * Endpoint real: https://sede.gob.es/...
 */
exports.getDEHUNotifications = onRequest(
  { cors: true, secrets: [encryptionKey], maxInstances: 10, invoker: 'public' },
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

      console.log(`[GovernmentService] Fetching DEHú notifications for user: ${userId}`);

      // Configurar agente HTTPS con certificado desde Firestore
      let httpsAgent;
      try {
        httpsAgent = await getHttpsAgent(userId);
      } catch (error) {
        if (error.message === 'CERTIFICATE_EXPIRED') {
          return res.status(400).json({
            error: 'CERTIFICATE_EXPIRED',
            message: 'Su certificado digital ha expirado. Por favor, renueve su certificado.'
          });
        }
        return res.status(400).json({
          error: 'CERTIFICATE_ERROR',
          message: error.message
        });
      }

      // URL real de DEHú (ajustar según documentación oficial)
      // NOTA: Esta URL es un ejemplo - verificar la URL real en documentación de DEHú
      const dehuUrl = process.env.DEHU_API_URL || 'https://sede.gob.es/notificaciones/api/v1/notificaciones';

      console.log(`[GovernmentService] Connecting to: ${dehuUrl}`);

      // Realizar petición con certificado cliente
      const response = await axios.get(dehuUrl, {
        httpsAgent: httpsAgent,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 segundos timeout
      });

      console.log(`[GovernmentService] DEHú response status: ${response.status}`);
      
      // Retornar respuesta real (no inventar datos)
      res.json({
        success: true,
        notifications: response.data || [],
        count: Array.isArray(response.data) ? response.data.length : 0,
        source: 'DEHÚ_API'
      });

    } catch (error) {
      console.error(`[GovernmentService] DEHú Error:`, error.message);
      
      // Retornar error real para diagnóstico
      // NO inventar datos - queremos ver el error real del handshake SSL
      const errorDetails = {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null,
        // Información específica de SSL/TLS si existe
        sslError: error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.code === 'SELF_SIGNED_CERT_IN_CHAIN' ? error.code : null
      };

      res.status(error.response?.status || 500).json({
        success: false,
        error: 'Failed to connect to DEHú',
        details: errorDetails,
        // Información útil para debugging
        hint: error.code === 'ENOTFOUND' ? 'DNS resolution failed - check URL' :
              error.code === 'ECONNREFUSED' ? 'Connection refused - service may be down' :
              error.code === 'CERT_HAS_EXPIRED' ? 'Certificate expired' :
              error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ? 'Certificate chain verification failed' :
              'Check certificate path and format'
      });
    }
  }
);

// ============================================
// AEAT (Agencia Estatal de Administración Tributaria)
// ============================================
/**
 * Consulta el estado fiscal del usuario en AEAT
 * Endpoint real: https://www.agenciatributaria.gob.es/...
 */
exports.getAEATStatus = onRequest(
  { cors: true, secrets: [encryptionKey], maxInstances: 10, invoker: 'public' },
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
      const { nif } = req.body;

      console.log(`[GovernmentService] Fetching AEAT status for user: ${userId}`);

      // Configurar agente HTTPS con certificado desde Firestore
      let httpsAgent;
      try {
        httpsAgent = await getHttpsAgent(userId);
      } catch (error) {
        if (error.message === 'CERTIFICATE_EXPIRED') {
          return res.status(400).json({
            error: 'CERTIFICATE_EXPIRED',
            message: 'Su certificado digital ha expirado. Por favor, renueve su certificado.'
          });
        }
        return res.status(400).json({
          error: 'CERTIFICATE_ERROR',
          message: error.message
        });
      }

      // URL real de AEAT (ajustar según documentación oficial)
      // NOTA: Esta URL es un ejemplo - verificar la URL real en documentación de AEAT
      const aeatUrl = process.env.AEAT_API_URL || 'https://www.agenciatributaria.gob.es/AEAT.internet/Inicio/_Segmentos_/Empresas_y_profesionales/Informacion_sobre_el_estado_de_sus_procedimientos/Consultas/Consulta_de_procedimientos.shtml';

      console.log(`[GovernmentService] Connecting to: ${aeatUrl}`);

      // Realizar petición con certificado cliente
      const response = await axios.get(aeatUrl, {
        httpsAgent: httpsAgent,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        params: nif ? { nif } : {},
        timeout: 30000
      });

      console.log(`[GovernmentService] AEAT response status: ${response.status}`);
      
      // Retornar respuesta real
      res.json({
        success: true,
        status: response.data || {},
        source: 'AEAT_API'
      });

    } catch (error) {
      console.error(`[GovernmentService] AEAT Error:`, error.message);
      
      // Retornar error real
      const errorDetails = {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null,
        sslError: error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ? error.code : null
      };

      res.status(error.response?.status || 500).json({
        success: false,
        error: 'Failed to connect to AEAT',
        details: errorDetails
      });
    }
  }
);

// ============================================
// DGT (Dirección General de Tráfico)
// ============================================
/**
 * Consulta los puntos del carnet de conducir
 * Endpoint real: https://sede.dgt.gob.es/...
 */
exports.getDGTPoints = onRequest(
  { cors: true, secrets: [encryptionKey], maxInstances: 10, invoker: 'public' },
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
      const { dni } = req.body;

      console.log(`[GovernmentService] Fetching DGT points for user: ${userId}`);

      // Configurar agente HTTPS con certificado desde Firestore
      let httpsAgent;
      try {
        httpsAgent = await getHttpsAgent(userId);
      } catch (error) {
        if (error.message === 'CERTIFICATE_EXPIRED') {
          return res.status(400).json({
            error: 'CERTIFICATE_EXPIRED',
            message: 'Su certificado digital ha expirado. Por favor, renueve su certificado.'
          });
        }
        return res.status(400).json({
          error: 'CERTIFICATE_ERROR',
          message: error.message
        });
      }

      // URL real de DGT (ajustar según documentación oficial)
      const dgtUrl = process.env.DGT_API_URL || 'https://sede.dgt.gob.es/consultas/consulta-puntos';

      console.log(`[GovernmentService] Connecting to: ${dgtUrl}`);

      // Realizar petición con certificado cliente
      const response = await axios.get(dgtUrl, {
        httpsAgent: httpsAgent,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        params: dni ? { dni } : {},
        timeout: 30000
      });

      console.log(`[GovernmentService] DGT response status: ${response.status}`);
      
      // Retornar respuesta real
      res.json({
        success: true,
        points: response.data || {},
        source: 'DGT_API'
      });

    } catch (error) {
      console.error(`[GovernmentService] DGT Error:`, error.message);
      
      // Retornar error real
      const errorDetails = {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null,
        sslError: error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ? error.code : null
      };

      res.status(error.response?.status || 500).json({
        success: false,
        error: 'Failed to connect to DGT',
        details: errorDetails
      });
    }
  }
);

