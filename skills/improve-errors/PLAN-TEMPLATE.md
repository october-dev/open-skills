# Plan Template

Every plan written by `improve-errors` follows this structure. The executor may be a less capable model with zero context and zero taste — the plan must contain everything, exactly. No references to "the failure above" or "the retry policy we discussed."

```markdown
# NNN — <Short imperative title>

- **Status**: TODO
- **Commit**: <output of `git rev-parse --short HEAD` when this plan was written>
- **Severity**: HIGH | MEDIUM | LOW
- **Category**: <audit category>
- **Estimated scope**: <n files, rough size>

## Problem

What fails, where, and what the user experiences when it does. Cite every
location as `path/to/file.ts:123` and include the current code verbatim:

​```ts
// src/features/sessions/list.ts:42 — current
try {
  const rows = await api.loadSessions()
  setSessions(rows)
} catch {}          // fetch rejects → spinner spins forever, user sees nothing
​```

## Target

The exact end state. Every value spelled out — the catch body, the user
message, the retry policy (attempts, backoff, jitter), the reset action.
Never "handle the error gracefully":

​```ts
// target
try {
  const rows = await withRetry(() => api.loadSessions(), { attempts: 3, backoffMs: 400, jitter: true })
  setSessions(rows)
} catch (err) {
  setState('error')
  reportError('Couldn't load your sessions.', err, { op: 'loadSessions' })
}
// render: state === 'error' shows the message + a Retry button that re-runs the load
​```

## Repo conventions to follow

How this codebase already surfaces and reports failures, with one exemplar the
executor should imitate (the toast/error API, the logger, state-machine names):

- Errors surface through `src/lib/reportError.ts` — it shows a persistent toast AND reports to telemetry in one call; route this flow through it.
- <exemplar file:line that already handles a failure correctly — copy its shape>

## Steps

1. <One concrete edit per step: file, what changes, resulting code.>
2. …

## Boundaries

- Do NOT touch <files/flows out of scope>.
- Do NOT change unrelated behavior — add the failure path, don't refactor the happy path (unless a step says otherwise).
- Do NOT add new dependencies.
- If a step doesn't match the code you find (drift since the commit stamp), STOP and report instead of improvising.

## Verification

- **Mechanical**: <exact commands — typecheck, lint, build — with expected outcome>.
- **Failure-injection check**: reproduce the exact failure this plan fixes, then confirm the new behavior. Name the injection and the observable before/after:
  - Inject: <how to force the failure — DevTools → Network → Offline; kill the child process; make the endpoint return 500; throw inside the component>.
  - Before: <what the user saw — e.g. "spinner forever, nothing logged">.
  - After: <what the user now sees — e.g. "'Couldn't load your sessions' + Retry button; typed input preserved; one telemetry event fired">.
  - Confirm recovery: <e.g. "click Retry with the network restored and the list loads">.
- **Done when**: <machine- or eye-checkable completion criteria>.
```

## Notes for the plan author

- One plan per finding. If two findings share every file and the same fix pattern (e.g. the same `reportError` wrap across sibling flows), they may merge into one plan.
- Pull every value from [AUDIT.md](AUDIT.md) — the severity, the retry shape, the four-states requirement — never approximate from memory.
- **The failure-injection check is not optional.** A hardening plan without a repro recipe is incomplete: an error path that was never exercised is as unproven as the swallowed catch it replaced. Every plan must name how to reproduce the failure — go offline, kill the child process, force a 500, throw in the component — and the observable before/after, so the executor (or the human reviewing the diff) can watch the failure actually recover.
- After writing plans, create or update `plans/README.md` with: a table of plans (number, title, severity, status), the recommended execution order, and any dependencies between plans (e.g. the `reportError` helper plan lands before the plans that route through it).
