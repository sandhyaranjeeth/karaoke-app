import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from './api/generate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length) process.env[key.trim()] = val.join('=').trim();
  });
}

const server = http.createServer(async (req, res) => {
  const cleanUrl = req.url.split('?')[0];

  if (cleanUrl === '/api/generate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        req.body = JSON.parse(body || '{}');
        res.status = code => { res.statusCode = code; return res; };
        res.json = data => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };
        await handler(req, res);
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (cleanUrl === '/favicon.ico') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const filePath = cleanUrl === '/'
    ? path.join(__dirname, 'index.html')
    : path.join(__dirname, cleanUrl);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    fs.createReadStream(filePath).pipe(res);
  } else {
    console.log('404 Not Found:', filePath);
    res.statusCode = 404;
    res.end(`Not found: ${cleanUrl}`);
  }
});

server.listen(3000, () => {
  console.log('Serving files from:', __dirname);
  console.log('Open http://localhost:3000');
});
