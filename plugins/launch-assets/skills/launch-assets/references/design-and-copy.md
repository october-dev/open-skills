# Design kit & craft rules

## Building the design kit

The kit is one shared CSS file (tokens + components) and one JS file (helpers). Every concept
links both, so a single token change restyles the whole set. Start from this skill's
`assets/kit.css` and `assets/kit.js` and recolor/retype them to the brand.

### Sample the brand, don't guess
Matching the real brand is what makes a set feel official rather than fan-made.
- If you have a deck, screenshot, or the product's site, **sample exact hex values** from the
  pixels — the accent, the ink/near-black, the background/ground. Any image library works
  (Python + Pillow: open the image, read pixels in the headline and background regions, take
  the most common non-white/non-black cluster). Record them as tokens.
- Reserve the brightest brand color for the logo mark; use the primary text accent (often a
  slightly deeper shade) for headline emphasis. Using two loud colors muddies it.

### Type system
- A **display face** for headlines (tight negative tracking reads as "designed"), a clean
  **body** face, and a **mono** for eyebrows/labels/page numbers. This three-part split is a
  reliable, modern dev-tool look.
- Google Fonts load in the render pipeline via `@import` in the CSS — give every family a real
  fallback stack in case the network is slow.
- House headline style that has worked well: two-tone (ink + one accent phrase), large, tight.

### Tokens to define once
Colors (ground, ink at a few opacities, hairline, accent + soft/deep variants, a couple of
status hues), a type scale (hero/h1/h2/h3/body/small/mono), surfaces (card, pill, window
chrome, tile), one subtle texture (dot grid or halftone), and motion helpers. Keep it small.

## Craft rules (these are what made past sets land)

- **One idea per frame.** A launch frame is read in ~2 seconds. Big headline, one supporting
  line, one visual moment. If it needs a paragraph, it's two frames.
- **Distinct visual thesis per frame — unless the user asked for a series.** Twenty color-variations
  of one layout is worthless; twenty different arguments is a library. But if the user explicitly wants
  one consistent treatment across many backdrops (e.g. the same type-poster on ten wallpapers), keep it
  consistent — don’t force variety onto a requested series.
- **Real screenshots > synthetic mockups.** Drop a real screenshot into a clean frame (a phone
  mockup, a browser window) and it instantly reads as a real product. Keep them truthful and preserve
  aspect ratio: `object-fit: cover` when a tight crop is fine, but `contain` when the *whole* real
  screen must stay visible. Never stretch.
- **Legibility over photos — match the wash to the text polarity.** Light type over a photo needs a
  **dark scrim** (e.g. `linear-gradient(105deg, rgba(10,8,4,.72), rgba(10,8,4,.2) 44%, transparent 66%)`)
  plus a soft `text-shadow`. Dark ink over a *bright* landscape can instead use a **light wash**
  (a soft white/cream gradient) — sometimes the nicer look. Either way, check contrast at 100%; busy
  images may need a frosted-glass card behind the copy.
- **Logo legibility is measured, not assumed.** Some brand logos are white-on-transparent (they
  vanish on light grounds); some are dark line-art (they vanish on dark). Keep a small allow/deny
  list per background and filter which logos you place on light vs dark. Render a contact sheet
  of all logos on both grounds once and eyeball it.
- **Frame chrome for UI.** Wrap app/website UI in a window or browser frame; it signals intent.
- **Plain-language mode for broad audiences.** For frames aimed at first-time readers, ban
  jargon. Keep a project banned-words list (for a dev tool that might be: "runtime",
  "orchestrate", "primitives", internal codenames) and write so a 12-year-old gets it in two
  seconds. Keep a separate, sharper voice for the investor/expert frames.
- **Sequence the set.** Order frames so a stranger understands the product by frame three and
  remembers the claim by the last one.

- **Inspect the library first; place `data-thumb` deliberately.** Before composing, render a contact
  sheet of the available screenshots/wallpapers so you pick the right source (only chase "use every
  wallpaper" when the user asks). And mark a real square region with `data-thumb` for the 240×240
  export — put it on a logo-lockup or a focal object, not a wide headline strip, or the thumbnail
  crops to an odd tiny square. Always eyeball the actual 240×240 result.

## Grouping and recommendations

Tag each concept with a category (`<meta name="asset-group">`) so the gallery can filter —
e.g. by message pillar (the 2–3 core claims), by kind (static/motion), or by intended use
(gallery / thumbnail / social). When you hand the set over, name your strongest 2–3 and say why,
and flag any placeholder copy or data that must be replaced before launch.
