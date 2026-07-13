# Plan Template

Every plan written by `improve-analytics` follows this structure. The executor may be a less capable model with zero context and zero judgment — the plan must contain everything, exactly. No references to "the funnel we agreed on" or "the event name from the audit."

Two rules override author convenience:

1. **Extend the central event catalog FIRST, call sites SECOND.** If the repo has a typed catalog / enum, the new event name and property shape are defined there before any emission is added, so every call site inherits one signature. A plan that adds a raw string-literal `track` at a call site without touching the catalog is wrong.
2. **Every plan ends with the live-event check** (below). Analytics can be mechanically present and still be wrong — misnamed, double-firing, or leaking content. The live-event check is not optional.

```markdown
# NNN — <Short imperative title>

- **Status**: TODO
- **Commit**: <output of `git rev-parse --short HEAD` when this plan was written>
- **Severity**: HIGH | MEDIUM | LOW
- **Category**: <audit category>
- **Estimated scope**: <n files, rough size>

## Problem

What is wrong or missing, where, and why it matters to what the team can learn
from the data. Cite every location as `path/to/file.ts:123` and include the
current code verbatim:

​```ts
// src/features/checkout/pay.ts:88 — current: success branch only, no abandon event
analytics.capture('checkout_completed', { plan_id })
// (the catch branch below emits nothing)
​```

## Target

The exact end state. Every value spelled out — event name, every property key
with its type, the emit site, and for coverage findings the full funnel-step
table. Never "add a tracking event":

​```ts
// target — abandon branch instrumented, correlating id shared with the step
analytics.capture('checkout_abandoned', {
  plan_id: string,        // enum of plan slugs, never the display name
  flow_id: string,        // same id emitted by checkout_started — links the steps
  step: 'payment',        // enum: 'plan' | 'payment' | 'confirm'
  reason: string,         // enum: 'card_declined' | 'user_cancelled' | 'timeout'
})
​```

### Funnel-step table (coverage plans only)

For any plan that closes a funnel gap, spell out the whole path so the executor
implements the confirmed taxonomy, not their own:

| Funnel step | Event name | Required properties | Emit site |
| --- | --- | --- | --- |
| Checkout started | `checkout_started` | `flow_id`, `plan_id` | `pay.ts` on mount |
| Payment submitted | `checkout_completed` | `flow_id`, `plan_id`, `amount_usd` | `pay.ts` success branch |
| Payment abandoned | `checkout_abandoned` | `flow_id`, `plan_id`, `step`, `reason` | `pay.ts` catch branch |

## Repo conventions to follow

How this codebase already does analytics, with one exemplar the executor should
imitate (catalog location, wrapper module, property patterns):

- The event catalog lives in `src/analytics/events.ts` — add the new event name
  and its typed property shape THERE first, then import it at the call site.
- All emission goes through the wrapper `src/analytics/track.ts` (never import
  the SDK directly — the wrapper enforces consent, env-guarding, and PII linting).
- <exemplar file:line that already emits an event correctly through the wrapper>

## Steps

1. Add `<EVENT_NAME>` and its property type to the central catalog at `<catalog file>`.
2. Emit it through the wrapper at `<emit site file:line>`, passing exactly the
   properties in the Target — no content-bearing values.
3. <One concrete edit per remaining step: file, what changes, resulting code.>

## Boundaries

- Do NOT emit the SDK directly — go through the wrapper module named above.
- Do NOT put any content in properties: no emails, names, message text, file
  paths, URLs with identifiers, or keys. Actions only.
- Do NOT rename or touch events outside this plan's scope.
- Do NOT add new dependencies.
- If a step doesn't match the code you find (drift since the commit stamp), STOP
  and report instead of improvising.

## Verification

- **Mechanical**: <exact commands — typecheck, lint, build — with expected outcome>.
- **Live-event check**: run the app in dev, trigger <the exact flow>, and watch
  the provider's live-event view (PostHog Activity / Amplitude live stream /
  Segment debugger — or the wrapper's debug log if configured). Confirm:
  - the event arrives **exactly once** (not zero, not doubled),
  - named **exactly** `<EVENT_NAME>` (casing and tense as specified),
  - carrying **exactly** the specified properties — no more, no fewer,
  - with **NO content-bearing values** (scan every property value for an email,
    name, path, URL, or free-text string; there must be none).
  - For a funnel gap: also trigger the abandon / failure branch and confirm its
    event fires with the shared correlating id, so the two steps join.
- **Done when**: <machine- or eye-checkable completion criteria>.
```

## Notes for the plan author

- One plan per finding. If two findings share every file and the same fix pattern (e.g. the same event renamed across several call sites), they may merge into one plan.
- Pull every value from [AUDIT.md](AUDIT.md) — never approximate an event name, property key, or the ~40–80 curated-event band from memory.
- The live-event check is the analog of a UI feel-check: an event can typecheck and still fire twice, carry a stray email, or land under the wrong name. Give the executor (or the human reviewing the diff) concrete things to watch in the provider's live view.
- Catalog first, call sites second — restate this in the Steps so a zero-context executor can't skip it.
- After writing plans, create or update `plans/README.md` with: a table of plans (number, title, severity, status), the recommended execution order, and any dependencies between plans (e.g. an identity-fix plan that other coverage plans depend on).
