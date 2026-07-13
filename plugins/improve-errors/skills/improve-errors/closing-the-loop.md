# Closing the Loop — execute, reconcile, issues

A hardening plan isn't finished when it's written. This file covers the three follow-through flows: dispatching an executor and reviewing its work (`execute`), keeping the plan backlog alive (`reconcile`), and publishing plans where work gets picked up (`--issues`).

The founding rule survives unchanged: **the advisor never edits source code.** In `execute`, a *separate executor subagent* edits code in an isolated git worktree; the advisor dispatches, reviews, and renders a verdict — like a tech lead who reviews a PR but doesn't push commits to your branch.

---

## `execute <plan>` — dispatch and review

### Preconditions (check all before dispatching)

- The repo is a git repository (worktree isolation requires it). If not: stop and say so.
- The plan file exists and its dependencies show DONE in `plans/README.md`. If not: stop, name the missing dependency. A recovery plan that routes through a shared `reportError` helper cannot land before the plan that introduces the helper.
- Run the plan's drift check yourself (`git diff --stat <planned-at SHA>..HEAD -- <in-scope paths>`). If in-scope files changed since `Planned at`, reconcile the plan first (see below) — a failure path is written against exact catch bodies and render branches, and stale line references send the executor to the wrong code.

### Dispatch

Spawn **one** `general-purpose` subagent with `isolation: "worktree"`. Executor model: default `sonnet`; use what the user named if they named one (`execute 003 haiku`).

The subagent prompt must contain:

1. **The full plan file text, inlined.** The worktree contains only committed files — if `plans/` is uncommitted, the executor can't read it. Never assume; always inline.
2. The executor preamble:

> You are the executor for the hardening plan below. Follow it step by step.
> Run every verification command and confirm the expected result before moving
> on. Touch only the files listed as in scope. Add the failure path — do not
> refactor the happy path unless a step says so. If any STOP condition occurs,
> stop immediately and report. Do not improvise around obstacles. Commit your
> work in the worktree following the plan's git workflow section. One override:
> SKIP the plan's instruction to update `plans/README.md` — your reviewer
> maintains the index. Before reporting, audit every claim in your report
> against an actual tool result from this session — only report what you can
> point to evidence for; if a verification or the failure-injection repro failed
> or was skipped, say so plainly. When finished, reply with exactly the report
> format below.

3. The report format:

```
STATUS: COMPLETE | STOPPED
STEPS: per step — done/skipped + verification command result
FAILURE REPRO: what was injected, what the user saw before, what they see now
STOPPED BECAUSE: (only if STOPPED) which STOP condition, what was observed
FILES CHANGED: list
NOTES: anything the reviewer should know (deviations, surprises, judgment calls)
```

### Review (the advisor's real job here)

Note on fresh worktrees: they share git history but not `node_modules` or build artifacts — the executor must install dependencies first, and any check that resolves from `dist/` may need one build even though the plan's command table (recon'd in the main tree) didn't mention it. Expect this; it isn't a deviation.

Review like a tech lead reviewing a PR against the spec — never fix anything yourself:

1. **Re-run every done criterion** in the worktree. Don't trust the executor's report — verify.
2. **Scope compliance**: `git -C <worktree> diff --stat` against the plan's in-scope list. Any file outside scope fails review, full stop. A hardening change that quietly rewrote the happy path or "cleaned up" an adjacent module is an out-of-scope change however plausible it looks.
3. **Read the full diff.** Judge it against "Problem"/"Target" (does the failure now surface, retry, preserve input, or degrade exactly as specified?) and the repo's surface conventions named in the plan (does it route through the anointed `reportError`/toast/logger, or did it hand-roll a sixth error pattern?).
4. **Domain review — run the failure-injection repro yourself.** This is the analog of auditing new tests. Reproduce the exact failure the plan targets (go offline, kill the child process, force a 500, throw in the component) and confirm the **failure path now exists**: the retry fires with backoff, the typed input is preserved, the error boundary catches the throw and offers a reset, the offline message appears, the telemetry event fires once. Then read the new test: confirm it **asserts the failure, not just the happy path** — a test that only exercises the success case passes the suite and proves none of the hardening. An error path that was never exercised is as unproven as the swallowed catch it replaced.

### Verdict

**Documented deviations are judged on merit, not reflex-blocked.** "Do not improvise" exists to stop silent drift; an executor that hits a real obstacle (e.g. the retry helper the plan named doesn't exist, so it adapted the pattern minimally), stays in scope, and explains it in NOTES has done the right thing. Approve it if the adaptation serves the plan's intent and stays in scope; treat *undocumented* deviations as review failures.

| Verdict | When | Action |
|---|---|---|
| **APPROVE** | Criteria pass, scope clean, the injected failure recovers as specified, the new test asserts the failure | Update index status to DONE. Present to the user: diff summary, the before/after of the failure-injection repro, worktree path and branch, anything from NOTES. **Merging is the user's decision — never merge, push, or commit to their branch.** |
| **REVISE** | Fixable gaps | SendMessage to the same executor with specific, actionable feedback ("criterion 3 fails: the catch at `api.ts:90` still swallows — route it through `reportError`; and the new test asserts the happy path only, add one that forces the 500 and asserts the Retry button renders"). **Max 2 revision rounds**, then BLOCK. |
| **BLOCK** | STOP condition hit, scope violated unrecoverably, the failure repro doesn't recover, or revisions exhausted | Mark BLOCKED in the index with the reason. Refine or rewrite the plan with what was learned. Tell the user what happened and what changed in the plan. |

Running verification commands and injecting failures inside the executor's worktree is fine — it's isolated and disposable. The no-mutating-commands rule protects the user's working tree, not the worktree.

---

## `reconcile` — keep `plans/` alive

Process what happened since the last session. Read `plans/README.md` and every plan file, then per status:

- **DONE** — spot-check that the done criteria still hold on the current HEAD (cheap ones only — the failure path still exists, the catch still surfaces). Mark verified in the index. Don't delete plan files — they're the record.
- **BLOCKED** — read the reason. Investigate the underlying obstacle in the codebase. Either rewrite the plan around it (new number if the approach changed fundamentally, in-place refresh otherwise) or mark REJECTED with one line of rationale.
- **IN PROGRESS** (stale) — flag it to the user; an executor probably died mid-run. Check the worktree if one exists.
- **TODO** — run the drift check. If drifted: re-verify the failure still exists (it may have been hardened in passing — a catch that was empty now surfaces), then refresh the "Problem" excerpts and the `Commit` stamp. If the failure path was fixed independently, mark REJECTED ("hardened independently").

Finish with a short report: what's verified done, what was refreshed, what's rejected, and what's executable right now.

---

## `--issues` — publish plans as GitHub issues

Modifier on any planning invocation (`improve-errors --issues`, `improve-errors recovery --issues`). The flag is the user's authorization to create issues — never create them without it.

1. Preflight: `gh auth status` succeeds and the repo has a GitHub remote. If either fails, write the plan files as normal and say why issues were skipped.
2. Visibility check: `gh repo view --json visibility`. If the repo is **public**, warn the user that issues are publicly visible and get explicit confirmation before publishing any plan that describes a sensitive finding — a credential location on an error path (an API key logged in a catch), PII in a report payload, or a stack trace that leaks internal structure. Never let a public issue expose what the audit was supposed to help close.
3. Show the list of titles about to become issues; confirm once if interactive.
4. Per plan: `gh issue create --title "<plan title>" --body-file <plan file>`. Labels: `improve-errors` plus the category — apply only if the labels exist or can be created without erroring; skip labels rather than fail.
5. Record each issue URL in the plan's Status block (`- **Issue**: <url>`) and the index.

The plan file remains the source of truth; the issue is distribution. The self-containment rule pays off here — the issue body needs no edits to make sense to whoever (or whatever) picks it up.
