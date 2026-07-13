# Closing the Loop — execute, reconcile, issues

The advisor's job doesn't end at the plan. This file covers the three follow-through flows: dispatching an executor and reviewing its work (`execute`), keeping the plan backlog alive (`reconcile`), and publishing plans where work gets picked up (`--issues`).

The founding rule survives unchanged: **the advisor never edits source code.** In `execute`, a *separate executor subagent* edits code in an isolated git worktree; the advisor dispatches, reviews, and renders a verdict — like a tech lead who doesn't push commits to your branch. You never merge, push, or commit to the user's branch.

---

## `execute <plan>` — dispatch and review

### Preconditions (check all before dispatching)

- The repo is a git repository (worktree isolation requires it). If not: stop and say so.
- The plan file exists and its dependencies show DONE in `plans/README.md`. If not: stop, name the missing dependency.
- Run the plan's drift check yourself. If in-scope files changed since `Planned at`, reconcile the plan first (see below) — don't hand a stale plan to an executor. Analytics call sites drift fast: a refactor may have moved the emit site or renamed the wrapper since the plan was written.

### Dispatch

Spawn **one** `general-purpose` subagent with `isolation: "worktree"`. Executor model: default `sonnet`; use what the user named if they named one (`execute 003 haiku`).

The subagent prompt must contain:

1. **The full plan file text, inlined.** The worktree contains only committed files — if `plans/` is uncommitted, the executor can't read it. Never assume; always inline.
2. The executor preamble:

> You are the executor for the implementation plan below. Follow it step by
> step. Run every verification command and confirm the expected result before
> moving on. Touch only the files listed as in scope. **Extend the central event
> catalog before touching any call site** — a raw string-literal emission added
> without the catalog is a plan violation. If any STOP condition occurs, stop
> immediately and report. Do not improvise around obstacles. Commit your work in
> the worktree following the plan's git workflow section. One override: SKIP the
> plan's instruction to update `plans/README.md` — your reviewer maintains the
> index. Before reporting, audit every claim in your report against an actual
> tool result from this session — only report what you can point to evidence
> for; if a verification failed or was skipped, say so plainly. When finished,
> reply with exactly the report format below.

3. The report format:

```
STATUS: COMPLETE | STOPPED
STEPS: per step — done/skipped + verification command result
STOPPED BECAUSE: (only if STOPPED) which STOP condition, what was observed
FILES CHANGED: list
NOTES: anything the reviewer should know (deviations, surprises, judgment calls)
```

### Review (the advisor's real job here)

Note on fresh worktrees: they share git history but not `node_modules` or build artifacts — the executor must install dependencies first, and a typecheck or build may need one install/build even though the plan's command table (recon'd in the main tree) didn't mention it. Expect this; it isn't a deviation.

Review like a tech lead reviewing a PR against the spec — never fix anything yourself:

1. **Re-run every done criterion** in the worktree. Don't trust the executor's report — verify.
2. **Scope compliance**: `git -C <worktree> diff --stat` against the plan's in-scope list. Any file outside scope fails review, full stop.
3. **Read the full diff.** Judge it against "Problem" (does it close the actual instrumentation gap?) and the repo conventions named in the plan (does the emission go through the wrapper, is the property shape defined in the catalog first, does the naming match the confirmed grammar?).
4. **Domain review — the live-event check.** This is the analytics analog of "audit the new tests," and it is not optional. Trigger the exact flow in dev and watch the provider's live-event view (PostHog Activity / Amplitude live stream / Segment debugger — or the wrapper's debug log if configured). Confirm:
   - the event arrives **exactly once** (not zero, not doubled),
   - named **exactly** as the plan specifies (casing and tense),
   - carrying **exactly** the specified properties — no more, no fewer,
   - with **NO content-bearing values** — scan every property value for an email, name, path, URL, token, or free-text string; there must be none,
   - and that the **central catalog was extended first** — the emitted name and property shape trace back to the typed catalog entry, not a bare string literal at the call site.
   - For a funnel-coverage plan: also trigger the abandon / failure branch and confirm its event fires with the shared correlating id, so the two steps join.

   A change that typechecks but fires twice, lands under the wrong name, or carries a stray email has failed review even though every mechanical command passed.

### Verdict

**Documented deviations are judged on merit, not reflex-blocked.** "Do not improvise" exists to stop silent drift; an executor that hits a real obstacle (e.g. the wrapper signature changed since the plan was written), adapts minimally, and explains it in NOTES has done the right thing. Approve it if the adaptation serves the plan's intent and stays in scope; treat *undocumented* deviations as review failures.

| Verdict | When | Action |
| --- | --- | --- |
| **APPROVE** | Done criteria pass, scope clean, live-event check clean | Update index status to DONE. Present to the user: diff summary, worktree path and branch, the live-event observation, anything from NOTES. **Merging is the user's decision — never merge, push, or commit to their branch.** |
| **REVISE** | Fixable gaps (event doubled, a stray property, catalog not extended first) | SendMessage to the same executor with specific, actionable feedback ("live-event check: `checkout_completed` fired twice — the mount effect and the success handler both emit; keep only the success-branch emission per Step 2"). **Max 2 revision rounds**, then BLOCK. |
| **BLOCK** | STOP condition hit, scope violated unrecoverably, or revisions exhausted | Mark BLOCKED in the index with the reason. Refine or rewrite the plan with what was learned. Tell the user what happened and what changed in the plan. |

Running verification commands and triggering flows inside the executor's worktree is fine — it's isolated and disposable. The no-mutating-commands rule protects the user's working tree, not the worktree.

---

## `reconcile` — keep `plans/` alive

Process what happened since the last session. Read `plans/README.md` and every plan file, then per status:

- **DONE** — spot-check that the done criteria still hold on the current HEAD (cheap ones only — e.g. the catalog entry still exists, the emit site still goes through the wrapper). Mark verified in the index. Don't delete plan files — they're the record.
- **BLOCKED** — read the reason. Investigate the underlying obstacle in the codebase. Either rewrite the plan around it (new number if the approach changed fundamentally, in-place refresh otherwise) or mark REJECTED with one line of rationale.
- **IN PROGRESS** (stale) — flag it to the user; an executor probably died mid-run. Check the worktree if one exists.
- **TODO** — run the drift check. If drifted: re-verify the finding still exists (the event may have been instrumented in passing during unrelated work), then refresh the "Problem" excerpts and `Planned at` SHA. If the gap is already closed, mark REJECTED ("instrumented independently").

Finish with a short report: what's verified done, what was refreshed, what's rejected, and what's executable right now.

---

## `--issues` — publish plans as GitHub issues

Modifier on any planning invocation (`improve-analytics --issues`, `improve-analytics privacy --issues`). The flag is the user's authorization to create issues — never create them without it.

1. Preflight: `gh auth status` succeeds and the repo has a GitHub remote. If either fails, write the plan files as normal and say why issues were skipped.
2. Visibility check: `gh repo view --json visibility`. If the repo is **public**, warn the user that issues are publicly visible and get explicit confirmation before publishing any plan that describes a sensitive finding — a PII exposure (an email or user content in an event property), a credential location (a write key or token in config), or a consent-bypass path. Analytics findings routinely name exactly where sensitive data leaks; a public issue is a map to it.
3. Show the list of titles about to become issues; confirm once if interactive.
4. Per plan: `gh issue create --title "<plan title>" --body-file <plan file>`. Labels: `improve-analytics` plus the category — apply only if the labels exist or can be created without erroring; skip labels rather than fail.
5. Record each issue URL in the plan's Status block (`- **Issue**: <url>`) and the index.

The plan file remains the source of truth; the issue is distribution. The self-containment rule pays off here — the issue body needs no edits to make sense to whoever (or whatever) picks it up. Never paste a secret value or a content-bearing property value into an issue body; the `file:line` + type reference from the plan is what travels.
