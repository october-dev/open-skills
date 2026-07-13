# Plan Template

Every plan written by `improve-copy` follows this structure. The executor may be a less capable model with zero context and zero taste — the plan must contain everything, exactly. No references to "the audit above" or "the tone we discussed." Every finding's plan MUST contain the exact replacement string (never "make it friendlier") and must preserve any i18n key and interpolation slot verbatim.

```markdown
# NNN — <Short imperative title>

- **Status**: TODO
- **Commit**: <output of `git rev-parse --short HEAD` when this plan was written>
- **Severity**: HIGH | MEDIUM | LOW
- **Category**: <audit category>
- **Estimated scope**: <n files, rough size>

## Problem

What is wrong, where, and why it matters to how the product reads. Cite every
location as `path/to/file.tsx:123` and include the current string verbatim:

​```tsx
// src/components/save-bar.tsx:42 — current
<Toast>Something went wrong</Toast>
​```

## Target

The exact end state — the replacement string spelled out in full, not a
direction. Never "make it clearer":

​```tsx
// target
<Toast>Couldn't save your changes — you're offline. They'll retry when you reconnect.</Toast>
​```

For i18n, preserve the key and every interpolation slot exactly:

​```json
// src/locales/en.json — current → target (key unchanged, {count} slot preserved)
"screens.empty": "No results"
"screens.empty": "No screens yet — press ⌘N to create one"
"screens.deleteConfirm": "Delete {count} screens?"   // slot {count} kept verbatim
​```

## Repo conventions to follow

How this codebase already writes copy, with one exemplar the executor should
imitate (casing convention, terminology, person, where strings live):

- Casing: sentence case for buttons and headers; the terminology map calls this object a "<term>", never "<drifted synonym>".
- Strings live in `src/locales/en.json` under dotted keys — add or edit the value only, never rename the key.
- <exemplar file:line whose copy is already right>

## Steps

1. <One concrete edit per step: file, the exact current string, the exact replacement string.>
2. …

## Boundaries

- Do NOT touch <files/components out of scope>.
- Do NOT rename i18n keys or alter interpolation slots — change the string value only.
- Do NOT change markup/structure or component logic — copy only (unless a step says otherwise).
- Do NOT add new dependencies.
- If a step doesn't match the code you find (drift since the commit stamp), STOP and report instead of improvising.

## Verification

- **Mechanical**: <exact commands — typecheck, lint, i18n key-completeness check — with expected outcome>. Confirm no i18n key was added or removed and every interpolation slot survives.
- **Read-aloud check**: read the new copy out loud in its UI context. It should sound like a competent human explaining what happened and what to do next, not a system reporting an event. Paste a before/after table so a human can skim every changed string:

  | Location | Before | After |
  | --- | --- | --- |
  | <file:line> | <old string> | <new string> |

- **Done when**: every cited string is replaced, keys/slots are intact, and the before/after table reads cleanly aloud.
```

## Notes for the plan author

- One plan per finding. If two findings share every file and the same fix pattern (e.g. one casing convention applied across a menu), they may merge into one plan.
- Pull every rule and target shape from [AUDIT.md](AUDIT.md) — never approximate from memory. Every replacement string must be written out in full.
- The read-aloud check is not optional. Copy can be mechanically correct — right length, no filler — and still read like a robot; give the executor (or the human reviewing the diff) the before/after table to catch it.
- After writing plans, create or update `plans/README.md` with: a table of plans (number, title, severity, status), the recommended execution order, and any dependencies between plans.
