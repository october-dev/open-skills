# Gallery & sharing

`build-gallery.mjs` scans `concepts/` and the exported stills and writes two pages.

## `index.html` — the working gallery (for picking winners)
- A card per concept showing a **live** scaled iframe of the real frame (motion actually runs),
  grouped by `asset-group`, with filters (group, static/motion) and live counts.
- Click a card for a full-screen 1:1 detail view with prev/next (arrow keys) and replay. It sizes
  itself to each frame’s real dimensions, so portrait/social formats aren’t clipped.
- (Optional extension: if you keep per-concept copy/thesis/designer notes in a manifest, surface
  them in the detail panel. The default self-describing setup has no notes panel.)

## `all.html` — the shareable page (for sending externally)
- One flat, scrollable page of **every** frame as a large static image (the exported `out/<slug>.png`
  stills, shown full-aspect so nothing is cropped), ordered as you choose — put the strongest group first.
- Click any frame for a lightbox (full PNG; the GIF for motion) with prev/next, Esc to close.
- Keep it lean: images are `loading="lazy"` so it opens fast. For a very large set (50+), first
  downscale the stills to ~720px-wide JPGs into `share-thumbs/` and point the cards there — the page
  then loads in a few MB instead of tens.
- Keep it clean: no marketing hero copy, minimal chrome — recipients want the images, not a pitch.

## Serving and sharing

Serve the working directory with the static server (`server.mjs`). It binds to **loopback only** by
default, canonicalizes paths (so a symlink can’t escape the directory) and refuses dotfiles. A tunnel
is what makes it public — and it exposes the *entire* working directory, so keep secrets out of it.

Two ways to get it in front of people:
- **Connected browser** — if the environment has a browser you can drive, navigate it to
  `http://localhost:5273/all.html`.
- **Public link** — a Cloudflare quick tunnel gives an instant shareable URL:
  `cloudflared tunnel --url http://localhost:5273 --no-autoupdate`. Parse the printed
  `https://<random>.trycloudflare.com` URL from its output.

**Be honest about the tunnel when you hand it over:** it is public and unauthenticated (anyone with
the link sees the whole working directory, including unreleased positioning), the hostname is random,
and it is development-only with no uptime guarantee. It **becomes unavailable when the host sleeps,
loses its network, or the process stops; a new process normally gets a new URL.** So it’s for quick
review, not hosting. Only create it when the user asks to share. Never tunnel content the user marked
sensitive. For something durable, host the exported files on real static hosting (a named tunnel
still depends on the origin staying up).

Regenerate `all.html` after any change with `node build-gallery.mjs`.
