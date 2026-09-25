# Platform specs

Verify current requirements from the platform's own docs before you size anything — these
change. The values below were correct as of the last build and are a strong default. Primary sources: [PH launch guide](https://www.producthunt.com/launch/preparing-for-launch), [PH posting help](https://help.producthunt.com/en/articles/479557-how-to-post-a-product). PH’s own pages confirm 1270×760, the two-image minimum, 240×240 thumbnails, the <3 MB thumbnail + hover behavior, the 60-char tagline, and non-private YouTube links; they do **not** establish an 8-image maximum or a mandatory 10% inset — treat those as curation/layout advice.

## Product Hunt

| Asset | Size | Rules |
| --- | --- | --- |
| Gallery image | **1270 × 760** px (≈1.67:1) | PNG or GIF. Minimum **2** (verified). *Recommendations:* a handful (≈8) reads better than many; keep UI ~10% off the edges — neither is a hard PH limit. |
| Thumbnail | **240 × 240** px, square | Under **3 MB**. GIFs animate on **hover only**, so frame 1 must stand alone. |
| File size | Thumbnail **< 3 MB** (verified) | PH states 3 MB on the **thumbnail**; treat a 3 MB budget for gallery GIFs as a conservative house rule, not a verified gallery limit. |
| Tagline | **60** characters | Short, plain, no gimmicks — it drives the click. |
| Description | **260** characters | The help centre cites 260 in places, the launch guide 500; write to 260 and it works everywhere. |
| Video | YouTube URL only | Not shortened, not private. ~half of Product-of-the-Day winners include one. |

What strong launches do (worth encoding into the set):
- **Lead with the product, not the logo.** Slide 1 answers "what does this do?" in two seconds — a real UI doing the real thing. Many top launches hold their logo until slide 3–4.
- **Motion beats stills for anything stateful** — workflows, handoffs, state changes.
- **One callout per image.** More than one annotation dilutes focus at scroll speed.
- **Frame web UI** in a browser/window chrome; raw full-bleed UI reads as a screenshot dump.
- **Sequence deliberately**: an opening image aimed at the audience, then images that walk the workflow in order.
- **Avoid the near-duplicate trap** — the most common failure is the same screen at different zoom levels. Every frame needs a distinct thesis.

## Social / open graph

| Asset | Size |
| --- | --- |
| OG / X card | **1200 × 630** |
| X (in-stream) | 1600 × 900 |
| Instagram portrait | 1080 × 1350 |
| Instagram square | 1080 × 1080 |
| LinkedIn | 1200 × 627 |

## App stores (screenshots)

Refresh against the live tables before submitting — Apple groups sizes by display class and forbids
alpha channels; Google allows 320–3840 px sides with aspect rules.
[Apple screenshot specs](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) ·
[Google Play preview assets](https://support.google.com/googleplay/android-developer/answer/9866151).

| Store | Accepted size (portrait) |
| --- | --- |
| iOS large phone (6.5"–6.9") | 1290 × 2796 or 1242 × 2688 (both accepted; no alpha) |
| Android phone | 1080 × 1920 (min 320 / max 3840 per side) |

Set the `.stage` to whichever size you're targeting. The export pipeline reads the stage size
from the page, so mixing sizes across concepts is fine — the still is always pixel-exact.
