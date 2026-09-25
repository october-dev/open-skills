/* Deterministic export. Scans concepts/*.html, extracts metadata via the real DOM, and writes to out/:
     <slug>.png (stage-exact) · <slug>@2x.png (retina) · <slug>.thumb.png (square)
     <slug>.json (metadata for the gallery) · <slug>.mp4 + <slug>.gif for motion
   Animations are paused and seeked frame-by-frame so results are reproducible (for seekable
   CSS/SMIL animation on stable assets/fonts). A concept FAILS (no files, nonzero exit) if it
   404s, has no sized .stage, a required image/css/font fails to load, or a GIF can't fit the cap.

   Usage: node capture.mjs            (all concepts)
          node capture.mjs 01 hero    (only concepts whose slug contains these)
*/
import { chromium } from 'playwright';
import { readdir, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ff = (a) => run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a]);
const BASE = process.env.BASE || 'http://localhost:5273';
const FPS = 25, THUMB = 240;
const GIF_CAP = Number(process.env.GIF_CAP || 3 * 1024 * 1024);  // Product Hunt cap; configurable
const even = (n) => n - (n % 2);                                  // libx264 needs even dimensions
const num = (v, d) => { const x = parseFloat(v); return Number.isFinite(x) ? x : d; };
const filters = process.argv.slice(2);

const FREEZE = () => { document.getAnimations().forEach(a => { try { a.pause(); } catch {} });
  document.querySelectorAll('svg').forEach(s => { try { s.pauseAnimations(); } catch {} }); };
const SEEK = (t) => { document.getAnimations().forEach(a => { try { a.currentTime = t * 1000; } catch {} });
  document.querySelectorAll('svg').forEach(s => { try { s.setCurrentTime(t); } catch {} });
  document.querySelectorAll('video').forEach(v => { try { v.pause(); v.currentTime = t % (v.duration || 1); } catch {} }); };

// metadata + failed-image check, straight from the DOM (decodes entities, order-independent)
const domInfo = (page) => page.evaluate(() => {
  const m = (n) => document.querySelector(`meta[name="${n}"]`)?.content ?? null;
  const st = document.querySelector('.stage');
  const r = st ? st.getBoundingClientRect() : null;
  const badImg = [...document.images].filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.currentSrc || i.src);
  return { title: (document.title || '').trim(), kind: m('asset-kind'), dur: m('asset-dur'),
    poster: m('asset-poster'), group: m('asset-group'), size: m('asset-size'),
    hasStage: !!st, w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0, badImg };
});
async function fontsReady(page) { await page.evaluate(() => document.fonts?.ready).catch(() => {}); await page.waitForTimeout(120); }
const size = async (p) => (await stat(p)).size;

async function gifUnderCap(seq, dest, W) {
  const ladder = [ {fps:16,w:W}, {fps:12,w:W}, {fps:12,w:Math.round(W*0.8)},
                   {fps:10,w:Math.round(W*0.7)}, {fps:10,w:Math.round(W*0.6)} ];
  let last;
  for (const s of ladder) {
    const w = even(s.w);
    await ff(['-framerate', String(FPS), '-i', seq,
      '-vf', `fps=${s.fps},scale=${w}:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3`,
      '-loop', '0', dest]);
    last = { ...s, w, bytes: await size(dest) };
    if (last.bytes <= GIF_CAP) return last;
  }
  return { ...last, over: true };
}

async function main() {
  await mkdir('out', { recursive: true });
  let slugs = (await readdir('concepts')).filter(f => f.endsWith('.html')).map(f => f.replace('.html', ''));
  if (filters.length) slugs = slugs.filter(s => filters.some(f => s.includes(f)));
  slugs.sort();

  const browser = await chromium.launch();
  const done = [], failed = [], warned = [];

  for (const slug of slugs) {
    const url = `${BASE}/concepts/${slug}.html`;
    const tmp = `out/.tmp-${slug}`;
    const fail = (msg) => { failed.push(`${slug}: ${msg}`); console.log(`✗ ${slug} — ${msg}`); };

    // one render context; track failed sub-resources (covers <img> AND CSS backgrounds/fonts)
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    const badRes = [];
    p.on('response', r => { const t = r.request().resourceType();
      if (['image','stylesheet','font','media'].includes(t) && r.status() >= 400) badRes.push(`${t} ${r.status()} ${r.url().split('/').pop()}`); });
    p.on('requestfailed', r => { const t = r.request().resourceType();
      if (['image','stylesheet','font','media'].includes(t)) badRes.push(`${t} failed ${r.url().split('/').pop()}`); });

    const resp = await p.goto(url, { waitUntil: 'load', timeout: 30000 }).catch(() => null);
    if (!resp || !resp.ok()) { fail(`HTTP ${resp ? resp.status() : 'unreachable'}`); await ctx.close(); continue; }
    await p.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await fontsReady(p);
    const info = await domInfo(p);
    if (!info.hasStage || info.w < 100 || info.h < 100) { fail('no sized .stage (need a .stage element ≥100×100)'); await ctx.close(); continue; }
    if (badRes.length || info.badImg.length) { fail(`${badRes.length + info.badImg.length} asset(s) failed to load (e.g. ${(badRes[0] || info.badImg[0]).split('/').pop()})`); await ctx.close(); continue; }

    const kind = info.kind === 'motion' ? 'motion' : 'static';
    const dur = Math.max(0.1, num(info.dur, 6));
    const poster = kind === 'motion' ? Math.min(0.99, Math.max(0, num(info.poster, 0.42))) : 0;
    const W = info.w, H = info.h, We = even(W), He = even(H);
    process.stdout.write(`→ ${slug.padEnd(30)} ${W}×${H} ${kind} … `);

    // resize viewport to fit the stage, then screenshot the STAGE ELEMENT (handles offset/padding)
    await p.setViewportSize({ width: Math.max(W, 200) + 60, height: Math.max(H, 200) + 60 });
    const stageLoc = p.locator('.stage');
    await p.evaluate(FREEZE); await p.evaluate(SEEK, poster * dur); await p.waitForTimeout(80);
    await mkdir(tmp, { recursive: true });
    await stageLoc.screenshot({ path: `out/${slug}@2x.png` });
    await ff(['-i', `out/${slug}@2x.png`, '-vf', `scale=${W}:${H}:flags=lanczos`, `out/${slug}.png`]);

    // square thumbnail: from [data-thumb] if present, else centre of the stage
    const hasThumb = await p.locator('[data-thumb]').count();
    await (hasThumb ? p.locator('[data-thumb]').first() : stageLoc).screenshot({ path: `${tmp}/raw.png` });
    await ff(['-i', `${tmp}/raw.png`, '-vf', `crop='min(iw,ih)':'min(iw,ih)',scale=${THUMB}:${THUMB}:flags=lanczos`, `out/${slug}.thumb.png`]);

    const meta = { slug, name: info.title || slug, kind, group: info.group || 'Assets', w: W, h: H, dur, poster };

    if (kind === 'static') {
      await writeFile(`out/${slug}.json`, JSON.stringify(meta));
      await rm(tmp, { recursive: true, force: true }); await ctx.close();
      console.log('png ✓'); done.push(slug); continue;
    }

    // motion: frame sequence (1× context) → mp4 + gif
    const lo = await browser.newContext({ viewport: { width: Math.max(W,200)+60, height: Math.max(H,200)+60 }, deviceScaleFactor: 1 });
    const pl = await lo.newPage(); await pl.goto(url, { waitUntil: 'load' }); await pl.waitForLoadState('networkidle').catch(()=>{}); await fontsReady(pl); await pl.evaluate(FREEZE);
    const loc = pl.locator('.stage');
    // loop-seam guard: frame(0) must match frame(D), else the loop jumps
    await pl.evaluate(SEEK, 0); const f0 = await loc.screenshot();
    await pl.evaluate(SEEK, dur); const fD = await loc.screenshot();
    const seam = !f0.equals(fD);
    await mkdir(`${tmp}/frames`, { recursive: true });
    const total = Math.round(dur * FPS);
    for (let i = 0; i < total; i++) { await pl.evaluate(SEEK, (i / total) * dur);
      await loc.screenshot({ path: `${tmp}/frames/f${String(i).padStart(4,'0')}.png` }); }
    const seq = `${tmp}/frames/f%04d.png`;
    await ff(['-framerate', String(FPS), '-i', seq, '-vf', `scale=${We}:${He}:flags=lanczos`,
      '-c:v','libx264','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart', `out/${slug}.mp4`]);
    const g = await gifUnderCap(seq, `out/${slug}.gif`, We);
    await rm(tmp, { recursive: true, force: true }); await lo.close(); await ctx.close();

    const notes = [];
    if (g.over) notes.push(`gif ${(g.bytes/1048576).toFixed(2)}MB EXCEEDS ${(GIF_CAP/1048576).toFixed(0)}MB cap @ ${g.w}px/${g.fps}fps`);
    if (seam) notes.push(`loop not seamless (t=0 ≠ t=${dur}s) — stagger via keyframes, not positive delay`);
    await writeFile(`out/${slug}.json`, JSON.stringify({ ...meta, gifBytes: g.bytes, gifOverCap: !!g.over, loopSeam: seam }));
    console.log(`png+mp4+gif ${g.over || seam ? '⚠' : '✓'} (${dur}s · gif ${(g.bytes/1048576).toFixed(2)}MB${g.over ? ' OVER CAP' : ''}${seam ? ' ·loop-seam' : ''})`);
    if (g.over) { warned.push(`${slug}: ${notes[0]} — not shippable; cut duration/colors or use the still`); }
    if (seam) warned.push(`${slug}: loop-seam — ${notes.find(n=>n.includes('seamless'))}`);
    done.push(slug);
  }
  await browser.close();

  console.log(`\n${done.length} exported · ${failed.length} failed · ${warned.length} need attention`);
  for (const f of failed) console.log('  ✗ ' + f);
  for (const w of warned) console.log('  ⚠ ' + w);
  if (failed.length || warned.length) process.exit(1);   // enforce the "ready to ship" contract
}
main().catch(e => { console.error(e); process.exit(1); });
