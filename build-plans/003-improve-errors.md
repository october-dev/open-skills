# 003 — Build the `improve-errors` skill

- **Status**: TODO
- **Deliverable**: `improve-errors/` skill folder (SKILL.md, AUDIT.md, PLAN-TEMPLATE.md), generic
  and open-source ready
- **Read first**: `README.md` in this folder (shared anatomy — follow it exactly), then the
  reference implementation at
  `/Users/harsh/Wega-Labs/october-desktop/.claude/skills/improve-animations/` (all three files).

## What this skill does

Audits how an app FAILS: swallowed exceptions, dead-end error surfaces, missing loading/empty/
offline states, lost user input, optimistic updates with no rollback, errors users see but
developers never learn about. Produces a vetted findings table and self-contained hardening plans.
This is failure-path UX + failure-path engineering in one bar — distinct from a security review
(exploitability) and from `improve-copy` (which rewrites the words; this skill creates the missing
paths the words live in). Read-only; plans to `plans/` (or `error-plans/` if taken).

SKILL.md `description`: "Survey how a codebase fails — swallowed catches, dead-end error messages,
missing loading/empty/offline states, unrecoverable flows — as a senior resilience reviewer, then
produce a prioritized audit and self-contained hardening plans. Use when the user asks to 'improve
error handling', 'audit our failure states', 'make the app more robust', or after an incident."

## Recon phase specifics

- **The async map**: where the app talks to anything that can fail — network calls, child
  processes, file I/O, IPC, DB/third-party SDKs. Group by user-facing flow.
- **The surface inventory**: how errors currently reach users (toast system? inline? dialog?
  console-only?) and how they reach developers (logger? telemetry? nothing?).
- **Criticality map**: failures on the critical path (save, send, pay, load-on-boot) vs. background
  polish. A swallowed catch on save outranks fifty on hover-prefetch.
- **Settled decisions**: intentional fire-and-forget paths documented in comments — respect them.
- Useful sweeps: `catch {}` / `catch (e) {}` (empty), `catch.*console\.` (log-only),
  `\.catch\(` , `void .*\(` (fire-and-forget), `toast.*error`, `alert(`, `finally`,
  `navigator.onLine`, `isLoading|loading`, `retry`, `AbortController`, `Promise.all` (one rejection
  poisons all).

## AUDIT.md — write this rule catalog

Preamble: bar distilled from Nielsen Norman Group error-message research and production resilience
practice. State this attribution.

### 1. Swallowed & invisible errors

- **An empty catch on a user-initiated flow is always HIGH** — the user acted, something failed,
  nothing happened. Every catch must do at least one of: surface to the user, retry, or report to
  telemetry — with a comment when deliberately none (then it's settled, not a finding).
- `catch → console.error` only, on a flow with a UI surface available, is a finding (the user
  stares at a silently broken screen; DevTools is not a surface).
- Unhandled promise rejections: floating promises on user actions (`onClick={() => doAsync()}` with
  no catch anywhere in the chain).
- `Promise.all` where one rejection kills sibling work that could have succeeded →
  `Promise.allSettled` + per-item surfacing.

### 2. Dead-end error surfaces

- Every user-visible error must offer a NEXT STEP: retry button, fix-it link, fallback, or at
  minimum preserved state to try again manually. An error toast that names no action and
  auto-dismisses in 3s is a finding (failures should persist until acknowledged or resolved;
  successes may auto-dismiss).
- `window.alert()`/`confirm()` for errors in an app with a component system is a finding.
- Errors that render as blank/white screens (render-path throw with no error boundary) are HIGH;
  every route/screen-level component tree needs an error boundary with a reset action.

### 3. Recovery: retry, backoff, and preserved input

- Transient failures (network, 5xx, timeouts) get automatic retry with backoff + jitter, capped,
  with the user informed on final failure. Instant-fail on first network blip is a finding; so is
  infinite silent retry (looks frozen).
- **User input survives failure — losing a typed message/form on a failed submit is HIGH.** The
  failed content stays in the composer/form, selected, ready to resend.
- Optimistic updates require rollback + notice on failure; optimistic-with-no-rollback is HIGH
  (UI lies about saved state).
- Idempotency: a retry that can double-submit (payments, sends) without a key/guard is HIGH.

### 4. The four states: loading, empty, error, success

- Every async surface needs all four states DISTINCT. Using the empty state while loading ("No
  results" flashing before data lands) is a finding; so is a spinner with no failure path (fetch
  rejects → spinner forever).
- Slow-path honesty: operations that can exceed ~2s name the work and, past ~10s, offer cancel.
  Every spinner needs a timeout policy (what happens if the promise never settles?).
- Skeletons/spinners that layout-shift the page when content lands — flag toward a layout-stable
  loading state.

### 5. Offline & degraded network

- Fetch-on-action with no offline handling: at minimum detect (`navigator.onLine` + request
  failure) and message ("You're offline — will retry when you reconnect"), queue if the domain
  allows.
- Realtime features (sockets, live sync) must surface the DISCONNECTED state and auto-reconnect
  visibly — a stale-but-confident live view is worse than a labeled-stale one.
- Boot-time resilience: app must reach a usable (possibly degraded) state when its backend is down;
  a login-wall spinner that never resolves is HIGH.

### 6. Errors developers never learn about

- Any error surfaced to users but NOT reported to telemetry/logging is a finding — users see what
  you can't count. Target: one reporting choke-point (wrap the toast/error-surface API) so surfacing
  and reporting can't diverge.
- Reports must carry context: operation, relevant ids, app version — a bare message string is
  half a report. (Respect privacy rules found in recon — no content/PII in reports.)
- `console.log` debris on error paths ships noise; route through the logger the repo already has.

### 7. Failure-path consistency

- One error-surfacing pattern per app: if three flows use toasts, one uses alert(), one sets inline
  text, and one throws to a boundary, that's a consolidation finding (the analog of the missing
  token layer) — plans should introduce/anoint ONE `reportError(userMsg, err, ctx)` helper.
- Error copy consistency belongs to `improve-copy`; note overlaps, don't duplicate findings —
  THIS skill owns whether a surface/path exists, not its wording.

### 8. Missed opportunities

Undo instead of confirm (destructive actions that could be a 10s undo toast); partial-success
reporting on bulk operations ("3 of 5 imported — view failures"); crash-recovery ("restore last
session?"); draft persistence on quit. Report a handful, grounded in flows observed in recon.

### Severity rubric

HIGH = data/input loss, invisible failure on a user action, lying UI (optimistic no-rollback,
stale-live), double-submit risk, boot dead-ends. MEDIUM = dead-end surfaces, missing retry on
transient paths, missing offline messaging, unreported user-visible errors. LOW = consistency
consolidation, slow-path labels, console debris.

## PLAN-TEMPLATE.md delta

The feel-check analog is the **failure-injection check**: every plan names how to reproduce the
failure it fixes — kill the network (DevTools offline), kill the child process, make the endpoint
return 500, throw inside the component — and the observable before/after ("before: spinner forever;
after: 'Couldn't load sessions' + Retry, input preserved"). A hardening plan without a repro recipe
is incomplete.

## Steps

1. Create `improve-errors/` with the three files, structure copied from the reference.
2. Write AUDIT.md from the catalog above (keep hunt-for greps + rubric).
3. Write SKILL.md per shared anatomy; category-focus variants: `swallowed`, `recovery`, `offline`,
   `states` (four-states audit). Note the `improve-copy` boundary (path vs wording) in the posture
   section.
4. Write PLAN-TEMPLATE.md with the failure-injection verification.
5. Genericize: no October/local paths in shipped files.

## Verification

- Structural: three files; hard rules verbatim; no local paths.
- Live test: run bare `improve-errors` against `/Users/harsh/Wega-Labs/october-desktop` — must
  produce recon (async map + surface inventory), a vetted table where every finding cites a
  verbatim catch/fetch/render excerpt, stop for selection, and ≥1 plan containing a concrete
  failure-injection repro. Zero source modifications.
- Sanity test of the bar itself: the audit must NOT flag deliberate fire-and-forget paths that
  carry an explanatory comment (hard rule 5) — check at least one such rejection appears in the
  vetting notes.
