# Closing the Loop — execute, reconcile, issues

The advisor's job doesn't end at the plan. This file covers the three follow-through flows: dispatching an executor and reviewing its work (`execute`), keeping the plan backlog alive (`reconcile`), and publishing plans where the work gets picked up (`--issues`).

The founding rule survives unchanged: **the advisor never edits source code.** In `execute`, a *separate executor subagent* edits the prompts in an isolated git worktree; the advisor dispatches, reviews, and renders a verdict — like a tech lead who doesn't push commits to your branch. You never merge, push, or commit to the user's branch.

---

## `execute <plan>` — dispatch and review

### Preconditions (check all before dispatching)

- The repo is a git repository (worktree isolation requires it). If not: stop and say so.
- The plan file exists and its dependencies show DONE in `plans/README.md`. If not: stop, name the missing dependency.
- Run the plan's drift check yourself: `git diff --stat <planned-at SHA>..HEAD -- <in-scope paths>`. If in-scope prompt files changed since `Planned at`, reconcile the plan first (see below) — don't hand a stale plan to an executor. A prompt whose surrounding assembly changed may no longer say what the plan's excerpt quoted.

### Dispatch

Spawn **one** `general-purpose` subagent with `isolation: "worktree"`. Executor model: default `sonnet`; use what the user named if they named one (`execute 003 haiku`).

The subagent prompt must contain:

1. **The full plan file text, inlined.** The worktree contains only committed files — if `plans/` is uncommitted, the executor can't read it. Never assume; always inline.
2. The executor preamble:

> You are the executor for the prompt-rewrite plan below. Follow it step by
> step. Run every verification command and the behavior check, and confirm the
> expected result, before moving on. Touch only the files listed as in scope.
> Paste the "Target" prompt text in verbatim — do not compose your own wording.
> Never reproduce any secret value in a file, a fixture, or your report; cite
> `file:line` and credential type only. If any STOP condition occurs, stop
> immediately and report. Do not improvise around obstacles. Commit your work in
> the worktree. One override: SKIP the plan's instruction to update
> `plans/README.md` — your reviewer maintains the index. Before reporting, audit
> every claim in your report against an actual tool result from this session —
> only report what you can point to evidence for; if a verification or the
> behavior check failed or was skipped, say so plainly. When finished, reply
> with exactly the report format below.

3. The report format:

```
STATUS: COMPLETE | STOPPED
STEPS: per step — done/skipped + verification command result
BEHAVIOR CHECK: per test input — before / after observed
STOPPED BECAUSE: (only if STOPPED) which STOP condition, what was observed
FILES CHANGED: list
NOTES: anything the reviewer should know (deviations, surprises, judgment calls)
```

### Review (the advisor's real job here)

Note on fresh worktrees: they share git history but not `node_modules` or build artifacts — the executor may need to install dependencies before the eval command runs, even though the plan's command table (recon'd in the main tree) didn't mention it. Expect this; it isn't a deviation.

Review like a tech lead reviewing a PR against the spec — never fix anything yourself:

1. **Re-run every done criterion** in the worktree. Don't trust the executor's report — verify.
2. **Scope compliance**: `git -C <worktree> diff --stat` against the plan's in-scope list. Any file outside scope fails review, full stop.
3. **Read the full diff.** Judge it against "Why this matters" (does the rewrite solve the actual behavioral problem?) and the repo's delimiter/tool-description conventions named in the plan (does it look like the rest of the fleet?). Confirm the "Target" text was pasted verbatim, not paraphrased.
4. **The domain review step — run the behavior check.** Execute the plan's behavior-check test inputs against the rewritten prompt in the worktree and confirm each produces the expected "after" result. Then confirm three things the executor is prone to miss: **no secret value was reproduced** anywhere in the diff or the new fixture; **no schema/prompt drift** was introduced (the prose still matches the paired schema and tool signatures — a rewrite that fixes the prose but silently contradicts the enum is a regression); and **the golden transcript / eval fixture actually asserts the new behavior**, not a trivially-passing placeholder. Executors game criteria — a fixture that pins nothing passes the eval and proves nothing. Read what it asserts.

### Verdict

**Documented deviations are judged on merit, not reflex-blocked.** "Do not improvise" exists to stop silent drift; an executor that hits a real obstacle (e.g. the plan's precedence wording breaks an existing eval fixture's expected output), adapts minimally, and explains it in NOTES has done the right thing. Approve it if the adaptation serves the plan's intent and stays in scope; treat *undocumented* deviations as review failures.

| Verdict | When | Action |
|---|---|---|
| **APPROVE** | Criteria pass, scope clean, behavior check shows the expected "after", no secret reproduced, no schema drift | Update index status to DONE. Present to the user: diff summary, worktree path and branch, the behavior-check results, anything from NOTES. **Merging is the user's decision — never merge, push, or commit to their branch.** |
| **REVISE** | Fixable gaps | SendMessage to the same executor with specific, actionable feedback ("behavior check for input `"hi"` still returns plain text — the precedence line from Target wasn't pasted at `system-prompt.ts:12`"). **Max 2 revision rounds**, then BLOCK. |
| **BLOCK** | STOP condition hit, scope violated unrecoverably, a secret was reproduced, or revisions exhausted | Mark BLOCKED in the index with the reason. Refine or rewrite the plan with what was learned. Tell the user what happened and what changed in the plan. |

Running verification and the behavior check inside the executor's worktree is fine — it's isolated and disposable. The no-mutating-commands rule protects the user's working tree, not the worktree.

---

## `reconcile` — keep `plans/` alive

Process what happened since the last session. Read `plans/README.md` and every plan file, then per status:

- **DONE** — spot-check that the cheap done criteria still hold on the current HEAD (e.g. the target prompt text is present, the golden fixture still passes). Mark verified in the index. Don't delete plan files — they're the record.
- **BLOCKED** — read the reason. Investigate the underlying obstacle in the prompt code. Either rewrite the plan around it (new number if the approach changed fundamentally, in-place refresh otherwise) or mark REJECTED with one line of rationale.
- **IN PROGRESS** (stale) — flag it to the user; an executor probably died mid-run. Check the worktree if one exists.
- **TODO** — run the drift check. If drifted: re-verify the finding still exists (the prompt may have been fixed in passing during an unrelated edit), then refresh the "Problem" excerpts and the `Planned at` SHA. If the finding is gone, mark REJECTED ("fixed independently").

Finish with a short report: what's verified done, what was refreshed, what's rejected, and what's executable right now.

---

## `--issues` — publish plans as GitHub issues

Modifier on any planning invocation (`improve-prompts --issues`, `improve-prompts injection --issues`). The flag is the user's authorization to create issues — never create them without it.

1. Preflight: `gh auth status` succeeds and the repo has a GitHub remote. If either fails, write the plan files as normal and say why issues were skipped.
2. Visibility check: `gh repo view --json visibility`. If the repo is **public**, warn the user that issues are publicly visible and get explicit confirmation before publishing any plan that describes a sensitive finding — a credential location, an injection surface, PII echoed into context. (Even redacted, a public issue that says "credential at `config.ts:12`" points an attacker at the spot.)
3. Show the list of titles about to become issues; confirm once if interactive.
4. Per plan: `gh issue create --title "<plan title>" --body-file <plan file>`. Labels: `improve-prompts` plus the category — apply only if the labels exist or can be created without erroring; skip labels rather than fail.
5. Record each issue URL in the plan's Status block (`- **Issue**: <url>`) and the index.

The plan file remains the source of truth; the issue is distribution. The self-containment rule pays off here — the issue body needs no edits to make sense to whoever (or whatever) picks it up.
