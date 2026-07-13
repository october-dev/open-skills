# Plan Template

Every plan written by `improve-analytics` follows this structure. The executor may be a less capable model with **zero context** and zero judgment — it has not seen the audit, the confirmed funnel, or this conversation. The plan must contain everything, exactly. No references to "the funnel we agreed on" or "the event name from the audit."

Three properties make a plan executable by a weaker model:

1. **Self-contained context** — every path, code excerpt, event name, property key + type, convention, and command is in the file.
2. **Verification gates** — every step ends with a command and its expected result, and the plan ends with the live-event check. The executor never has to *judge* whether it succeeded.
3. **Hard boundaries and escape hatches** — an explicit out-of-scope list and "STOP and report" conditions instead of improvising when reality doesn't match the plan.

Two domain rules override author convenience:

1. **Extend the central event catalog FIRST, call sites SECOND.** If the repo has a typed catalog / enum, the new event name and property shape are defined there before any emission is added, so every call site inherits one signature. A plan that adds a raw string-literal `track` at a call site without touching the catalog is wrong.
2. **Every plan ends with the live-event check** (below). Analytics can be mechanically present and still be wrong — misnamed, double-firing, or leaking content. The live-event check is not optional; it is this skill's edge.

File naming: `plans/NNN-short-slug.md`, numbered in recommended execution order.

---

## Template

```markdown
# NNN — <Short imperative title: what will be true after this plan>

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. Touch only the files listed as in scope. **Extend the central
> event catalog before any call site.** If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. When done, update the
> status row for this plan in `plans/README.md` — unless a reviewer dispatched
> you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat <planned-at SHA>..HEAD -- <in-scope paths>`
> If any in-scope file changed since this plan was written, compare the
> "Problem" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition (the emit site or wrapper may have moved).

## Status

- **Priority**: P1 | P2 | P3
- **Effort**: S | M | L
- **Risk**: LOW | MED | HIGH
- **Depends on**: plans/NNN-*.md (or "none" — e.g. an identity/reset fix other coverage plans depend on)
- **Category**: funnel | taxonomy | properties | identity | privacy | reliability | dead-dup | opportunity
- **Planned at**: commit `<short SHA>`, <YYYY-MM-DD>
- **Issue**: <GitHub issue URL — only when published via `--issues`; omit otherwise>

## Problem

What is wrong or missing, where, and why it matters to what the team can learn
from the data. Cite every location as `path/to/file.ts:123` and include the
current code verbatim (never a secret or content value — reference the type):

​```ts
// src/features/checkout/pay.ts:88 — current: success branch only, no abandon event
analytics.capture('checkout_completed', { plan_id })
// (the catch branch below emits nothing)
​```

## Target

The exact end state. Every value spelled out — event name, every property key
with its type, the emit site. Never "add a tracking event":

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
imitate:

- The event catalog lives in `<catalog file>` — add the new event name and its
  typed property shape THERE first, then import it at the call site.
- All emission goes through the wrapper `<wrapper file>` (never import the SDK
  directly — the wrapper enforces consent, env-guarding, and PII linting).
- <exemplar `file:line` that already emits an event correctly through the wrapper>
- Any documented taxonomy / privacy constraint the plan must honor, quoted
  inline from the docs found in recon (the executor has NOT read those docs):
  the tracking plan's naming grammar (`object_action`, snake_case, past tense),
  the privacy rule ("no content-bearing values in properties"), the ADR whose
  decision this work must stay consistent with. Quote the specific lines.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `<repo's install cmd>`   | exit 0              |
| Typecheck | `<repo's typecheck cmd>` | exit 0, no errors   |
| Tests     | `<repo's test cmd>`      | all pass            |
| Lint      | `<repo's lint cmd>`      | exit 0              |

(Exact commands from this repo — captured during recon, not guessed. If the
change has no build/test surface, keep only the checks that apply — e.g. a
typecheck on the catalog's types, or a lint.)

## Scope

**In scope** (the only files you should modify):
- `<catalog file>` — add the event + property type
- `<emit site file>` — route the emission through the wrapper

**Out of scope** (do NOT touch, even though they look related):
- `<file>` — <one line why: e.g. "a different funnel's events; renaming here
  would break its live dashboards">
- Any event outside this plan's scope — do not rename or re-grammar them.

## Steps

### Step 1: Add the event to the central catalog

Add `<EVENT_NAME>` and its typed property shape to `<catalog file>` — casing,
tense, and property keys/types exactly as in Target. Do this before any emission.

**Verify**: `<typecheck command>` → exit 0

### Step 2: Emit through the wrapper at the call site

Emit `<EVENT_NAME>` through the wrapper at `<emit site file:line>`, passing
exactly the properties in Target — no content-bearing values.

**Verify**: `<typecheck command>` → exit 0; `grep -n "<EVENT_NAME>" <emit site>` → the emission exists

### Step 3: <remaining edits — one concrete edit per step: file, change, resulting code>

**Verify**: `<command>` → <expected>

## Live-event check (domain verification — required, do not drop)

Analytics can typecheck and still fire twice, land under the wrong name, or
carry a stray email. Mechanical checks can't catch that — this can:

- **Mechanical first**: run the commands above — typecheck / lint / build — all
  green.
- **Live-event check**: run the app in dev, trigger <the exact flow>, and watch
  the provider's live-event view (PostHog Activity / Amplitude live stream /
  Segment debugger — or the wrapper's debug log if configured). Confirm:
  - the event arrives **exactly once** (not zero, not doubled),
  - named **exactly** `<EVENT_NAME>` (casing and tense as specified),
  - carrying **exactly** the specified properties — no more, no fewer,
  - with **NO content-bearing values** — scan every property value for an email,
    name, path, URL, token, or free-text string; there must be none,
  - and that the emission traces to the **central catalog entry**, not a bare
    string literal added at the call site.
  - For a funnel gap: also trigger the abandon / failure branch and confirm its
    event fires with the shared correlating id, so the two steps join.

## Done criteria

Machine- or eye-checkable. ALL must hold:

- [ ] `<typecheck command>` exits 0
- [ ] `<test command>` exits 0 (if the change has a test surface)
- [ ] `<EVENT_NAME>` is defined in `<catalog file>` and imported at the emit site (not a bare string literal)
- [ ] Live-event check passed: event fires once, exact name, exact props, no content-bearing values
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the "Problem" locations doesn't match the excerpts (drift since the commit stamp — the emit site or wrapper likely moved).
- A verification command or the live-event check fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file (e.g. the catalog's typing forces a change to a shared type used elsewhere).
- A named key assumption turns false — e.g. "there is a central catalog to extend" (if there isn't, the plan's catalog-first step needs the advisor to respec it).

## Maintenance notes

For the human/agent who owns this after the change lands:

- What future changes interact with this (e.g. "if a fourth checkout step is added, extend the funnel-step table and share the same `flow_id`").
- What a reviewer should scrutinize: that the emission stayed in the wrapper, that no property drifted to carry content, that the name matches the catalog.
- Any follow-up explicitly deferred out of this plan (and why).
```

---

## Index file: `plans/README.md`

Written once by the advisor after all plans, updated by executors:

```markdown
# Analytics Instrumentation Plans

Generated by improve-analytics on <date>. Execute in the order below unless
dependencies say otherwise. Each executor: read the plan fully before starting,
extend the central catalog before any call site, honor STOP conditions, and
update your row when done.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 001  | ...   | P1       | S      | —          | TODO   |
| 002  | ...   | P1       | M      | 001        | TODO   |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (one-line reason) | REJECTED (one-line rationale — gap fixed independently or approach abandoned)

## Dependency notes

- 002 requires 001 because <reason — e.g. the identity/reset fix must land before coverage events attach to the right user>.

## Findings considered and rejected

- <finding>: not worth doing because <one line — e.g. "the admin route is intentionally uninstrumented per DECISIONS.md">. (So nobody re-audits it.)
```

## Quality bar — check before finishing each plan

- Could a model that has never seen this repo execute this from the plan file and the repo alone? If any step needs knowledge from the advisor session (the confirmed funnel, the naming grammar, a doc's privacy rule), inline it.
- Is every verification a command or a concrete live-view observation, not a judgment ("make sure tracking works")?
- Does every step name exact files, the event name, and the property keys+types — not "add the event"?
- Are the STOP conditions specific to this plan's real risks (drift, out-of-scope type coupling, no catalog to extend), not boilerplate?
- Would a reviewer reading only "Problem" + "Done criteria" understand what they're approving?
- No secret or content-bearing values anywhere in the file — `file:line` + type only.
- "Planned at" SHA is filled in and the drift-check in-scope paths match the Scope section.
- Catalog-first is stated in the Steps so a zero-context executor can't skip it.

## Notes for the plan author

- One plan per finding. If two findings share every file and the same fix pattern (e.g. the same event renamed across several call sites), they may merge into one plan.
- Pull every value from [AUDIT.md](AUDIT.md) — never approximate an event name, property key, or the ~40–80 curated-event band from memory.
- The live-event check is the analog of a UI feel-check: give the executor (or the human reviewing the diff) concrete things to watch in the provider's live view.
