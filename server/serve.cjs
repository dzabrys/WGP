const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'docs');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.xml':'application/xml','.txt':'text/plain; charset=utf-8'};
const TEST_SITEKEY = '1x00000000000000000000AA';
const TEST_SECRET = '1x0000000000000000000000000000000AA';

function createServer({env = process.env, verifyFetch = globalThis.fetch, now = Date.now} = {}) {
  const attempts = new Map();
  const json = (res, code, body) => {
    res.writeHead(code, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'});
    res.end(JSON.stringify(body));
  };
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com https://staz2-captcha.dzabrys-staz2.workers.dev; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'");
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400).end(); return; }
    const pathname = url.pathname.replace(/^\/(?:WGP|Staz2)(?=\/)/, '');
    if (pathname.startsWith('/api/captcha/')) {
      let hostname;
      try { hostname = new URL('http://' + req.headers.host).hostname; } catch { json(res, 400, {ok:false}); return; }
      const local = ['127.0.0.1','localhost','[::1]'].includes(hostname) && ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
      const configured = Boolean(env.TURNSTILE_SITEKEY && env.TURNSTILE_SECRET_KEY);
      const testMode = !configured && !env.TURNSTILE_SITEKEY && !env.TURNSTILE_SECRET_KEY && env.NODE_ENV !== 'production' && local;
      const sitekey = configured ? env.TURNSTILE_SITEKEY : TEST_SITEKEY;
      const secret = configured ? env.TURNSTILE_SECRET_KEY : TEST_SECRET;
      if ((!configured && !testMode) || (env.NODE_ENV === 'production' && (sitekey === TEST_SITEKEY || secret === TEST_SECRET))) {
        json(res, 503, {ok:false, error:'captcha-not-configured'}); return;
      }
      if (pathname === '/api/captcha/config' && req.method === 'GET') {
        json(res, 200, {sitekey, testMode}); return;
      }
      if (pathname !== '/api/captcha/verify' || req.method !== 'POST') { json(res, 405, {ok:false}); return; }
      const protocol = req.socket.encrypted ? 'https:' : 'http:';
      if (req.headers.origin !== protocol + '//' + req.headers.host) { json(res, 403, {ok:false}); return; }
      if (!String(req.headers['content-type']).startsWith('application/json')) { json(res, 415, {ok:false}); return; }
      const ip = req.socket.remoteAddress;
      const time = now();
      for (const [key, record] of attempts) if (time - record.start >= 60000) attempts.delete(key);
      let record = attempts.get(ip);
      if (!record) {
        if (attempts.size >= 1000) { json(res, 429, {ok:false}); return; }
        record = {start:time, count:0}; attempts.set(ip, record);
      }
      if (++record.count > 10) { json(res, 429, {ok:false, error:'rate-limit'}); return; }
      try {
        let raw = '';
        for await (const chunk of req) {
          raw += chunk.toString('utf8');
          if (Buffer.byteLength(raw) > 4096) { json(res, 413, {ok:false}); return; }
        }
        let body;
        try { body = JSON.parse(raw); } catch { json(res, 400, {ok:false}); return; }
        if (!body || typeof body.token !== 'string' || !body.token.trim() || body.token.length > 2048 || (body.trap !== undefined && body.trap !== '')) {
          json(res, 400, {ok:false}); return;
        }
        const response = await verifyFetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({secret, response:body.token, remoteip:ip}), signal:AbortSignal.timeout(10000),
        });
        if (!response.ok) { json(res, 502, {ok:false}); return; }
        const result = await response.json();
        const allowedHost = env.TURNSTILE_HOSTNAME || hostname;
        const valid = result.success === true && (testMode || (result.hostname === allowedHost && result.action === 'contact'));
        json(res, valid ? 200 : 403, {ok:valid});
      } catch { json(res, 502, {ok:false}); }
      return;
    }
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    let file;
    try {
      const decoded = decodeURIComponent(pathname).replaceAll('\\', '/');
      // Keep Git metadata and environment files out of the static preview.
      if (decoded.split('/').some(part => part.startsWith('.'))) { res.writeHead(403).end(); return; }
      file = path.resolve(root, '.' + decoded);
    } catch { res.writeHead(400).end(); return; }
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (error, data) => {
      if (error) {
        fs.readFile(path.join(root, '404.html'), (notFoundError, notFound) => {
          res.writeHead(404, {'Content-Type':'text/html; charset=utf-8'});
          res.end(req.method === 'HEAD' ? undefined : notFoundError ? 'Nie znaleziono strony' : notFound);
        });
        return;
      }
      res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream'});
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
  server.requestTimeout = 15000;
  return server;
}
if (require.main === module) {
  const localEnv = process.env.LOCAL_ENV_FILE || path.resolve(__dirname, '..', '.env.local');
  if (fs.existsSync(localEnv)) process.loadEnvFile(localEnv);
  const port = Number(process.env.PORT || 4175);
  createServer().listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/`));
}
module.exports = {createServer};
