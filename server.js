
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// --- GOOGLE CLOUD DATABASE SETUP ---
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let db = null;

try {
    if (process.env.GOOGLE_CLOUD_PROJECT) {
        console.log('[Backend] Detectado entorno Google Cloud. Inicializando Base de Datos...');
        const app = initializeApp({
            credential: applicationDefault()
        });
        db = getFirestore(app);
        console.log('[Backend] Conexión a Firestore: LISTA');
    }
} catch (e) {
    console.warn('[Backend] No se pudo conectar a la BD (Mode Offline):', e.message);
}

const port = process.env.PORT || 8080;
const isCloudEnvironment = process.env.K_SERVICE || (process.env.PORT && process.env.PORT !== '8080');

// CRITICAL: Use 'dist' for standard builds (Vercel/Local) and '/tmp/dist' for Cloud Run
const distPath = isCloudEnvironment ? '/tmp/dist' : path.join(__dirname, 'dist');

let buildStatus = 'pending';
let buildLogs = [];

console.log(`[System] Server starting on port ${port}. Serving from: ${distPath}`);

const handleApiRequest = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/db-check') {
        if (db) {
            try {
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
    return false;
};

// Build Process Logic
function startBuild() {
    // If 'dist' already exists (e.g. Vercel or pre-built), skip build
    if (fs.existsSync(path.join(__dirname, 'dist', 'index.html')) && !isCloudEnvironment) {
        console.log("[System] Pre-built 'dist' found. Skipping build.");
        buildStatus = 'success';
        return;
    }

    console.log("[Build] Starting background build process...");
    const viteScript = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
    
    if (!fs.existsSync(viteScript)) {
        // Fallback for environments where devDependencies aren't installed
        if (fs.existsSync(distPath)) {
             console.warn("[Build Warning] Vite not found, but dist exists. Serving existing files.");
             buildStatus = 'success';
             return;
        }
        console.error(`[Build Error] Vite script not found at ${viteScript}`);
        buildStatus = 'error';
        return;
    }

    const buildProcess = exec(`node "${viteScript}" build`, {
        env: { ...process.env, NODE_ENV: 'production' }
    });

    buildProcess.stdout.on('data', (data) => console.log(`[Vite]: ${data.trim()}`));
    buildProcess.stderr.on('data', (data) => console.error(`[Vite Error]: ${data.trim()}`));

    buildProcess.on('close', (code) => {
        if (code === 0) {
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
  if (req.url.startsWith('/api/')) {
      const handled = await handleApiRequest(req, res);
      if (handled) return;
  }

  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }

  if (buildStatus === 'success') {
      let safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
      let filePath = path.join(distPath, safePath === '/' ? 'index.html' : safePath);
      
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(distPath, 'index.html');
      }
      
      serveFile(filePath, res);
  } 
  else if (buildStatus === 'error') {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Error de Arranque</h1><p>Fallo en compilación.</p>`);
  } 
  else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><head><meta http-equiv="refresh" content="2"></head><body style="background:#000;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><div>Iniciando Sistema...</div></body></html>`);
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
