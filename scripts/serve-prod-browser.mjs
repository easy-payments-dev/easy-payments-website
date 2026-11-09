/**
 * Minimal static server for production browser output (SPA fallback for /playground).
 * Used by W6.1 close-out network verification — not a deploy path.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)), 'dist', 'easy-payments-website', 'browser');
const port = Number(process.env.PORT || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

function safeJoin(base, reqPath) {
  const decoded = decodeURIComponent(reqPath.split('?')[0]);
  const cleaned = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  return join(base, cleaned);
}

const server = createServer((req, res) => {
  const urlPath = req.url || '/';
  let filePath = safeJoin(root, urlPath === '/' ? '/index.html' : urlPath);

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    // SPA / Cloudflare-style fallback for client-rendered playground
    filePath = join(root, 'index.html');
  }

  try {
    const body = readFileSync(filePath);
    const type = TYPES[extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(String(error));
  }
});

server.listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});
