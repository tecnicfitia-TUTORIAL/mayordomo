
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const port = process.env.PORT || 8080;
const isCloudEnvironment = process.env.K_SERVICE || process.env.PORT;

// Use /tmp/build for speed in Cloud Run, fallback to local build folder
const distPath = isCloudEnvironment ? '/tmp/build' : path.join(__dirname, 'build');

// Build Status Tracking
let buildStatus = 'pending'; // pending, success, error
let buildLogs = [];

console.log(`[System] Server starting... Port: ${port}`);
console.log(`[System] Environment: ${isCloudEnvironment ? 'Cloud Run' : 'Local'}`);
console.log(`[System] Current Directory: ${process.cwd()}`);

// Diagnostic: Check if critical files exist (debugs mount failures)
try {
    console.log('[Diagnostic] Files in root:', fs.readdirSync('.').join(', '));
    if (fs.existsSync('node_modules')) {
        console.log('[Diagnostic] node_modules found.');
    } else {
        const msg = '[Diagnostic CRITICAL] node_modules NOT found. GCS Fuse Mount failed due to missing IAM permissions.';
        console.error(msg);
        buildLogs.push(msg);
        buildStatus = 'error'; // Fail fast if disk is missing
    }
} catch (e) {
    console.error('[Diagnostic] Error scanning directory:', e.message);
    buildLogs.push(`Scan Error: ${e.message}`);
}

// 1. Function to trigger the build in BACKGROUND
function startBuild() {
    if (buildStatus === 'error') return; // Don't start if diagnosis already failed

    console.log("[Build] Starting background build process...");
    
    // Check API Key presence for diagnostics
    if (process.env.API_KEY) {
        console.log("[Build] API_KEY detected in environment. Injecting into client...");
    } else {
        console.warn("[Build WARNING] API_KEY not found in environment variables. AI features may fail.");
        buildLogs.push("WARNING: API_KEY missing.");
    }
    
    const viteScript = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
    
    // Defensive check: If node_modules is missing due to bad mount
    if (!fs.existsSync(viteScript)) {
        const errorMsg = "CRITICAL: Vite executable not found. node_modules missing. GCS Fuse Mount likely failed.";
        console.error(errorMsg);
        buildLogs.push(errorMsg);
        buildStatus = 'error';
        return;
    }

    // Execute using node directly
    const buildProcess = exec(`node "${viteScript}" build`, {
        env: { ...process.env, NODE_ENV: 'production' }
    });

    buildProcess.stdout.on('data', (data) => {
        console.log(`[Vite]: ${data.trim()}`);
        buildLogs.push(data.toString());
    });

    buildProcess.stderr.on('data', (data) => {
        console.error(`[Vite Error]: ${data.trim()}`);
        buildLogs.push(data.toString());
    });

    buildProcess.on('error', (err) => {
        console.error(`[Build Process Failed]:`, err);
        buildLogs.push(`Process execution error: ${err.message}`);
        buildStatus = 'error';
    });

    buildProcess.on('close', (code) => {
        if (code === 0) {
            console.log("[Build] Completed successfully.");
            buildStatus = 'success';
        } else {
            console.error(`[Build] Failed with code ${code}`);
            buildStatus = 'error';
        }
    });
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// 2. Create Server that handles states
const server = http.createServer((req, res) => {
  // Health check always returns 200 fast
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }

  // If build is ready, serve files normally
  if (buildStatus === 'success') {
      let safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
      let filePath = path.join(distPath, safePath === '/' ? 'index.html' : safePath);
      serveFile(filePath, res);
  } 
  // If build failed, show error with instructions
  else if (buildStatus === 'error') {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <div style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:40px;min-height:100vh;box-sizing:border-box;">
            <h1 style="color:#ef4444;">⚠️ Error de Infraestructura</h1>
            <p style="font-size:1.2em;">El sistema falló al iniciar. Esto suele ser un problema de permisos IAM.</p>
            
            <div style="background:#1e293b;padding:20px;border-radius:10px;border:1px solid #334155;margin:20px 0;">
                <h2 style="color:#fbbf24;margin-top:0;">Posible Solución (Permisos):</h2>
                <ol style="line-height:1.6;">
                    <li>Ve a <strong>IAM y Administración</strong> en Google Cloud.</li>
                    <li>Edita la cuenta de servicio de Cloud Run.</li>
                    <li>Asegúrate de que tenga el rol: <strong>Administrador de objetos de Storage</strong>.</li>
                </ol>
            </div>

            <h3>Logs Técnicos:</h3>
            <pre style="background:#000;padding:15px;border-radius:5px;color:#f87171;white-space:pre-wrap;font-size:0.9em;">${buildLogs.join('')}</pre>
        </div>
      `);
  } 
  // If pending, serve Loading Screen
  else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Inicializando Confort...</title>
            <meta http-equiv="refresh" content="2">
            <style>
                body { background-color: #020617; color: #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
                .loader { width: 200px; height: 4px; background: #1e293b; border-radius: 2px; overflow: hidden; position: relative; margin: 20px 0; }
                .bar { width: 50%; height: 100%; background: #14b8a6; position: absolute; animation: move 1.5s infinite ease-in-out alternate; }
                @keyframes move { from { left: 0%; } to { left: 50%; } }
                h1 { font-size: 1.5rem; margin: 0; font-weight: 700; letter-spacing: -0.02em; color: white; }
                p { font-size: 0.9rem; color: #94a3b8; }
                .logs { margin-top: 20px; font-family: monospace; font-size: 11px; color: #475569; max-width: 90%; text-align: center; }
            </style>
        </head>
        <body>
            <h1>Confort OS</h1>
            <div class="loader"><div class="bar"></div></div>
            <p>Ensamblando arquitectura neuronal...</p>
            <div class="logs">Estado: ${buildStatus}...</div>
        </body>
        </html>
      `);
  }
});

const serveFile = (targetPath, res) => {
    const extname = String(path.extname(targetPath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(targetPath, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          if (path.extname(targetPath) === '') {
             const indexPath = path.join(distPath, 'index.html');
             fs.readFile(indexPath, (err, idxContent) => {
               if (err) {
                 res.writeHead(500);
                 res.end('Index not found');
               } else {
                 res.writeHead(200, { 'Content-Type': 'text/html' });
                 res.end(idxContent, 'utf-8');
               }
             });
          } else {
             res.writeHead(404);
             res.end('Not Found');
          }
        } else {
          res.writeHead(500);
          res.end('Server Error: ' + error.code);
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
};

// Start listening IMMEDIATELY
server.listen(port, () => {
  console.log(`[System] Server active on port ${port}`);
  startBuild();
});

// Handle crashes gracefully to output logs before dying
process.on('uncaughtException', (err) => {
    console.error('[System Critical] Uncaught Exception:', err);
});
