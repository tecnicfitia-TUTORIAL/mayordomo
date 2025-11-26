
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// --- GOOGLE CLOUD DATABASE SETUP (PREPARADO) ---
// Cuando configures las variables de entorno en Cloud Run, esto se activará.
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let db = null;

try {
    // Si estamos en Cloud Run y tenemos credenciales, intentamos conectar
    if (process.env.GOOGLE_CLOUD_PROJECT) {
        console.log('[Backend] Detectado entorno Google Cloud. Inicializando Base de Datos...');
        const app = initializeApp({
            credential: applicationDefault() // Usa la identidad de servicio de Cloud Run automáticamente
        });
        db = getFirestore(app);
        console.log('[Backend] Conexión a Firestore: LISTA');
    }
} catch (e) {
    console.warn('[Backend] No se pudo conectar a la BD (Mode Offline):', e.message);
}

const port = process.env.PORT || 8080;
const isCloudEnvironment = process.env.K_SERVICE || process.env.PORT;
const distPath = isCloudEnvironment ? '/tmp/build' : path.join(__dirname, 'build');

let buildStatus = 'pending';
let buildLogs = [];

console.log(`[System] Server starting... Port: ${port}`);

// --- API ENDPOINTS (EJEMPLO PARA CONECTAR FRONTEND -> DB) ---
// Esto permite que tu React llame a /api/status y reciba datos reales de Google Cloud
const handleApiRequest = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    
    if (req.url === '/api/db-check') {
        if (db) {
            try {
                // Ejemplo: Leer una colección de prueba
                const snapshot = await db.collection('system_status').limit(1).get();
                res.end(JSON.stringify({ status: 'connected', docs: snapshot.size }));
            } catch (e) {
                res.end(JSON.stringify({ status: 'error', message: e.message }));
            }
        } else {
            res.end(JSON.stringify({ status: 'offline', message: 'Base de datos no configurada' }));
        }
        return true;
    }
    return false; // No era una petición API
};

// Diagnostic Checks
try {
    if (!fs.existsSync('node_modules')) {
        const msg = '[Diagnostic CRITICAL] node_modules NOT found. GCS Fuse Mount failed.';
        console.error(msg);
        buildLogs.push(msg);
        buildStatus = 'error';
    }
} catch (e) {
    buildLogs.push(`Scan Error: ${e.message}`);
}

function startBuild() {
    if (buildStatus === 'error') return;

    console.log("[Build] Starting background build process...");
    const viteScript = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
    
    if (!fs.existsSync(viteScript)) {
        buildStatus = 'error';
        return;
    }

    // Usamos 'node' directo para máxima compatibilidad
    const buildProcess = exec(`node "${viteScript}" build`, {
        env: { ...process.env, NODE_ENV: 'production' }
    });

    buildProcess.stdout.on('data', (data) => console.log(`[Vite]: ${data.trim()}`));
    buildProcess.stderr.on('data', (data) => console.error(`[Vite Error]: ${data.trim()}`));

    buildProcess.on('close', (code) => {
        if (code === 0) {
            console.log("[Build] SUCCESS.");
            buildStatus = 'success';
        } else {
            buildStatus = 'error';
        }
    });
}

const mimeTypes = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // 1. Handle API Requests first
  if (req.url.startsWith('/api/')) {
      const handled = await handleApiRequest(req, res);
      if (handled) return;
  }

  // 2. Health Check
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }

  // 3. Serve Frontend
  if (buildStatus === 'success') {
      let safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
      let filePath = path.join(distPath, safePath === '/' ? 'index.html' : safePath);
      
      // SPA Fallback: Si no existe el archivo, servir index.html
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(distPath, 'index.html');
      }
      
      serveFile(filePath, res);
  } 
  else if (buildStatus === 'error') {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Error de Arranque</h1><pre>${buildLogs.join('\n')}</pre>`);
  } 
  else {
      // Loading Screen
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html><head><meta http-equiv="refresh" content="2"></head>
        <body style="background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
            <div>
                <h2>Confort OS: Inicializando...</h2>
                <p>Conectando con Google Cloud Database...</p>
            </div>
        </body></html>
      `);
  }
});

const serveFile = (targetPath, res) => {
    const extname = String(path.extname(targetPath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    fs.readFile(targetPath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end('Error loading file');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
};

server.listen(port, () => {
  console.log(`[System] Server listening on ${port}`);
  startBuild();
});
