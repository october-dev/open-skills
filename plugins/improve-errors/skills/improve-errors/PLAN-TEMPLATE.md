# Plan Template

Every plan written by `improve-errors` follows this structure. The executor may be a less capable model with **zero context and zero taste** — the plan must contain everything, exactly. No references to "the failure above" or "the retry policy we discussed."

Three properties make a plan executable by a weaker model:

1. **Self-contained context** — every path, code excerpt, convention, command, and value is in the file.
2. **Verification gates** — every step ends with a command and its expected result, and the failure-injection check proves the new path actually recovers. The executor never has to *judge* whether it worked.
3. **Hard boundaries and escape hatches** — explicit out-of-scope list and "STOP and report" conditions, so the executor doesn't improvise when reality doesn't match the plan.

File naming: `plans/NNN-short-slug.md`, numbered in recommended execution order.

---

## Template

```markdown
# NNN — <Short imperative title: what will be true after this plan>

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. Touch only the files listed as in scope. Add the failure path —
> do not refactor the happy path unless a step says so. If anything in "STOP
> conditions" occurs, stop and report — do not improvise. When done, update
> this plan's status row in `plans/README.md` — unless a reviewer dispatched
> you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat <Planned at SHA>..HEAD -- <in-scope paths>`
> If any in-scope file changed since this plan was written, compare the
> "Problem" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition — a failure path written against a catch body
> that has since moved will land in the wrong place.

## Status

- **Priority**: P1 | P2 | P3
- **Effort**: S | M | L
- **Risk**: LOW | MED | HIGH
- **Depends on**: plans/NNN-*.md (or "none") — e.g. the `reportError` helper plan lands first
- **Category**: <one of the eight audit categories>
- **Severity**: HIGH | MEDIUM | LOW
- **Planned at**: commit `<short SHA>`, <YYYY-MM-DD>
- **Issue**: <GitHub issue URL — only when published via `--issues`; omit otherwise>

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
  reportError("Couldn't load your sessions.", err, { op: 'loadSessions' })
}
// render: state === 'error' shows the message + a Retry button that re-runs the load
​```

## Repo conventions to follow

How this codebase already surfaces and reports failures, with one exemplar the
executor should imitate (the toast/error API, the logger, state-machine names):

- Errors surface through `src/lib/reportError.ts` — it shows a persistent toast
  AND reports to telemetry in one call; route this flow through it.
- <exemplar `file:line` that already handles a failure correctly — copy its shape>
- Any documented constraint from the recon docs, quoted inline (the executor has
  not read those docs): the runbook's required retry count, the postmortem's
  named remediation, the error-handling ADR's chosen pattern. Quote the specific
  lines so the fix stays consistent with the decision on record.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm install`           | exit 0              |
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test -- <filter>`  | all pass            |
| Lint      | `pnpm lint`              | exit 0              |

(Exact commands from this repo — captured during recon, not guessed. If a
check doesn't apply to this change, drop its row.)

## Scope

**In scope** (the only files you should modify):
- `src/features/sessions/list.ts`
- `src/features/sessions/list.test.ts` (create)

**Out of scope** (do NOT touch, even though they look related):
- `src/features/sessions/legacy-list.ts` — deprecated path, one line why.
- The happy-path data shape — don't refactor loading logic that already works.

## Steps

### Step 1: <imperative title>

One concrete edit: exact file, what changes, the resulting code shape when it's
load-bearing. Reference exact files/symbols.

**Verify**: `<command>` → <expected output>

### Step 2: ...

(Each step small enough to verify independently. Order them so the codebase is
never broken between steps — e.g. add the helper, then route the flow through it.)

## Failure-injection check (do not skip)

This is the domain heart of the plan: an error path that was never exercised is
as unproven as the swallowed catch it replaced. Name how to reproduce the exact
failure and the observable before/after, so the executor (and the human
reviewing the diff) can watch the failure actually recover.

- **Inject**: <how to force the failure — DevTools → Network → Offline; kill the
  child process; make the endpoint return 500; throw inside the component>.
- **Before**: <what the user saw — "spinner forever, nothing logged">.
- **After**: <what the user now sees — "'Couldn't load your sessions' + Retry
  button; typed input preserved; one telemetry event fired">.
- **Confirm recovery**: <e.g. "click Retry with the network restored → the list
  loads; no double-submit">.

## Test plan

A real test applies here — a hardening plan needs a test that **reproduces the
failure and asserts the new path**, not just the happy path:

- New test in `<file>` that forces the failure (mock the fetch to reject / return
  500, simulate offline) and asserts the recovery: the error state renders, the
  Retry button appears, the input is preserved, the report fired once.
- Also assert the failure is NOT swallowed — the test must fail if the catch goes
  back to empty. (A test that only exercises the success case proves none of the
  hardening.)
- Model the test after `<existing test file:line>` for structure.
- Verification: `<test command>` → all pass, including the N new failure-path tests.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `<typecheck command>` exits 0
- [ ] `<test command>` exits 0; the new failure-path test exists and asserts the failure
- [ ] The failure-injection check shows the specified before → after
- [ ] `grep -rn "catch {}" <in-scope files>` — the swallowed catch is gone
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the "Problem" locations doesn't match the excerpts (drift since
  the `Planned at` commit).
- A verification or the failure-injection repro fails twice after a reasonable
  fix attempt.
- The fix appears to require touching an out-of-scope file (e.g. the retry
  helper doesn't exist and adding it means a new shared module).
- A named key assumption turns false — e.g. "<the flow has a toast surface to
  route through>" is not actually present.

## Maintenance notes

For the human/agent who owns this code after the change lands:

- What future changes interact with this (e.g. "if this list gains pagination,
  the retry wrapper must be revisited so a retry doesn't refetch page 1").
- What a reviewer should scrutinize in the diff (that the new test asserts the
  failure; that no sixth error-surfacing pattern was introduced).
- Any follow-up deferred out of this plan, and why (e.g. "the offline-queue for
  this action is a separate plan").
```

---

## Index file: `plans/README.md`

Written once by the advisor after all plans, updated by executors:

```markdown
# Error-Handling Hardening Plans

Generated by `improve-errors` on <date>. Execute in the order below unless
dependencies say otherwise. Each executor: read the plan fully before starting,
run its failure-injection check, honor its STOP conditions, and update your row.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 001  | ...   | P1       | S      | —          | TODO   |
| 002  | ...   | P1       | M      | 001        | TODO   |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (one-line reason) | REJECTED (one-line rationale — failure hardened independently or approach abandoned)

## Dependency notes

- 002 requires 001 because it routes through the `reportError` helper 001 introduces.

## Findings considered and rejected

- <finding>: not a finding because <one line — by-design fire-and-forget with a
  comment / already handled / really a copy fix owned by improve-copy>. (So nobody
  re-audits it.)
```

## Quality bar — check before finishing each plan

- Could a model that has never seen this repo execute this from the plan file and the repo alone? If any step needs knowledge from the advisor session, inline it.
- Is every verification a command with an expected result, not a judgment ("make sure it works")?
- Does the **failure-injection check** name a concrete way to reproduce the failure and the observable before/after — and does the test plan assert the failure, not just the happy path?
- Does every step name exact files and symbols, not "the relevant module"?
- Are the STOP conditions specific to this plan's real risks (drift, missing surface, out-of-scope helper), not boilerplate?
- No secret values anywhere in the file — `file:line` and credential/PII type only.
- The "Planned at" SHA is filled in and the drift-check paths match the Scope section.

## Notes for the plan author

- One plan per finding. If two findings share every file and the same fix pattern (e.g. the same `reportError` wrap across sibling flows), they may merge into one plan.
- Pull every value from [AUDIT.md](AUDIT.md) — the severity, the retry shape, the four-states requirement — never approximate from memory.
- **Excerpts come from your own reads, never from a subagent's report.** Open every cited file yourself before writing — a subagent's line numbers are leads, and a wrong excerpt becomes a plan that fails its own drift check.
