
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
// Update path to 'dist' (or /tmp/dist in cloud)
const distPath = isCloudEnvironment ? '/tmp/dist' : path.join(__dirname, 'dist');

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
    // Use node directly to execute vite script to avoid permission/symlink issues
    const viteScript = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
    
    if (!fs.existsSync(viteScript)) {
        console.error(`[Build Error] Vite script not found at ${viteScript}`);
        buildStatus = 'error';
        return;
    }

    // Check API Key presence
    if (!process.env.API_KEY) {
        console.warn("[Build Warning] API_KEY is not set in environment variables. AI features may fail.");
    }

    const buildProcess = exec(`node "${viteScript}" build`, {
        env: { ...process.env, NODE_ENV: 'production' }
    });

    buildProcess.stdout.on('data', (data) => console.log(`[Vite]: ${data.trim()}`));
    buildProcess.stderr.on('data', (data) => console.error(`[Vite Error]: ${data.trim()}`));

    buildProcess.on('close', (code) => {
        if (code === 0) {
            // Verify build output exists
            if (fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'))) {
                console.log(`[Build] SUCCESS. Serving from ${distPath}`);
                buildStatus = 'success';
            } else {
                console.error(`[Build] Failed. Output directory ${distPath} is empty or missing index.html`);
                buildStatus = 'error';
            }
        } else {
            console.error(`[Build] Process exited with code ${code}`);
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
      res.end(`<h1>Error de Arranque</h1><p>El sistema no pudo compilar la aplicación.</p><pre>${buildLogs.join('\n')}</pre>
      <p><strong>Posible Solución Cloud Run:</strong> Verifica que la cuenta de servicio tenga el rol 'Storage Object Admin'.</p>`);
  } 
  else {
      // Loading Screen
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html><head><meta http-equiv="refresh" content="2"></head>
        <body style="background:#020617;color:#e2e8f0;font-family:'Courier New',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;">
            <div style="border: 1px solid #334155; padding: 2rem; border-radius: 8px; background: #0f172a;">
                <h2 style="margin-top:0; color: #d4af37;">Confort OS: Inicializando...</h2>
                <div style="width: 100%; background: #1e293b; height: 4px; margin: 1rem 0; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; height: 100%; width: 50%; background: #d4af37; animation: loading 1s infinite ease-in-out;"></div>
                </div>
                <p style="font-size: 0.8rem; color: #94a3b8;">Compilando activos en memoria volátil...</p>
            </div>
            <style>
                @keyframes loading {
                    0% { left: -50%; }
                    100% { left: 100%; }
                }
            </style>
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
