/* Writes index.html (filterable working gallery) + all.html (flat shareable page).
   Prefers the authoritative out/<slug>.json that capture.mjs writes (DOM-decoded name/kind/
   group + true pixel size). Falls back to reading the concept HTML + the exported PNG's real
   dimensions if a json is missing. Run after capture.mjs.  Usage: node build-gallery.mjs */
import { readdir, readFile, writeFile, open } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const readT = async (f) => { try { return await readFile(f, 'utf8'); } catch { return ''; } };
const readJ = async (f) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return null; } };
const decode = (s) => (s || '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return m ? decode(m[2] ?? m[3] ?? '') : ''; };
const metaFromHtml = (html) => { const m = {};
  for (const tag of html.replace(/<!--[\s\S]*?-->/g, '').match(/<meta\b[^>]*>/gi) || []) { const n = attr(tag, 'name'); if (n) m[n.toLowerCase()] = attr(tag, 'content'); }
  return m; };
const titleFromHtml = (html) => decode((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || '');
async function pngSize(f) { try { const fh = await open(f); const b = Buffer.alloc(24); await fh.read(b, 0, 24, 0); await fh.close();
  if (b.toString('ascii', 1, 4) === 'PNG') return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; } catch {} return null; }
const esc = (s) => (s || '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const j2s = (v) => JSON.stringify(v).replace(/</g, '\\u003c');   // safe to embed in <script>
const safeSlug = (s) => /^[A-Za-z0-9._-]+$/.test(s);

const files = (await readdir('concepts')).filter(f => f.endsWith('.html')).sort();
const items = [], skipped = [];
for (const f of files) {
  const slug = f.replace('.html', '');
  if (!safeSlug(slug)) { skipped.push(slug); continue; }        // avoid unsafe URLs
  const j = await readJ(`out/${slug}.json`);
  let name, kind, group, w, h;
  let overCap = false;
  let unshippableGif = false;
  if (j) { ({ name, kind, group, w, h } = j); unshippableGif = !!(j.gifOverCap || j.loopSeam); }   // authoritative (from capture)
  else {                                                        // fallback: HTML + real PNG size
    const html = await readT(`concepts/${f}`); const m = metaFromHtml(html);
    name = titleFromHtml(html) || slug; kind = m['asset-kind'] === 'motion' ? 'motion' : 'static'; group = m['asset-group'] || 'Assets';
    const ps = (await pngSize(`out/${slug}.png`)) || (m['asset-size']?.match(/(\d+)\D+(\d+)/) ? { w: +RegExp.$1, h: +RegExp.$2 } : { w: 1270, h: 760 });
    w = ps.w; h = ps.h;
  }
  items.push({ slug, name, kind, group, w, h,
    thumb: existsSync(`out/${slug}.thumb.png`) ? `out/${slug}.thumb.png` : null,
    still: existsSync(`out/${slug}.png`) ? `out/${slug}.png` : null,
    gif: (kind === 'motion' && !unshippableGif && existsSync(`out/${slug}.gif`)) ? `out/${slug}.gif` : null });
}
const groups = [...new Set(items.map(i => i.group))];

/* ---------- index.html : live, filterable, with prev/next/replay ---------- */
const cards = items.map((it, i) => `
  <article class="c" data-group="${esc(it.group)}" data-kind="${it.kind}">
    <div class="fr" data-open="${i}" data-w="${it.w}" data-h="${it.h}" style="aspect-ratio:${it.w}/${it.h}">
      <iframe src="concepts/${encodeURIComponent(it.slug)}.html" scrolling="no" loading="lazy" title="${esc(it.name)}" style="width:${it.w}px;height:${it.h}px"></iframe>
      ${it.kind === 'motion' ? '<span class="mo">MOTION</span>' : ''}</div>
    <div class="cap"><b>${esc(it.name)}</b><span>${esc(it.group)}</span></div>
  </article>`).join('');
const indexHtml = `<!doctype html><meta charset="utf-8"><title>Asset Gallery</title>
<style>
:root{--bg:#141118;--card:#1b1720;--txt:#eee;--txt2:#9a94a6;--hair:rgba(255,255,255,.1);--acc:#ff8a3d}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font-family:system-ui,Arial}
.top{position:sticky;top:0;background:rgba(20,17,24,.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--hair);
  padding:14px 26px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;z-index:10}
.top b{font-size:16px;margin-right:10px}.f{padding:6px 13px;border-radius:999px;border:1px solid var(--hair);background:none;
  color:var(--txt2);font-size:13px;cursor:pointer}.f[aria-pressed=true]{background:var(--acc);border-color:var(--acc);color:#111}
.count{margin-left:auto;color:var(--txt2);font-size:12px;font-family:monospace}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:18px;padding:22px 26px;align-items:start}
.c{border:1px solid var(--hair);border-radius:12px;overflow:hidden;background:var(--card)}
.fr{position:relative;overflow:hidden;cursor:zoom-in;border-bottom:1px solid var(--hair)}
.fr iframe{position:absolute;top:0;left:0;border:0;transform-origin:0 0;pointer-events:none}
.mo{position:absolute;top:8px;left:8px;font:600 10px monospace;background:var(--acc);color:#111;padding:3px 7px;border-radius:5px}
.cap{padding:12px 14px}.cap b{font-size:15px}.cap span{display:block;color:var(--txt2);font-size:12px;margin-top:3px}
.ov{position:fixed;inset:0;background:rgba(8,6,10,.94);display:none;flex-direction:column;z-index:50}.ov[data-on=1]{display:flex}
.ovbar{display:flex;gap:10px;align-items:center;padding:12px 20px;color:var(--txt2)}.ovbar .nm{color:#fff}.ovbar .sp{flex:1}
.ovbar button{background:none;border:1px solid var(--hair);color:var(--txt2);border-radius:8px;padding:7px 13px;cursor:pointer}
.ovstage{flex:1;display:grid;place-items:center;min-height:0}.ovstage iframe{border:0;transform-origin:center;box-shadow:0 30px 90px #000}
</style>
<div class="top"><b>Asset Gallery</b>
  <button class="f" data-g="all" aria-pressed="true">All</button>
  ${groups.map(g => `<button class="f" data-g="${esc(g)}">${esc(g)}</button>`).join('')}
  <span style="width:14px"></span>
  <button class="f" data-k="all" aria-pressed="true">Any</button>
  <button class="f" data-k="motion">Motion</button><button class="f" data-k="static">Static</button>
  <span class="count" id="count"></span></div>
<div class="grid" id="grid">${cards}</div>
<div class="ov" id="ov"><div class="ovbar"><span class="nm" id="ovnm"></span><span class="sp"></span>
  <button onclick="step(-1)">← Prev</button><button onclick="step(1)">Next →</button>
  <button onclick="replay()">↻ Replay</button><button onclick="close_()">Close ✕</button></div>
  <div class="ovstage"><iframe id="ovf"></iframe></div></div>
<script>
const ITEMS=${j2s(items.map(i => ({ slug: i.slug, w: i.w, h: i.h, name: i.name })))};
let fg='all',fk='all',cur=-1;
function fit(){document.querySelectorAll('.fr').forEach(fr=>{const f=fr.querySelector('iframe');const w=+fr.dataset.w;
  const ap=()=>f.style.transform='scale('+(fr.clientWidth/w)+')';ap();new ResizeObserver(ap).observe(fr);});}
function visible(){return [...document.querySelectorAll('.c')].filter(c=>c.style.display!=='none');}
function apply(){let n=0;document.querySelectorAll('.c').forEach(c=>{
  const ok=(fg==='all'||c.dataset.group===fg)&&(fk==='all'||c.dataset.kind===fk);c.style.display=ok?'':'none';if(ok)n++;});
  count.textContent=n+' / '+${items.length};}
document.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{fg=b.dataset.g;document.querySelectorAll('[data-g]').forEach(x=>x.setAttribute('aria-pressed',x===b));apply();});
document.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{fk=b.dataset.k;document.querySelectorAll('[data-k]').forEach(x=>x.setAttribute('aria-pressed',x===b));apply();});
const ov=document.getElementById('ov'),ovf=document.getElementById('ovf');
function sizeOv(){const it=ITEMS[cur];if(!it)return;const s=Math.min((innerWidth-60)/it.w,(innerHeight-120)/it.h,1);
  ovf.style.width=it.w+'px';ovf.style.height=it.h+'px';ovf.style.transform='scale('+s+')';}
function open_(i){cur=i;const it=ITEMS[i];ovf.src='concepts/'+encodeURIComponent(it.slug)+'.html';
  document.getElementById('ovnm').textContent=it.name;ov.dataset.on=1;sizeOv();}
function close_(){ov.dataset.on=0;ovf.src='about:blank';}
function replay(){const it=ITEMS[cur];ovf.src='concepts/'+encodeURIComponent(it.slug)+'.html';}
function step(d){const vis=visible().map(c=>+c.querySelector('.fr').dataset.open);if(!vis.length)return;
  let k=vis.indexOf(cur);k=(k<0?0:k+d);k=(k+vis.length)%vis.length;open_(vis[k]);}
document.querySelectorAll('.fr').forEach(fr=>fr.onclick=()=>open_(+fr.dataset.open));
addEventListener('resize',()=>{if(ov.dataset.on==='1')sizeOv()});
addEventListener('keydown',e=>{if(ov.dataset.on!=='1')return;if(e.key==='Escape')close_();if(e.key==='ArrowRight')step(1);if(e.key==='ArrowLeft')step(-1);if(e.key.toLowerCase()==='r')replay();});
fit();apply();
</script>`;
await writeFile('index.html', indexHtml);

/* ---------- all.html : flat, shareable, full-aspect stills ---------- */
const shots = items.filter(i => i.still || i.thumb);
const flat = j2s(shots.map(i => ({ name: i.name, full: (i.gif || i.still || i.thumb), kind: i.kind })));
const allCards = shots.map((it, i) => `<figure class="c" data-i="${i}" style="aspect-ratio:${it.w}/${it.h}"><img src="${it.still || it.thumb}" loading="lazy" alt="${esc(it.name)}">
  ${it.kind === 'motion' ? '<span class="mo">MOTION</span>' : ''}<figcaption>${esc(it.name)}</figcaption></figure>`).join('');
const allHtml = `<!doctype html><meta charset="utf-8"><title>All Assets</title>
<style>
:root{--bg:#141118;--card:#1b1720;--txt:#eee;--txt2:#9a94a6;--hair:rgba(255,255,255,.1);--acc:#ff8a3d}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font-family:system-ui,Arial}
.top{position:sticky;top:0;background:rgba(20,17,24,.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--hair);
  padding:14px 26px;display:flex;align-items:center}.top b{font-size:16px}.top .n{margin-left:auto;color:var(--txt2);font:12px monospace}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(560px,1fr));gap:18px;padding:22px 26px;max-width:1840px;margin:0 auto;align-items:start}
@media(max-width:1180px){.grid{grid-template-columns:1fr}}
.c{margin:0;position:relative;border:1px solid var(--hair);border-radius:12px;overflow:hidden;background:var(--card);cursor:zoom-in}
.c img{width:100%;height:100%;object-fit:cover;display:block}
.c figcaption{position:absolute;left:0;right:0;bottom:0;padding:28px 14px 11px;font-size:14px;background:linear-gradient(0deg,rgba(6,4,8,.9),transparent);color:#fff}
.c .mo{position:absolute;top:10px;left:10px;font:600 10px monospace;background:var(--acc);color:#111;padding:4px 8px;border-radius:5px}
.lb{position:fixed;inset:0;background:rgba(6,4,8,.95);display:none;flex-direction:column;z-index:50}.lb[data-on=1]{display:flex}
.lb-top{display:flex;gap:12px;padding:14px 22px;color:var(--txt2)}.lb-top .nm{color:#fff}.lb-top .sp{flex:1}
.lb-top button{background:none;border:1px solid var(--hair);color:var(--txt2);border-radius:8px;padding:7px 13px;cursor:pointer}
.lb-body{flex:1;display:grid;place-items:center;padding:0 22px 24px;min-height:0}.lb-body img{max-width:100%;max-height:100%;border-radius:6px}
</style>
<div class="top"><b>All Assets</b><span class="n">${shots.length} frames</span></div>
<div class="grid">${allCards}</div>
<div class="lb" id="lb"><div class="lb-top"><span class="nm" id="nm"></span><span class="sp"></span>
  <button onclick="step(-1)">← Prev</button><button onclick="step(1)">Next →</button><button onclick="close_()">Close ✕</button></div>
  <div class="lb-body"><img id="im" alt=""></div></div>
<script>
const F=${flat};let cur=-1;const lb=document.getElementById('lb'),im=document.getElementById('im');
function open_(i){cur=i;im.src=F[i].full;document.getElementById('nm').textContent=F[i].name;lb.dataset.on=1;document.body.style.overflow='hidden';}
function close_(){lb.dataset.on=0;im.src='';document.body.style.overflow='';}
function step(d){if(cur<0)return;open_((cur+d+F.length)%F.length);}
document.querySelectorAll('.c').forEach(c=>c.onclick=()=>open_(+c.dataset.i));
addEventListener('keydown',e=>{if(lb.dataset.on!=='1')return;if(e.key==='Escape')close_();if(e.key==='ArrowRight')step(1);if(e.key==='ArrowLeft')step(-1);});
</script>`;
await writeFile('all.html', allHtml);
console.log(`gallery built — index.html (${items.length}) + all.html (${shots.length}) · groups: ${groups.join(', ')}`);
if (skipped.length) console.log(`  skipped unsafe slug(s): ${skipped.join(', ')}`);
