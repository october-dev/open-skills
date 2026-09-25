/* Static server for the asset lab. Serves the working directory at :5273, loopback only.
   Hardened for use behind a tunnel: canonicalizes paths (rejecting symlink escapes), blocks
   dotfiles on the canonical target (.env, .git, …). A tunnel still exposes the whole directory. */
import { createServer } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep, relative } from 'node:path';

const ROOT = await realpath(resolve(process.cwd())).catch(() => resolve(process.cwd()));
const PORT = Number(process.env.PORT || 5273);
const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml',
  '.webp':'image/webp', '.gif':'image/gif', '.mp4':'video/mp4', '.woff2':'font/woff2', '.ico':'image/x-icon',
};
const inside = (p) => { const r = relative(ROOT, p); return r === '' || (!r.startsWith('..') && !r.startsWith(sep)); };

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    else if (p.endsWith('/')) p += 'index.html';
    const rel = normalize(p).replace(/^([/\\])+/, '');
    // block dotfiles / dot-dirs (.env, .git, …) — never serve them
    if (rel.split(/[/\\]/).some(seg => seg.startsWith('.'))) { res.writeHead(404); return res.end('404'); }
    const file = resolve(join(ROOT, rel));
    if (!inside(file)) { res.writeHead(403); return res.end('403'); }             // string check
    const real = await realpath(file).catch(() => null);                          // resolve symlinks…
    if (!real) { res.writeHead(404); return res.end('404'); }                     // missing file
    if (!inside(real)) { res.writeHead(403); return res.end('403'); }             // symlink escaped root
    // …and re-check dotfiles on the CANONICAL path (a symlink can alias .env / a .private dir)
    if (relative(ROOT, real).split(/[/\\]/).some(seg => seg.startsWith('.'))) { res.writeHead(404); return res.end('404'); }
    const s = await stat(real).catch(() => null);
    if (!s || s.isDirectory()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[extname(real).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' });
    res.end(await readFile(real));
  } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(PORT, '127.0.0.1', () => console.log(`asset lab → http://localhost:${PORT} (loopback only)`));
