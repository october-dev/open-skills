# 004 — Build the `improve-analytics` skill

- **Status**: TODO
- **Deliverable**: `improve-analytics/` skill folder (SKILL.md, AUDIT.md, PLAN-TEMPLATE.md), generic
  and open-source ready
- **Read first**: `README.md` in this folder (shared anatomy — follow it exactly), then the
  reference implementation at
  `/Users/harsh/Wega-Labs/october-desktop/.claude/skills/improve-animations/` (all three files).

## What this skill does

Audits a product's analytics instrumentation — funnel coverage, event taxonomy, properties,
identity handling, privacy, delivery reliability — as a senior product analyst + instrumentation
engineer, then produces a vetted findings table and self-contained instrumentation plans. The goal:
the team can answer "where do users drop off?" and "who uses feature X?" without guessing. Read-only;
plans to `plans/` (or `analytics-plans/` if taken).

SKILL.md `description`: "Survey a codebase's product analytics — event coverage, funnel integrity,
naming taxonomy, identity, PII, delivery reliability — as a senior product analyst, then produce a
prioritized audit and self-contained instrumentation plans. Use when the user asks to 'improve our
analytics', 'audit our tracking', 'why is our funnel data unreliable', or before a launch."

## The one structural difference from the other improve-* skills

Coverage can't be judged without knowing what the product's critical path IS. So Phase 1 recon MUST
produce a **proposed funnel** (acquisition → signup → activation moment → core action → retention
loop) inferred from routes, onboarding code, pricing/paywall code, and README — and **present it to
the user for confirmation before the audit fans out**. This is the only improve-* skill with a
mid-recon checkpoint. If running non-interactively, proceed with the inferred funnel and label every
coverage finding "against inferred funnel". Bake this into SKILL.md's workflow section explicitly.

## Recon phase specifics

- **Provider + transport**: PostHog/Amplitude/Mixpanel/Segment/GA/custom? Client, server, or both?
  Where is the SDK initialized; is there a wrapper module or do call sites hit the SDK raw?
- **The event inventory**: every `track`/`capture`/`logEvent` call → a table of (event name, props,
  file:line, funnel stage or none). This inventory is the audit's raw material — build it completely.
- **Catalog check**: is there a central typed event catalog/enum, or are names string literals at
  call sites?
- **Identity map**: where `identify`/`alias`/`reset` are called; what happens on login/logout/
  signup.
- **Privacy posture**: consent gating, opt-outs, anonymization, any stated privacy rules in docs —
  these are settled decisions to audit AGAINST, not to re-litigate.
- Useful sweeps: `\.capture\(|\.track\(|logEvent|gtag|analytics\.`, `identify\(`, `reset\(`,
  `posthog|amplitude|mixpanel|segment`, `distinct_id|user_id`, `consent|opt.?out`.

## AUDIT.md — write this rule catalog

Preamble: bar distilled from Segment's analytics naming academy, Amplitude's taxonomy playbook, and
PostHog's instrumentation guidance. State this attribution.

### 1. Funnel integrity (the headline category)

- Every step of the confirmed funnel emits an event, **including the failure/abandon branches**
  (started-but-not-completed is the datum funnels exist for). A funnel with an untracked middle
  step is the single highest-severity finding this skill produces.
- The activation moment (the product's "aha") must be a first-class event, not inferred from
  page views.
- Steps must share a correlating property (flow id / session id) so the funnel can be assembled
  without timestamp archaeology.
- Cross-check both directions: funnel steps with no event (gap), and events claiming funnel names
  that don't actually sit on the path (miscount).

### 2. Taxonomy: one grammar, curated catalog

- **One naming convention, object-first**: `project_created`, `screen_deleted` (snake_case
  object_action, past tense) — or the team's existing dominant grammar; the finding is MIXING
  (`createProject`, `Screen Deleted`, `del_scr` coexisting), and the fix list is the minority set.
- **Curated beats exhaustive: ~40–80 deliberate events is the healthy band.** Hundreds of
  auto-captured/ad-hoc names = a write-only dataset (finding: cull + document); single digits =
  flying blind (finding: instrument the funnel).
- Every event answerable to "what decision does this inform?" — an event nobody would act on is
  noise (candidates for category 7).
- No versioned duplicates left live (`signup_v2` alongside `signup`) without a documented migration.

### 3. Properties carry the analysis

- An event without discriminating properties usually can't answer the question it was added for
  (`feature_used` needs WHICH feature, from WHERE, in what state). Flag context-free events on
  analysis-critical paths.
- Property naming: same convention as events; the same fact spelled the same way everywhere
  (`project_id` vs `projectId` vs `pid` across events is a finding).
- **No unbounded-cardinality property values** (raw error strings, full paths, free text) — they
  explode group-bys; bucket or hash them.
- Booleans/enums over parsed-later strings; amounts as numbers with units in the name
  (`duration_ms`).

### 4. Identity & lifecycle

- `identify` on signup AND login; `reset` on logout (else the next user on the device inherits the
  identity — HIGH). Anonymous→identified stitching (alias/merge per provider semantics) at exactly
  one place in the code.
- Signup event fires AFTER identify (or per provider guidance) so it attaches to the right user.
- Multi-surface products (web + desktop + backend): one shared user id namespace, or the funnel
  fractures per surface.

### 5. Privacy: track behavior, not content

- **Event properties must describe the ACTION, never the CONTENT**: no emails/names in props, no
  message text, no file paths/repo names/URLs with identifiers, no keys. Content-in-props is HIGH
  regardless of provider DPA.
- Consent honored at the choke point, not per call site: if the app has consent/opt-out state, the
  wrapper enforces it (a raw SDK call that bypasses the wrapper is a finding — see category 6).
- Autocapture/session-replay features audited explicitly: they hoover content by default; either
  configured with masking or off.

### 6. Delivery reliability

- **One wrapper module; raw SDK imports at call sites are findings** — the wrapper is where
  consent, typing, PII linting, and environment-guarding live (dev events polluting prod data is a
  classic; assert an env guard exists).
- Critical events near process exit or navigation (quit, checkout-complete, session-end) need
  flush/`sendBeacon`/provider-equivalent — fire-and-forget at quit silently drops the most valuable
  events.
- Client-side blockers: revenue/business-critical events should have a server-side emission or
  proxy path; ad-block-only delivery for the events the business runs on is a finding.
- Analytics failures must never break product flows: track calls on user paths wrapped so a
  provider outage is invisible to users.

### 7. Dead & duplicate instrumentation

- Same action tracked under two names from two call sites (double-counting — HIGH for funnel
  steps); events defined in the catalog but emitted nowhere; events emitted but absent from any
  dashboard/query the team can name (ask; unverifiable = list for the team to triage, don't
  assert).
- Copy-pasted track calls that drifted (same event name, different property sets at different
  sites) — unify via the catalog's typed signature.

### 8. Missed opportunities

Error/failure events (users who HIT errors are your churn-risk cohort — pairs with
`improve-errors` category 6); feature-discovery events (first-ever use per feature); rage signals
where the UI has known friction; performance-experience events (slow-load occurrences) if the team
debates performance blind. A handful, grounded in the confirmed funnel and recon observations.

### Severity rubric

HIGH = funnel gaps/double-counts, identity leaks across users, content/PII in props, critical
events droppable at exit. MEDIUM = taxonomy mixing, context-free events, raw-SDK bypasses, missing
env guards. LOW = property-name drift, dead events, catalog documentation.

## PLAN-TEMPLATE.md delta

The feel-check analog is the **live-event check**: every plan ends with "trigger the flow in dev,
watch the provider's live-event view (or wrapper debug log), and confirm: the event arrives once,
named exactly as specified, with exactly the specified properties and NO content-bearing values."
Coverage plans must include the full funnel-step table (step → event name → props → emit site) so
the executor implements the taxonomy, not their own. Every plan extends the central catalog first,
call sites second.

## Steps

1. Create `improve-analytics/` with the three files, structure copied from the reference.
2. Write AUDIT.md from the catalog above (keep hunt-for greps + rubric).
3. Write SKILL.md per shared anatomy, WITH the funnel-confirmation checkpoint in Phase 1 (this
   skill's signature move — make it prominent). Category-focus variants: `funnel`, `taxonomy`,
   `privacy`, `reliability`.
4. Write PLAN-TEMPLATE.md with the live-event verification.
5. Genericize: no October/local paths, no provider lock-in (rules reference provider-equivalents,
   with PostHog/Amplitude/Segment named as examples).

## Verification

- Structural: three files; hard rules verbatim; funnel checkpoint present in SKILL.md workflow;
  no local paths.
- Live test: run bare `improve-analytics` against `/Users/harsh/Wega-Labs/october-desktop` (real
  PostHog setup: shared event catalog, ~60 curated events, strict no-content privacy rules — a
  GOOD baseline). The skill must (a) infer and present a funnel for confirmation, (b) produce the
  full event inventory in recon, (c) respect the repo's documented privacy rules as settled
  decisions, and (d) — this is the real test — come back with a SHORT list and explicitly say the
  taxonomy/privacy foundation is already right, finding mostly coverage gaps if any. An audit that
  invents 30 findings against a healthy setup fails the calibration test.
- Zero source modifications (`git status` clean).
