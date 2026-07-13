# Analytics Audit Playbook

The eight audit categories, what to look for in each, and the exact target values to cite in findings and plans. The bar is distilled from **Segment's analytics naming academy**, **Amplitude's taxonomy playbook**, and **PostHog's instrumentation guidance** — the three practitioner references this catalog compresses. Never approximate a value that appears here — copy it.

This catalog is provider-agnostic. Where a mechanism has a provider-specific name (live-event view, autocapture, session replay, `identify` / `alias` / `reset`), the rule names PostHog / Amplitude / Segment as *examples* — apply the provider-equivalent for whatever SDK the codebase actually uses.

## 1. Funnel integrity (the headline category)

This is measured against the **confirmed funnel** from Phase 1b (acquisition → signup → activation → core action → retention). A funnel with an untracked middle step is the single highest-severity finding this skill produces — you cannot see a drop-off you never instrumented.

- **Every step of the confirmed funnel emits an event, including the failure / abandon branches.** Started-but-not-completed is the datum funnels exist for; tracking only the success branch means the denominator is invisible.
- **The activation moment (the product's "aha") must be a first-class event**, not inferred from page views. If activation is only reconstructable by joining pageviews after the fact, that's a HIGH finding.
- **Steps must share a correlating property** (flow id / session id) so the funnel can be assembled without timestamp archaeology.
- **Cross-check both directions:** funnel steps with no event (a *gap*), and events claiming funnel names that don't actually sit on the path (a *miscount* — an event named `checkout_completed` fired from a place that isn't the real completion).

Hunt for: funnel steps identified in Phase 1b with no matching row in the event inventory; success-only tracking on multi-step flows (search the flow's error / catch branches for a track call and note its absence); activation reconstructed from `$pageview` / screen-view events; steps that emit events with no shared id linking them.

## 2. Taxonomy: one grammar, curated catalog

- **One naming convention, object-first.** The healthy shape is `object_action`, snake_case, past tense: `project_created`, `screen_deleted`. If the team already has a dominant grammar, adopt *theirs*. The finding is **MIXING** — `createProject`, `Screen Deleted`, and `del_scr` coexisting in one dataset — and the fix list is the *minority* set that should be renamed to match the majority, never a wholesale re-grammar.
- **Curated beats exhaustive: ~40–80 deliberate events is the healthy band.**
  - *Hundreds* of auto-captured / ad-hoc names → a write-only dataset nobody queries (finding: cull + document).
  - *Single digits* → flying blind (finding: instrument the confirmed funnel).
  - Landing inside ~40–80 is a sign of health — say so rather than manufacturing work.
- **Every event answerable to "what decision does this inform?"** An event nobody would ever act on is noise (route it to category 7).
- **No versioned duplicates left live** — `signup_v2` alongside `signup` — without a documented migration plan.

Hunt for: `\.capture\(|\.track\(|logEvent` with string-literal names, then diff their casing / tense; count total distinct event names against the ~40–80 band; grep for `_v2|_v3|_new|_old|_temp` in event names; auto-capture / autocapture enabled alongside hundreds of implicit event names.

## 3. Properties carry the analysis

- **An event without discriminating properties usually can't answer the question it was added for.** `feature_used` needs WHICH feature, from WHERE, in what state. Flag context-free events **on analysis-critical paths** (don't nitpick a genuinely atomic event).
- **Property naming follows the same convention as events** — snake_case, object-first — and the same fact is spelled the same way everywhere. `project_id` vs `projectId` vs `pid` across events is a finding.
- **No unbounded-cardinality property values.** Raw error strings, full file paths, free-text input, unbucketed timestamps — they explode group-bys and make a property useless for segmentation. Bucket (`duration_bucket: "1-5s"`), hash, or enum them instead.
- **Booleans / enums over parsed-later strings.** Amounts as numbers with the unit in the name: `duration_ms`, `price_usd`, `count` — never a stringified `"1.2s"`.

Hunt for: generic event names (`click`, `action`, `event`, `feature_used`) with a thin or empty props object; the same conceptual id under multiple spellings across call sites; `error.message`, `err.toString()`, `path`, `url`, or raw user input passed straight into a property; numeric facts stored as strings.

## 4. Identity & lifecycle

- **`identify` on signup AND login; `reset` on logout.** A missing `reset` means the next user on a shared device inherits the previous user's identity — **HIGH**. Anonymous→identified stitching (alias / merge, per provider semantics) must happen at exactly ONE place in the code, not scattered.
- **The signup event fires AFTER `identify`** (or per the provider's documented ordering) so it attaches to the right user rather than a soon-to-be-merged anonymous id.
- **Multi-surface products** (web + desktop + mobile + backend) share **one user-id namespace.** If web uses one id scheme and the backend another, the funnel fractures per surface and cross-device journeys are unjoinable.

Hunt for: `identify\(` with no matching `reset\(` on the logout path; `reset` called in more than one place or in none; `alias` / merge logic duplicated across files; signup-event emission that precedes `identify`; different id sources (`user.id` vs `session.token` vs `device_id`) feeding `distinct_id` on different surfaces.

## 5. Privacy: track behavior, not content

- **Event properties must describe the ACTION, never the CONTENT.** No emails / names in props, no message text, no file paths / repo names / URLs carrying identifiers, no keys or tokens. Content-in-props is **HIGH** regardless of any provider DPA — the DPA governs the provider, not everyone with dashboard access.
- **Consent honored at the choke point, not per call site.** If the app has consent / opt-out state, the wrapper module enforces it once. A raw SDK call that bypasses the wrapper also bypasses consent (this ties to category 6).
- **Autocapture / session-replay features audited explicitly.** These hoover content by default — form values, input text, on-screen PII. Either they're configured with masking (input masking, blocked selectors, URL scrubbing) or they're off. An unconfigured session-replay / autocapture toggle is a finding.

Hunt for: `email`, `name`, `title`, `content`, `message`, `text`, `path`, `url`, `token`, `key` as property *keys or values*; user-typed variables interpolated into props; `capture` / `track` calls that import the SDK directly rather than the wrapper; `session_recording`, `autocapture`, `record_masking`, `maskAllInputs` config with defaults left on.

## 6. Delivery reliability

- **One wrapper module; raw SDK imports at call sites are findings.** The wrapper is where consent enforcement, typing, PII linting, and environment-guarding live. Assert an **env guard** exists — dev / test events polluting prod data is a classic silent corruption. A call site importing the SDK directly skips all of that.
- **Critical events near process exit or navigation** (app quit, checkout-complete-then-redirect, session-end) need an explicit flush / `sendBeacon` / provider-equivalent. Fire-and-forget at quit silently drops the *most valuable* events — the ones that fire exactly when the page is tearing down.
- **Client-side blockers:** revenue / business-critical events should have a server-side emission or proxy path. Ad-block-only delivery for the events the business actually runs on is a finding (a meaningful share of users block client analytics).
- **Analytics failures must never break product flows.** A `track` call on a user path must be wrapped so a provider outage / thrown SDK error is invisible to the user — never an unguarded `await analytics.capture(...)` that can reject and break the flow.

Hunt for: SDK imports (`posthog`, `amplitude`, `mixpanel`, `@segment`) at call sites instead of a local wrapper; absence of a `NODE_ENV` / `import.meta.env` guard around emission; quit / `beforeunload` / redirect handlers that emit without flush or `sendBeacon`; revenue events (`purchase`, `subscription_started`, `payment_succeeded`) with only client-side emission; `await` on a track call in a user-facing code path with no try/catch.

## 7. Dead & duplicate instrumentation

- **Same action tracked under two names from two call sites → double-counting** (HIGH when it's a funnel step, because it inflates the very number the funnel reports).
- **Events defined in the catalog but emitted nowhere** — dead entries (LOW; cull + document).
- **Events emitted but absent from any dashboard / query the team can name.** This is often *unverifiable from code alone* — ask the team; if unverifiable, list it for them to triage, **don't assert it's dead.**
- **Copy-pasted track calls that drifted:** same event name, different property sets at different sites. Unify via the catalog's single typed signature so every emission of an event carries the same shape.

Hunt for: two distinct event names describing one user action across the inventory; catalog / enum entries with zero call-site references; identical event names with mismatched property keys across files; grep each catalog constant and note the ones with no emission.

## 8. Missed opportunities

The additive category — instrumentation that isn't there but should be, grounded in the confirmed funnel and what you actually observed in recon. Report at most a handful.

- **Error / failure events** — users who HIT errors are your churn-risk cohort. (Pairs with `improve-errors` category 6.) If the app has visible failure states with no event, the team can't size the pain.
- **Feature-discovery events** — first-ever use per feature, so adoption of new surfaces is measurable rather than anecdotal.
- **Rage signals** — where the UI has known friction (rapid repeated clicks, repeated failed submits), a signal event turns "users complain it's clunky" into a number.
- **Performance-experience events** — slow-load / timeout occurrences, if the team debates performance blind.

Report only seams you actually saw, tied to the confirmed funnel — not a wishlist of every event a product could theoretically emit.

## Severity rubric

| Severity | What qualifies |
| --- | --- |
| **HIGH** | Funnel gaps / double-counts; identity leaks across users (missing `reset`); content or PII in properties; critical events droppable at process exit |
| **MEDIUM** | Taxonomy mixing; context-free events on analysis-critical paths; raw-SDK bypasses of the wrapper; missing env guards |
| **LOW** | Property-name drift; dead / unreferenced events; catalog documentation gaps |

## Finding format

Every finding, from every category and every subagent, comes back in this shape. Severity (above) is the domain axis; Effort / Risk / Confidence make the finding actionable and rankable:

```markdown
### [CATEGORY-NN] Short imperative title

- **Evidence**: `path/file.ts:123` — one-sentence description of what's there. (Repeat per location; 2–5 strongest locations, note "and ~N similar sites" if widespread.) Cite the location and the credential / PII TYPE, never a secret or content value.
- **Severity**: HIGH | MEDIUM | LOW (per the rubric above).
- **Impact**: What the team can't learn, or what's being paid, because of this. Concrete: "the payment-abandon step emits nothing, so the checkout funnel's denominator is invisible" — not "tracking could be better".
- **Effort**: S (hours) / M (a day-ish) / L (multi-day) — for the *fix*, including its live-event verification.
- **Risk**: What the fix could break; LOW/MED/HIGH plus one line why (e.g. renaming a live event breaks existing dashboards until they're repointed).
- **Confidence**: HIGH (read the code, certain) / MED (strong signal, needs verification — e.g. whether an event reaches a dashboard the team uses) / LOW (a smell, needs investigation). LOW-confidence findings may be reported but get an "investigate" plan, not a "fix" plan.
- **Fix sketch**: 1–3 sentences. Not the plan — just enough to judge effort honestly (catalog entry to add, wrapper call to route through, branch to instrument).
```

## Prioritization rubric

Order findings by **leverage = impact ÷ effort, discounted by confidence and fix-risk**. Tiebreakers:

1. Anything that **unblocks** other findings floats up — an identity / `reset` fix or a wrapper-consolidation that later coverage plans depend on, or "establish a verification baseline" when there's no typecheck/test path.
2. A HIGH-severity, HIGH-confidence data-integrity finding (a funnel gap, a double-count, PII in props) floats above an equivalent-leverage cosmetic one.
3. Prefer findings whose fix has a clean **live-event verification story** — an event you can trigger in dev and watch arrive is one an executor can prove done; an unverifiable "is this dashboard used?" finding ranks lower and often belongs on the team's triage list, not a plan.
4. "Not worth doing" is a valid verdict — a healthy `~40–80`-event catalog with a documented no-content privacy rule should come back with a SHORT list. Record each rejection with one line of reasoning so it isn't re-audited next run.
