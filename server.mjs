import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 3003);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function send(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, headers);
  if (response.req.method !== 'HEAD') {
    response.end(body);
    return;
  }

  response.end();
}

function resolveFile(urlPath) {
  const decodedPath = decodeURIComponent(urlPath);
  const cleanPath = decodedPath.replace(/\/+/g, '/');

  if (cleanPath.startsWith('/r/') && cleanPath !== '/r/' && !path.extname(cleanPath)) {
    return path.join(distDir, 'r', 'index.html');
  }

  if (cleanPath === '/') {
    return path.join(distDir, 'index.html');
  }

  const relativePath = cleanPath.replace(/^\/+/, '');
  const directFile = path.join(distDir, relativePath);

  if (existsSync(directFile) && statSync(directFile).isFile()) {
    return directFile;
  }

  if (!path.extname(relativePath)) {
    const nestedIndex = path.join(distDir, relativePath, 'index.html');
    if (existsSync(nestedIndex)) {
      return nestedIndex;
    }

    const htmlFile = `${directFile}.html`;
    if (existsSync(htmlFile)) {
      return htmlFile;
    }
  }

  return null;
}

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const filePath = resolveFile(url.pathname);

  if (!filePath || !filePath.startsWith(distDir)) {
    send(response, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  try {
    const body = readFileSync(filePath);
    const extension = path.extname(filePath);
    const contentType = contentTypes[extension] || 'application/octet-stream';
    const cacheControl = extension === '.html' ? 'no-cache' : 'public, max-age=86400';

    send(response, 200, body, {
      'Cache-Control': cacheControl,
      'Content-Length': body.length,
      'Content-Type': contentType,
    });
  } catch {
    send(response, 500, 'Internal Server Error', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`Zwibba website server running on http://127.0.0.1:${port}`);
});
