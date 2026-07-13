# Plan Template

Every plan written by `improve-prompts` follows this structure. The executor may be a less capable model with **zero context** and zero judgment — it has not seen this conversation, the audit, or the other plans. The plan must contain everything, exactly. No references to "the audit above" or "the rewrite we discussed." A rewrite shows the **full before and full after prompt text**, never a described edit ("add a rule about JSON", "tighten the tool description") — the executor pastes the after text in, it does not compose it.

Three properties make a plan executable by a weaker model:

1. **Self-contained context** — every path, prompt excerpt, convention, and command is in the file.
2. **Verification gates** — every step ends with a check; the behavior check ends the plan. The executor never has to *judge* whether it succeeded.
3. **Hard boundaries and escape hatches** — an explicit out-of-scope list and "STOP and report" conditions instead of improvising when reality doesn't match the plan.

File naming: `plans/NNN-short-slug.md`, numbered in recommended execution order.

---

## Template

```markdown
# NNN — <Short imperative title — what will be true after this plan>

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and the behavior check, and confirm the expected result,
> before moving on. Touch only the files listed as in scope. If any STOP
> condition occurs, stop and report — do not improvise around obstacles. When
> done, update this plan's status row in `plans/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat <planned-at SHA>..HEAD -- <in-scope paths>`
> If any in-scope file changed since this plan was written, compare the
> "Problem" excerpts against the live prompt text before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1 | P2 | P3
- **Effort**: S | M | L
- **Risk**: LOW | MED | HIGH
- **Depends on**: plans/NNN-*.md (or "none")
- **Category**: <one of the eight audit categories>
- **Planned at**: commit `<short SHA>`, <YYYY-MM-DD>
- **Issue**: <GitHub issue URL — only when published via `--issues`; omit otherwise>

## Problem

What is wrong, where, and why it changes model behavior. Cite every location as
`path/to/file.ts:123` and include the current prompt text verbatim. If the
finding involves a secret, redact the value (cite `file:line` and credential
type only):

​```text
// src/agent/system-prompt.ts:12 — current
Always respond in strict JSON.
For greetings, reply casually with a friendly sentence.
​```

Explain the behavioral failure concretely: "On the input `"hi"`, both rules bind —
the model must both emit strict JSON and reply with a casual sentence — and it
resolves the conflict differently across runs."

## Target

The exact end state as **full prompt text** — every rule spelled out, precedence
stated where it matters. Never "make the rules consistent"; never a described
edit. For tool-description or example rewrites, show the complete before/after
object or example block, not a diff fragment:

​```text
// target — full replacement for src/agent/system-prompt.ts:12
Respond in strict JSON matching the schema. This rule always wins.
Exception: when the user only greets you (e.g. "hi", "hello") and asks nothing,
return {"reply": "<one friendly sentence>", "kind": "greeting"} — still valid JSON.
​```

## Repo conventions to follow

How this codebase already assembles prompts, with one exemplar the executor
should imitate (delimiter convention, where tool descriptions live, how examples
are tagged):

- User/retrieved content is wrapped in `<user_data>…</user_data>` tags elsewhere
  in this fleet — reuse that convention, don't invent a new one.
- <exemplar `file:line` that already does this correctly>

Any documented prompt-design constraint the plan must honor, inlined from the
recon docs (the executor has not read them — quote the specific lines): the
`CONTEXT.md` vocabulary the prompt should use, the model/version the prompt
targets and why, an ADR whose decision this rewrite must stay consistent with.

## Commands you will need

| Purpose        | Command                     | Expected on success        |
|----------------|-----------------------------|----------------------------|
| Typecheck      | `npm run typecheck`         | exit 0, no errors          |
| Lint           | `npm run lint`              | exit 0                     |
| Schema check   | `<schema/prompt validator>` | valid                      |
| Evals          | `<eval command>`            | all pass (N cases)         |

(Exact commands from this repo — captured during recon, not guessed. If the repo
has no eval/test surface for prompts, keep only the checks that apply — a
typecheck, a lint, a schema validation — and note the gap.)

## Scope

**In scope** (the only files you should modify):
- `src/agent/system-prompt.ts`
- `evals/greeting.golden.json` (create)

**Out of scope** (do NOT touch, even though they look related):
- `src/agent/tool-defs.ts` — the tool descriptions are a separate finding; a
  change here widens the diff and risks tool-choice regressions.
- The paired JSON schema / tool signature — prompt text only, unless a step says
  otherwise.

## Steps

### Step 1: <imperative title>

One concrete edit: the file, the exact old text to find, the exact new text to
put in its place (from Target above). Reference exact `file:line` and symbols.

**Verify**: `<command>` → <expected output>

### Step 2: ...

(Each step small enough to verify independently. Order steps so the prompt fleet
is never left in a half-edited, self-contradicting state between steps.)

## Behavior check

**This section is the point of the plan — do not drop it.** A prompt can be
mechanically valid (typechecks, matches the schema) and still misbehave. Run the
affected prompt against 2–3 concrete test inputs and confirm the expected
behavioral difference. Spell out input → before → after for each:

- Input `"hi"` → **before**: sometimes plain text, sometimes JSON
  (nondeterministic) → **after**: always `{"reply": "…", "kind": "greeting"}`.
- Input `{ topic: "" }` (empty slot) → **before**: prompt ships "Answer about " →
  **after**: the guard fills the fallback, or the request is rejected.
- <one edge case the prompt worried about in prose — show that case, not another
  happy path>.

Confirm as part of this check that **no secret value is reproduced** in any
output or fixture, and that **no schema/prompt drift** was introduced (the prose
still matches the paired schema and tool signatures).

## Test plan

Pin the new behavior with a **golden transcript / eval fixture** so it can't
regress silently:

- The fixture to add (a single input and its expected output), in which file,
  following which existing fixture as the structural pattern.
- If the repo has no eval harness, this step establishes the minimal one (one
  golden input/output) — say so, and keep it to the smallest thing that runs.
- Verification: `<eval command>` → all pass, including the new case.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `<typecheck command>` exits 0
- [ ] `<schema/lint command>` passes
- [ ] `<eval command>` passes, including the new golden case
- [ ] The behavior check above produces the "after" result for every listed input
- [ ] No secret value appears in any edited file or fixture (`git diff` reviewed)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The prompt text at the "Problem" locations doesn't match the excerpts (the
  code has drifted since this plan's `Planned at` commit).
- A verification command or the behavior check fails twice after a reasonable
  fix attempt.
- The rewrite appears to require touching an out-of-scope file — including the
  paired schema or a tool signature.
- You discover the named key assumption "<assumption>" is false.

## Maintenance notes

For whoever owns this prompt after the change lands:

- What future changes interact with this rewrite (e.g. "if the greeting path
  gains a new field, the golden fixture and the precedence rule must be revisited").
- What a reviewer should scrutinize in the diff (that the after text was pasted
  verbatim; that no schema field drifted).
- Any follow-up deliberately deferred out of this plan, and why.
```

---

## Index file: `plans/README.md`

Written once by the advisor after all plans, updated by executors:

```markdown
# Prompt Improvement Plans

Generated by `improve-prompts` on <date>. Execute in the order below unless
dependencies say otherwise. Each executor: read the plan fully before starting,
honor its STOP conditions, run the behavior check, and update your row when done.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 001  | ...   | P1       | S      | —          | TODO   |
| 002  | ...   | P1       | M      | 001        | TODO   |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (one-line reason) | REJECTED (one-line rationale — finding fixed independently or approach abandoned)

## Dependency notes

- 002 requires 001 because <reason>.

## Findings considered and rejected

- <finding>: not worth doing because <one line>. (So nobody re-audits it.)
```

## Quality bar — check before finishing each plan

- Could a model that has never seen this repo execute this from the plan file and the repo alone? If any step needs knowledge from the advisor session, inline it.
- Is every verification a command with an expected result, not a judgment ("make sure it reads well")? Is the behavior check a concrete input → expected difference, not a vibe?
- Does every step name the exact file, symbol, and the verbatim old/new text — never "the relevant prompt"?
- Are the STOP conditions specific to this plan's real risks (this drift, this schema, this assumption), not boilerplate?
- Rewrites carry the **full before/after prompt text**. If you find yourself describing an edit in prose, the plan is not finished.
- No secret value anywhere in the file — locations and credential types only.
- The `Planned at` SHA is filled in and the drift-check in-scope paths match the Scope section.

## Notes for the plan author

- One plan per finding. If two findings share every file and the same fix pattern (e.g. the same delimiter convention added around several interpolation slots), they may merge into one plan.
- Pull every rule and value from [AUDIT.md](AUDIT.md) — never approximate from memory.
- The behavior check is not optional; it is this skill's edge. Give the executor — and the human reviewing the executor's diff — concrete inputs and the exact expected difference to watch for.
- Never write a secret into a plan. Cite `file:line` and credential type, redact the value, recommend rotation where it's real.
