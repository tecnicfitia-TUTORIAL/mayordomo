const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 8080;
// Serve from the 'build' directory (changed from 'dist' to avoid potential volume mount conflicts)
const distPath = path.join(__dirname, 'build');

// STARTUP CHECK: Ensure build succeeded
if (!fs.existsSync(distPath)) {
  console.error(`CRITICAL ERROR: Build directory '${distPath}' not found. 'npm run build' may have failed.`);
  process.exit(1);
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

const server = http.createServer((req, res) => {
  // Basic health check
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }

  let safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
  // Map root to index.html, otherwise use the path
  let filePath = path.join(distPath, safePath === '/' ? 'index.html' : safePath);

  const serveFile = (targetPath) => {
    const extname = String(path.extname(targetPath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(targetPath, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          // SPA Fallback: If file not found and it doesn't have an extension (likely a route), serve index.html
          if (path.extname(targetPath) === '') {
             fs.readFile(path.join(distPath, 'index.html'), (err, idxContent) => {
               if (err) {
                 res.writeHead(500);
                 res.end('Server Error: index.html missing');
               } else {
                 res.writeHead(200, { 'Content-Type': 'text/html' });
                 res.end(idxContent, 'utf-8');
               }
             });
          } else {
             res.writeHead(404);
             res.end('404 Not Found');
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

  serveFile(filePath);
});

server.listen(port, () => {
  console.log(`Confort OS Server running on port ${port} serving ${distPath}`);
});