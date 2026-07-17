#!/usr/bin/env node
// CrateAI Discogs CORS proxy — run this on the desktop PC that stays on.
//
//   node tools/discogs-proxy.mjs            (default port 8722)
//   node tools/discogs-proxy.mjs 9000       (custom port)
//
// Then in CrateAI Settings → Discogs → Proxy URL, enter:
//   http://<デスクトップのローカルIP>:8722
// (Phone and desktop must be on the same Wi-Fi. Find the IP with
//  `ipconfig` on Windows / `ifconfig` on Mac.)
//
// The proxy forwards every request path to https://api.discogs.com with the
// browser's Authorization header, and adds the CORS headers the Discogs API
// itself does not send. No dependencies — Node 18+ only.

import http from 'node:http';

const PORT = Number(process.argv[2]) || 8722;
const UPSTREAM = 'https://api.discogs.com';
const UA = 'CrateAI/1.0 (personal vinyl library app)';

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'GET') { res.writeHead(405); res.end('GET only'); return; }

  try {
    const upstream = await fetch(`${UPSTREAM}${req.url}`, {
      headers: {
        'User-Agent': UA,
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/json' });
    res.end(body);
    console.log(`${new Date().toISOString()} ${upstream.status} ${req.url}`);
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `proxy: ${err.message}` }));
    console.error(`${new Date().toISOString()} ERR ${req.url}: ${err.message}`);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`CrateAI Discogs proxy listening on http://0.0.0.0:${PORT}`);
  console.log(`→ CrateAIのSettings > Discogs > Proxy URL に http://<このPCのIP>:${PORT} を入力`);
});
