# Closing the Loop — execute, reconcile, issues

The advisor's job doesn't end at the plan. This file covers the three follow-through flows: dispatching an executor and reviewing its rewrite (`execute`), keeping the plan backlog alive (`reconcile`), and publishing plans where the work gets picked up (`--issues`).

The founding rule survives unchanged: **the advisor never edits source code.** In `execute`, a *separate executor subagent* edits copy in an isolated git worktree; the advisor dispatches, reviews, and renders a verdict — like a senior editor who reviews the change but never pushes commits to your branch.

---

## `execute <plan>` — dispatch and review

### Preconditions (check all before dispatching)

- The repo is a git repository (worktree isolation requires it). If not: stop and say so.
- The plan file exists and its dependencies show DONE in `plans/README.md`. If not: stop, name the missing dependency.
- Run the plan's drift check yourself (`git diff --stat <planned-at SHA>..HEAD -- <in-scope paths>`). If in-scope files changed since `Planned at`, reconcile the plan first (see below) — copy moves fast, and a stale before/after excerpt becomes a rewrite of a string that no longer exists. Don't hand a drifted plan to an executor.

### Dispatch

Spawn **one** `general-purpose` subagent with `isolation: "worktree"`. Executor model: default `sonnet`; use what the user named if they named one (`execute 003 haiku`).

The subagent prompt must contain:

1. **The full plan file text, inlined.** The worktree contains only committed files — if `plans/` is uncommitted, the executor can't read it. Never assume; always inline.
2. The executor preamble:

> You are the executor for the copy rewrite plan below. Follow it step by
> step. Apply each replacement string exactly as written — do not improve,
> shorten, or rephrase it; the wording is the deliverable. Preserve every
> i18n key and interpolation slot (`{count}`, `%s`, `<b>…</b>`, etc.)
> character-for-character. Change string values only — never markup,
> component logic, or structure — unless a step explicitly says otherwise.
> Touch only the files listed as in scope. Run every verification command
> and confirm the expected result before moving on. If any STOP condition
> occurs, stop immediately and report. Do not improvise around obstacles.
> Commit your work in the worktree following the plan's git workflow section.
> One override: SKIP the plan's instruction to update `plans/README.md` —
> your reviewer maintains the index. Before reporting, audit every claim in
> your report against an actual tool result from this session — only report
> what you can point to evidence for; if a verification failed or was
> skipped, say so plainly. When finished, reply with exactly the report
> format below.

3. The report format:

```
STATUS: COMPLETE | STOPPED
STEPS: per step — done/skipped + verification command result
STOPPED BECAUSE: (only if STOPPED) which STOP condition, what was observed
STRINGS CHANGED: before → after, per string, with file:line
FILES CHANGED: list
NOTES: anything the reviewer should know (deviations, surprises, judgment calls)
```

### Review (the advisor's real job here)

Note on fresh worktrees: they share git history but not `node_modules` or build artifacts — the executor must install dependencies first before a typecheck, lint, or i18n-key check will run, even though the plan's command table (recon'd in the main tree) assumed those were already present. Expect this; it isn't a deviation.

Review like a senior editor reviewing a change against the spec — never fix anything yourself:

1. **Re-run every done criterion** in the worktree. Don't trust the executor's report — verify. Run the typecheck / lint / i18n key-completeness commands the plan named.
2. **Scope compliance**: `git -C <worktree> diff --stat` against the plan's in-scope list. Any file outside scope fails review, full stop.
3. **Read the full diff.** Confirm the change is copy-only: no markup, structure, or component logic moved unless a step called for it, and every i18n key + interpolation slot is intact.
4. **The domain review — re-read every changed string aloud, in its UI context.** This is the analog of a test suite for copy; it is not optional. For each changed string: read it out loud as the user would encounter it, confirm it matches the plan's exact replacement wording, confirm the surrounding key/slot is untouched, and confirm it reads like a competent human — not a system reporting an event. An executor can apply a mechanically-correct string that still lands wrong in context (a warm exclamation on a failure surface, a slot dropped, a `{name}` now referencing a variable that isn't in scope). The before/after table the plan requires is where you catch it. Copy that passes the commands but reads wrong aloud is a REVISE, not an APPROVE.

### Verdict

**Documented deviations are judged on merit, not reflex-blocked.** "Do not improvise" exists to stop silent drift; an executor that hits a real obstacle (e.g. the exact replacement string overflows a fixed-width button and it flagged that in NOTES rather than silently truncating) has done the right thing. Approve it if the adaptation serves the plan's intent and stays in scope; treat *undocumented* deviations as review failures — especially a reworded string, which defeats the entire point of the plan.

| Verdict | When | Action |
|---|---|---|
| **APPROVE** | Criteria pass, scope clean, every string matches and reads cleanly aloud | Update index status to DONE. Present to the user: diff summary, the before/after table, worktree path and branch, anything from NOTES. **Merging is the user's decision — never merge, push, or commit to their branch.** |
| **REVISE** | Fixable gaps (a string reworded off-spec, a slot dropped, a string that reads wrong aloud, a criterion fails) | SendMessage to the same executor with specific, actionable feedback ("Step 2: you shipped 'Couldn't save — try again' but the plan's exact string is 'Couldn't save your changes — you're offline. They'll retry when you reconnect.' Restore it verbatim; the `{count}` slot in `en.json:88` was dropped — put it back."). **Max 2 revision rounds**, then BLOCK. |
| **BLOCK** | STOP condition hit, scope violated unrecoverably, or revisions exhausted | Mark BLOCKED in the index with the reason. Refine or rewrite the plan with what was learned. Tell the user what happened and what changed in the plan. |

Running verification commands inside the executor's worktree is fine — it's isolated and disposable. The no-mutating-commands rule protects the user's working tree, not the worktree.

---

## `reconcile` — keep `plans/` alive

Process what happened since the last session. Read `plans/README.md` and every plan file, then per status:

- **DONE** — spot-check that the done criteria still hold on the current HEAD (cheap ones only: grep that the new string is present and the old string is gone; the i18n key-completeness check still passes). Mark verified in the index. Don't delete plan files — they're the record.
- **BLOCKED** — read the reason. Investigate the underlying obstacle in the code (the string didn't fit, the key structure changed, product context was missing). Either rewrite the plan around it (new number if the approach changed fundamentally, in-place refresh otherwise) or mark REJECTED with one line of rationale.
- **IN PROGRESS** (stale) — flag it to the user; an executor probably died mid-run. Check the worktree if one exists.
- **TODO** — run the drift check. If drifted: re-read the cited string on current HEAD to confirm the finding still exists (someone may have rewritten it in passing). If it still needs the fix, refresh the "Problem" excerpts and `Planned at` SHA. If the string is already fixed or gone, mark REJECTED ("fixed independently").

Finish with a short report: what's verified done, what was refreshed, what's rejected, and what's executable right now.

---

## `--issues` — publish plans as GitHub issues

Modifier on any planning invocation (`improve-copy --issues`, `improve-copy errors --issues`). The flag is the user's authorization to create issues — never create them without it.

1. Preflight: `gh auth status` succeeds and the repo has a GitHub remote. If either fails, write the plan files as normal and say why issues were skipped.
2. Visibility check: `gh repo view --json visibility`. If the repo is **public**, warn the user that issues are publicly visible and get explicit confirmation before publishing any plan that describes a sensitive finding — a leaked credential or PII location cited in a string, or a copy path that exposes an internal error surface. (Copy plans quote strings verbatim; a plan that documents "this toast prints the raw API key at `auth.ts:40`" must not become a public issue without a heads-up.)
3. Show the list of titles about to become issues; confirm once if interactive.
4. Per plan: `gh issue create --title "<plan title>" --body-file <plan file>`. Labels: `improve-copy` plus the category — apply only if the labels exist or can be created without erroring; skip labels rather than fail.
5. Record each issue URL in the plan's Status block (`- **Issue**: <url>`) and the index.

The plan file remains the source of truth; the issue is distribution. The self-containment rule pays off here — the issue body needs no edits to make sense to whoever (or whatever) picks it up.
