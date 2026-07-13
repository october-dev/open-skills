# Error Handling Audit Playbook

The eight audit categories, what to look for in each, and the exact bar to hold when citing findings and writing plans. The bar is distilled from Nielsen Norman Group error-message research (errors must be visible, human-readable, and offer a way forward) and production resilience practice (retry with backoff, idempotency, one reporting choke-point, graceful degradation). Never soften a rule that appears here — cite it as written.

Every finding cites `file:line` with a verbatim excerpt (the catch body, the fetch call, the render path). A finding you can't ground in an exact line does not go in the table.

## 1. Swallowed & invisible errors

The user acted, something failed, and nothing happened. The most common and most damaging failure class.

- **An empty catch on a user-initiated flow is always HIGH.** Every catch must do at least one of: surface to the user, retry, or report to telemetry. A catch that does none — with no comment explaining a deliberate swallow — is a finding. (With an explanatory comment it's settled, not a finding — Hard Rule 5.)
- **`catch → console.error` only, on a flow with a UI surface available, is a finding.** The user stares at a silently broken screen; DevTools is not a surface. Log-only is acceptable only on paths with genuinely no user-facing consequence.
- **Unhandled promise rejections**: floating promises on user actions (`onClick={() => doAsync()}` with no `.catch` anywhere in the chain, no surrounding `try/await`). The rejection vanishes into the console (or nowhere).
- **`Promise.all` where one rejection kills sibling work that could have succeeded** → `Promise.allSettled` + per-item surfacing. One failed item in a batch should not discard the successes.

Hunt for: `catch {}`, `catch (e) {}`, `catch (err) {}` with an empty or console-only body, `\.catch\(` chains ending in nothing, `onClick={() => …async…}` with no catch, `Promise.all(` on independent work, `void someAsync()`.

## 2. Dead-end error surfaces

An error reached the user — but it names no way forward.

- **Every user-visible error must offer a NEXT STEP**: a retry button, a fix-it link, a fallback, or at minimum preserved state to try again manually. An error toast that names no action and auto-dismisses in ~3s is a finding. **Failures should persist until acknowledged or resolved; successes may auto-dismiss.**
- **`window.alert()` / `confirm()` for errors in an app with a component system is a finding.** It blocks the thread, can't be styled, and reads as broken.
- **Errors that render as a blank/white screen** (a render-path throw with no error boundary) are HIGH. Every route or screen-level component tree needs an error boundary with a reset action ("Something went wrong — Reload"), so one throw doesn't nuke the whole app.

Hunt for: `alert(`, `confirm(`, toast/snackbar calls with an `autoClose`/`duration` on the error path, error toasts whose body is a bare string with no action prop, route components with no surrounding error boundary, top-level render with no boundary.

## 3. Recovery: retry, backoff, and preserved input

Transient failures are normal; the app should ride them out and never lose what the user typed.

- **Transient failures (network blips, 5xx, timeouts) get automatic retry with backoff + jitter, capped, with the user informed on final failure.** Instant-fail on the first network blip is a finding. So is infinite silent retry — it looks frozen and hammers the backend. Cap the attempts; on the final failure, surface a real message with a manual retry.
- **User input survives failure — losing a typed message or form on a failed submit is HIGH.** The failed content stays in the composer or form, ready to resend. Clearing the input before the request confirms success is the classic version of this bug.
- **Optimistic updates require rollback + notice on failure.** Optimistic-with-no-rollback is HIGH: the UI shows the change as saved when it wasn't — the UI lies about persisted state.
- **Idempotency**: a retry that can double-submit (payments, sends, create-order) without a key or guard is HIGH. Automatic retry without idempotency turns one failure into two charges.

Hunt for: `fetch`/`axios` with no retry wrapper on transient paths, retry loops with no cap or no backoff, `setState('')` / form reset before the awaited call resolves, optimistic state updates with no `catch` that reverts, POST/mutation retries with no idempotency key.

## 4. The four states: loading, empty, error, success

Every async surface owes the user four distinct states — and most ship two.

- **Every async surface needs all four states DISTINCT.** Using the empty state while loading ("No results" flashing before the data lands) is a finding. So is a spinner with no failure path — the fetch rejects and the spinner spins forever.
- **Every spinner needs a timeout policy**: what happens if the promise never settles? A spinner that can hang indefinitely is a finding.
- **Slow-path honesty**: operations that can exceed ~2s should name the work ("Cloning repository…"), and past ~10s offer a cancel. A long operation with a bare spinner and no way out is a finding.
- **Layout stability**: skeletons/spinners that layout-shift the page when content lands are a finding — flag toward a layout-stable loading state that reserves the content's space.

Hunt for: components with `isLoading`/`loading` but no error branch, ternaries that fall through to the empty state during load, `useEffect` fetches with no error state, spinners with no `AbortController` or timeout, conditional renders that jump size when data arrives.

## 5. Offline & degraded network

The network will be down or flaky; the app should say so and cope.

- **Fetch-on-action with no offline handling**: at minimum detect (`navigator.onLine` + the request failure) and message ("You're offline — will retry when you reconnect"). Queue the action if the domain allows it.
- **Realtime features (sockets, live sync) must surface the DISCONNECTED state and auto-reconnect visibly.** A stale-but-confident live view is worse than a labeled-stale one — the user trusts data that stopped updating.
- **Boot-time resilience**: the app must reach a usable (possibly degraded) state when its backend is down. A login-wall spinner that never resolves because auth couldn't be reached is HIGH — the whole app is a dead-end.

Hunt for: `fetch`/socket calls with no offline branch, `navigator.onLine` never referenced anywhere, socket clients with no `onclose`/`ondisconnect` UI, reconnect logic that's silent, app-boot data loads with no fallback when they reject.

## 6. Errors developers never learn about

Users see what you can't count.

- **Any error surfaced to users but NOT reported to telemetry/logging is a finding.** If the toast fires but nothing reaches your error tracker, you're blind to a failure your users are living. Target: one reporting choke-point — wrap the toast/error-surface API — so surfacing and reporting can't diverge.
- **Reports must carry context**: operation, relevant ids, app version. A bare message string is half a report. (Respect privacy rules found in recon — no user content or PII in reports.)
- **`console.log` debris on error paths** ships noise and leaks intent; route through the logger the repo already has.

Hunt for: error toasts/surfaces with no adjacent telemetry call, a telemetry/logger util that error paths bypass, `console.log`/`console.error` on catch paths, report calls that pass only `err.message` with no operation/id/version context.

## 7. Failure-path consistency

The token-layer analog: one way to fail, not five.

- **One error-surfacing pattern per app.** If three flows use toasts, one uses `alert()`, one sets inline text, and one throws to a boundary, that's a consolidation finding. Plans should introduce or anoint ONE helper — `reportError(userMsg, err, ctx)` — that surfaces to the user AND reports to telemetry in one call, and route flows through it.
- **Error copy consistency belongs to `improve-copy`.** Note overlaps, don't duplicate findings — THIS skill owns whether a surface or path exists, not its wording.

Hunt for: a mix of `alert`, `toast`, inline `setError`, and thrown-to-boundary across sibling flows; duplicated near-identical try/catch/report blocks that a single helper would replace.

## 8. Missed opportunities

The additive category — resilience the app doesn't have but should. Report a handful, grounded in flows you actually observed in recon, not a wishlist:

- **Undo instead of confirm**: a destructive action fronted by a confirm dialog that could be a 10s undo toast ("Deleted — Undo") — lower friction, safer.
- **Partial-success reporting on bulk operations**: "3 of 5 imported — view failures", instead of an all-or-nothing result that hides which items failed.
- **Crash recovery**: "Restore last session?" after an unexpected quit, when the app already holds enough state to offer it.
- **Draft persistence on quit**: unsaved composer/form content preserved across an accidental close or reload.

## Severity rubric

Anchor every finding to this rubric.

- **HIGH** — data or input loss; invisible failure on a user action (empty catch on a user-initiated flow); lying UI (optimistic with no rollback, stale-but-confident live view); double-submit risk (retry without idempotency on payments/sends); boot dead-ends (login-wall spinner that never resolves).
- **MEDIUM** — dead-end surfaces (error with no next step, `alert()` for errors); missing retry on transient paths; missing offline messaging; user-visible errors that reach no telemetry.
- **LOW** — consistency consolidation (multiple surfacing patterns); slow-path labels and cancel affordances; console debris on error paths.

## Finding format

Every finding, from every category and every subagent, comes back in this shape:

```markdown
### [CATEGORY-NN] Short imperative title

- **Evidence**: `path/file.ts:123` — one-line description with the verbatim catch/fetch/render excerpt of what's there. (Repeat per location; 2–5 strongest locations, note "and ~N similar sites" if the pattern is widespread.)
- **Impact**: What the user experiences when it fails / what's being paid. Concrete: "a failed save shows nothing — the spinner spins forever and the typed note is lost", not "poor error handling".
- **Severity**: HIGH / MEDIUM / LOW, anchored to the severity rubric above.
- **Effort**: S (hours) / M (a day-ish) / L (multi-day) — for the *fix*, including the failure-reproducing test.
- **Risk**: What the fix could break; LOW/MED/HIGH plus one line why (e.g. "adding rollback touches optimistic-update code shared by three views").
- **Confidence**: HIGH (read the code, certain it's an accidental swallow) / MED (strong signal, but can't tell from code alone if it's deliberate fire-and-forget) / LOW (smell, needs investigation). A LOW-confidence finding may be reported but gets an "investigate" plan, not a "fix" plan — and when you can't tell deliberate from accidental, put that question in the finding rather than guessing.
- **Secrets note** (only if relevant): if the failure path logs or hardcodes a credential or writes PII into a report, cite the `file:line` and the credential/PII **type** only, never the value; recommend rotation for a real secret (Hard Rule 6).
- **Fix sketch**: 1–3 sentences pulled from this playbook's rule (the catch body, the retry shape, the boundary) — enough to judge effort honestly, not the plan.
```

## Prioritization rubric

Order findings by **leverage = impact ÷ effort, discounted by confidence and fix-risk**. Tiebreakers:

1. Anything that unblocks other findings floats up — a shared `reportError` helper (one surface + telemetry choke-point) precedes the plans that route through it; a verification baseline precedes any risky hardening.
2. Higher-severity + higher-confidence findings float above equivalent-leverage ones — an invisible failure on a save path outranks a console-debris cleanup at the same effort.
3. Prefer findings whose fix has a clean failure-injection story (a repro you can name and watch recover) — executor models succeed at those.
4. "This failure path is already handled" and "not worth doing" are valid verdicts. Record each with one line in the index's "Findings considered and rejected" section, so the user knows it was considered and it isn't re-audited next run.
