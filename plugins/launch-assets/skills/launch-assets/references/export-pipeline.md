# Export pipeline & motion authoring

`capture.mjs` turns every `concepts/*.html` page into launch-ready files. Its one important idea
makes everything else work:

## Determinism: pause, then seek

Do **not** screen-record. Instead, load the page, **pause every CSS animation and SMIL
timeline**, then **seek** the whole page to an exact time before each screenshot:

```js
// pause
document.getAnimations().forEach(a => { try { a.pause(); } catch {} });
document.querySelectorAll('svg').forEach(s => { try { s.pauseAnimations(); } catch {} });
// seek to t seconds
document.getAnimations().forEach(a => { try { a.currentTime = t * 1000; } catch {} });
document.querySelectorAll('svg').forEach(s => { try { s.setCurrentTime(t); } catch {} });
document.querySelectorAll('video').forEach(v => { try { v.pause(); v.currentTime = t % (v.duration||1); } catch {} });
```

Why it matters:
- **Reproducible** — for seekable CSS/SMIL animation on stable assets/fonts, re-exporting is
  deterministic (no flaky frame timing). It cannot promise identical bytes for arbitrary page
  content (e.g. JS-driven randomness or late-loading external media).
- **Seamless loops** — for a motion frame of duration `D` at `F` fps, render frame `i` at
  `t = (i/total) * D` where `total = round(D*F)`. Because `i/total` never reaches 1, the loop's
  last frame doesn't duplicate the first — it joins cleanly.
- **Deliberate poster frame** — a GIF's first frame is what platforms show as the still (they
  animate on hover). Choose the most legible beat with `<meta name="asset-poster" content="0.5">`
  and the pipeline seeks there for the PNG still.

## What it outputs, per concept

- `<slug>.png` — the still at exact stage size (e.g. 1270×760).
- `<slug>@2x.png` — retina master (2× device scale) for a designer to work from.
- `<slug>.thumb.png` — a square thumbnail (default 240×240) cropped to the element marked
  `data-thumb`, else the visual centre.
- Motion only: `<slug>.mp4` (H.264, CRF ~17) and `<slug>.gif` (palette-optimised).

## GIF under the platform cap

Platforms cap GIFs (Product Hunt: 3 MB). Encode with a generated palette, then **step down fps
then width** until the file is under the cap:

```
fps 16 @ full width  ->  fps 12  ->  fps 12 @ 80% w  ->  fps 10 @ 70% w  ->  fps 10 @ 60% w
```
Use `palettegen`/`paletteuse` (bayer dither) for clean flat color. **If the whole ladder still
exceeds the cap, the concept is marked not-shippable and the batch exits nonzero** — don’t publish
an over-cap GIF. Fix by shortening the loop, reducing motion/colors, or shipping the PNG still
instead. The cap is configurable via the `GIF_CAP` env var.

## Authoring motion so it exports well

- Animate with **pure CSS keyframes or SVG SMIL**, not JS timers (the pipeline can't seek JS
  timers). `animateMotion` along a path is great for packets/dots.
- Give **every** animation the **same loop period** `D` (the value in `asset-dur`), so the whole
  composition repeats as one clean loop.
- **The seam rule: the frame at `t=0` must equal the frame at `t=D`.** This is the single thing
  that makes a GIF/MP4 loop cleanly. `capture.mjs` checks it for you and prints `⚠loop-seam` if the
  two frames differ — treat that warning as a bug to fix, not noise.
- **Do NOT stagger with a positive `animation-delay`.** With `animation: move Ds ds` (positive `d`)
  an element sits in its start state for `[0, d)`, so at `t=D` it has only run `D−d` of its cycle and
  is *not* back at its start state — the loop jumps at the seam (a real measured example: a 2s delay
  on a 6s triangle move left a 133px jump). Instead, do one of:
  1. **Bake the stagger into the keyframes** — give each element its own `@keyframes` whose active
     window is a sub-range of `0–100%` and whose `0%` and `100%` states are identical (it rests
     outside its window). No delay. Always seamless, and reads as a sequenced cascade.
  2. **Use a NEGATIVE delay** (`animation-delay: -Ds` fractions) *only* with pure-cycle keyframes
     (where `0%` and `100%` are the same state). Negative delay just phase-shifts a continuous cycle,
     so `t=0` and `t=D` still match. Great for continuously-flowing things (packets, spinners, bars
     that fill and reset within their keyframes).
- Keep motion legible at thumbnail size — check the poster frame at 240×240 first.

Canonical zero-delay, keyframe-staggered beat (holds the same state across the seam):

```css
.reply { animation: reply 6s ease-in-out infinite; }
@keyframes reply {
  0%, 18%, 100% { opacity: 0; transform: translateY(8px); }  /* rests here at t=0 and t=D */
  30%, 78%      { opacity: 1; transform: translateY(0); }     /* its active window */
  90%           { opacity: 0; transform: translateY(8px); }
}
/* a continuously cycling wave/dot may instead phase-shift with a negative offset: */
.wave { animation: wave 6s linear infinite; animation-delay: -2s; }
```

`capture.mjs` verifies the seam by comparing the rendered `t=0` and `t=D` frames; a mismatch prints
`⚠loop-seam` and fails the batch. (Comparing only those two catches the common break; if you want to
be thorough, also eyeball the frame one step before `D`.)

## Self-describing concepts (no manifest)

The scripts read the `concepts/` directory and each file's own meta tags — there is no separate
manifest to keep in sync:
- `<title>` → the asset name.
- `<meta name="asset-kind" content="motion">` → motion (omit for static).
- `<meta name="asset-dur" content="6">` → loop seconds (default 6).
- `<meta name="asset-poster" content="0.42">` → 0–1, the still frame for motion.
- `<meta name="asset-group" content="...">` → category for gallery filtering.
- `<meta name="asset-size" content="1080x1920">` → **only if the stage is not 1270×760.** The
  export auto-detects the real `.stage` size, but the live gallery reads this hint to lay the
  card out at the right aspect (portrait/other sizes are clipped without it).

(If you prefer a central manifest with per-concept copy, thesis, and designer notes, that also
works — but self-describing files are less to maintain for a shared skill.)

## Requirements & troubleshooting

- Node, `ffmpeg` on PATH, and `playwright` with chromium (`npm i playwright && npx playwright install chromium`).
- Fonts look wrong in exports → the render didn't wait for fonts. The pipeline awaits
  `document.fonts.ready`; if a face still misses, it fell back — check the `@import` and fallback stack.
- A motion frame's still looks empty → its `asset-poster` lands on a gap in the loop; pick a
  fuller beat.
- Re-export a subset by passing ids/slugs as args to `capture.mjs`.
- The exporter **hard-fails a concept** whose page 404s or has no sized `.stage` (so a broken path
  can't slip through as a tiny blank PNG), **warns** when a referenced image failed to load, and
  **warns** on a loop seam. Read the summary it prints at the end.
- **Odd dimensions**: `libx264` requires even width/height, so the pipeline rounds the MP4/GIF down
  to even automatically — the PNG still keeps the exact stage size.
