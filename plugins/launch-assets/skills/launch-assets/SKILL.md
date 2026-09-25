---
name: launch-assets
description: Create or revise branded launch graphics — Product Hunt gallery images and thumbnails, social/OG cards, app-store screenshot layouts, and short CSS/SVG loops — as exportable HTML frames with PNG/GIF/MP4 outputs and a review gallery. Use for requests to design or export these visual assets ("make our Product Hunt gallery", "social/OG card for the launch", "app store screenshots", "a launch GIF", "many gallery directions for a designer"), not for general launch strategy, copy-only reviews, or standalone one-off illustrations.
---

# Launch Assets

Build a **library of launch/marketing visual assets** as real HTML frames — then export them to spec-correct PNGs, retina masters, thumbnails, and looping GIF/MP4s, and show them in a gallery the user (or their designer) can review and share.

The core idea: **each asset is a self-contained HTML page rendered at the exact target size** (e.g. a Product Hunt gallery frame is `1270×760`). A screenshot of that page *is* the deliverable. This beats one-shot image generation because every frame is editable, on-brand, reproducible, pixel-exact, and can genuinely animate. You produce many *distinct* directions fast, and the human picks winners.

You do four things, in order: **research → design kit → author frames → export & gallery.** Do not skip research; assets built on real positioning and real numbers land, and fabricated ones read as fake to the exact audience you are pitching.

## When this applies

Launch galleries (Product Hunt, app stores), social/OG cards, hero images, thumbnails, short explainer loops, "give me 10 directions for a designer". If the user just wants *one* quick illustrative picture with no brand or spec constraints, plain image generation is fine — this skill is for a *coherent, exportable, spec-correct set*.

## Setup (once per project)

Create an isolated working directory (never build inside the product's source tree — copy in only what you need):

```
<project>-asset-lab/
  assets/        kit.css, kit.js, brand logos, real screenshots, wallpapers
  concepts/      one <slug>.html per asset direction  (the frames)
  out/           exported PNG / @2x / thumb / mp4 / gif  (generated)
  server.mjs  capture.mjs  build-gallery.mjs             (copy from this skill's scripts/)
```

Copy `scripts/*` and `assets/kit.*` from this skill as the starting point. Requires Node and `ffmpeg`; the export pipeline uses `playwright` (`npm i playwright && npx playwright install chromium`).

## Phase 1 — Research (always first)

Pull the *real* material before designing:

- **Positioning**: the one-line category claim, the 2–3 core messages, the concrete proof points. Read any deck, pitch, site, or product doc the user has. Ask for them if missing. Capture exact taglines and the shortest true description.
- **Real data**: user counts, retention, revenue, notable customers, real quotes, real user stories. These become your strongest frames. Never invent metrics — if you must placeholder, label it and tell the user to replace it before launch.
- **Real product imagery**: actual screenshots, logos, brand colors, wallpapers. Real UI in a frame is more convincing than any mockup. Copy these into `assets/`.
- **Platform requirements**: verify current size/format specs for the target platform before you size anything. See [references/platform-specs.md](references/platform-specs.md) for Product Hunt, social/OG, and app-store sizes and the rules that matter (padding, thumbnail-on-hover, file caps).

## Phase 2 — Build the design kit

One shared design system so every frame is on-brand and a token change updates all of them. See [references/design-and-copy.md](references/design-and-copy.md) for the full method. In short:

- **Sample the brand**, don't guess. If you have a deck or screenshot, sample the exact hex values from it (a few pixels with any image library) — the accent, the ink, the ground. Matching the real brand is what makes the set feel official.
- **Pick a type system**: a display face for headlines, a body face, a mono for labels. Google Fonts load fine in the render pipeline via `@import`.
- **Define tokens once** in `assets/kit.css` (colors, type scale, surfaces, one grid/texture, motion helpers) and helpers in `assets/kit.js` (logo paths, chips, cursors, avatars). Every concept links these. Start from the neutral kit in this skill's `assets/` and recolor it.

## Phase 3 — Author the frames

Write one self-contained HTML file per direction into `concepts/`, each on the shared kit, sized to the target stage. Use `templates/concept.html` as the starting point. Two rules make the export pipeline work with zero per-file config:

- The page's outer element is a `.stage` sized exactly to the target (default `1270×760`).
- Each file **self-describes** via meta tags so the pipeline knows how to export it:
  `<meta name="asset-kind" content="motion">` (omit for static), `<meta name="asset-dur" content="6">` (loop seconds), `<meta name="asset-poster" content="0.5">` (0–1, which frame becomes the still), `<meta name="asset-group" content="Multiplayer">` (a category for gallery filtering), and — only if the stage is not the default 1270×760 — `<meta name="asset-size" content="1080x1920">` so the gallery lays the card out at the right aspect.

Aim for **many materially different directions**, not color variations of one layout. Give each a distinct visual thesis. The craft rules that made past sets land — one idea per frame, scrims over photos, logo legibility, plain-language mode, real screenshots over mockups, no near-duplicates — are in [references/design-and-copy.md](references/design-and-copy.md). Read it before authoring.

For motion, animate with pure CSS/SMIL keyframes on a fixed loop duration (all animations the same period) so the export can seek deterministically and the loop joins seamlessly. Details and gotchas: [references/export-pipeline.md](references/export-pipeline.md).

## Phase 4 — Export, gallery, share

Run the pipeline (all scripts read the `concepts/` directory — no manifest to maintain):

```bash
node server.mjs &            # serves the working dir at :5273 (hardened, path-contained)
node capture.mjs             # concepts/*.html -> out/  (PNG + @2x + 240x240 thumb; mp4+gif for motion)
node build-gallery.mjs       # generates index.html (filterable) + all.html (shareable, static thumbs)
```

`capture.mjs` is the heart of it: it **pauses every CSS/SMIL animation and seeks frame-by-frame**, so exports are reproducible and GIF/MP4 loops are seamless; GIFs auto-shrink under the platform cap; it writes a spec-exact still, a retina master, a square thumbnail, and (for motion) an MP4 and GIF. How and why, plus tuning: [references/export-pipeline.md](references/export-pipeline.md).

Before sharing, do a quick **render-QA pass**: skim the exported stills (a contact sheet of
`out/*.png` is the fastest way), confirm the fonts/weights actually rendered, check any 240×240
thumbnail crops look right, and re-check `capture.mjs`’s end-of-run summary — it fails the batch
(nonzero exit) on unreachable pages, missing assets, oversized GIFs, or loop seams. Then let the
user review and share. See [references/gallery-and-share.md](references/gallery-and-share.md): the filterable gallery (`index.html`) for picking winners with notes, the flat `all.html` for sending externally, and how to expose it — open it in a connected browser, or start a Cloudflare quick tunnel (`cloudflared tunnel --url http://localhost:5273`) for a shareable link. **Only create a public link when the user asks to share** — building assets does not imply publishing them. **A quick tunnel is public and unauthenticated and dies when the machine sleeps** — say so when you hand over the link, and never tunnel anything the user has marked sensitive.

## Definition of done

The user has a working directory of distinct, on-brand, spec-correct frames; a gallery they can filter and open 1:1; exported PNG/thumb/GIF/MP4 files in `out/` at real launch sizes; and (if asked) a shareable link. Report the path, the count, and your strongest 2–3 recommendations. Flag any placeholder data that must be replaced before launch.

## Reference files

- [references/platform-specs.md](references/platform-specs.md) — exact sizes/rules for Product Hunt, social/OG, app stores; verify current specs before sizing.
- [references/design-and-copy.md](references/design-and-copy.md) — the design-kit method and the craft rules (legibility, scrims, plain-language, distinct theses).
- [references/export-pipeline.md](references/export-pipeline.md) — how the deterministic export works, motion authoring, GIF-under-cap, tuning, troubleshooting.
- [references/gallery-and-share.md](references/gallery-and-share.md) — the two gallery views and how to serve/share them safely.
