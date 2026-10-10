/**
 * Zero-Dependency Full-Stack Server for SIMPLE Studio
 * Serves static assets + routes /api/* to serverless handler functions
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const bookPlanHandler = require('./api/book-plan');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webp': 'image/webp'
};

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];

  // API Routes
  if (urlPath === '/api/book-plan') {
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', async () => {
      try {
        req.body = bodyData ? JSON.parse(bodyData) : {};
      } catch (e) {
        req.body = {};
      }

      // Mock Vercel response helper methods
      res.status = function(code) {
        res.statusCode = code;
        return this;
      };
      res.json = function(payload) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(payload));
      };

      await bookPlanHandler(req, res);
    });
    return;
  }

  // Static Assets
  let filePath = path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath);
  
  // Security: Prevent path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html');
      return res.end('<h1>404 Not Found</h1>');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SIMPLE_STUDIO_SERVER] Running on http://localhost:${PORT}`);
});
