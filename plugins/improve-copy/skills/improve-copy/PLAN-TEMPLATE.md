# Plan Template

Every plan written by `improve-copy` follows this structure. The executor may be a less capable model with **zero context and zero taste** — the plan must contain everything, exactly. No references to "the audit above" or "the tone we discussed." Three properties make a plan executable by a weaker model:

1. **Self-contained context** — every path, the verbatim current string, the exact replacement string, the conventions, and the commands are in the file.
2. **Verification gates** — every step ends with a command (or the read-aloud check) and its expected result. The executor never has to *judge* whether it succeeded.
3. **Hard boundaries and escape hatches** — an explicit out-of-scope list and "STOP and report" conditions instead of improvising when reality doesn't match the plan.

Every plan MUST contain the exact replacement string (never "make it friendlier") and MUST preserve any i18n key and interpolation slot verbatim. Never write a secret or PII value into a plan — cite `file:line` and the type only.

File naming: `plans/NNN-short-slug.md`, numbered in recommended execution order.

---

## Template

```markdown
# NNN — <Short imperative title: what will be true after this plan>

> **Executor instructions**: Follow this plan step by step. Apply each
> replacement string exactly as written — do not improve, shorten, or rephrase
> it; the wording is the deliverable. Preserve every i18n key and interpolation
> slot character-for-character. Change string values only — never markup,
> component logic, or structure — unless a step explicitly says otherwise. Run
> every verification and confirm the expected result before the next step. If
> any STOP condition occurs, stop and report — do not improvise. When done,
> update this plan's status row in `plans/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat <planned-at SHA>..HEAD -- <in-scope paths>`
> If any in-scope file changed since this plan was written, compare the
> "Problem" excerpts below against the live code before proceeding; on a
> mismatch (the string was already edited or moved), treat it as a STOP
> condition.

## Status

- **Priority**: P1 | P2 | P3
- **Effort**: S | M | L
- **Risk**: LOW | MED | HIGH
- **Depends on**: plans/NNN-*.md (or "none")
- **Category**: buttons | errors | empty-states | consistency | tone | microcopy | concision | missed-opportunity
- **Planned at**: commit `<short SHA>`, <YYYY-MM-DD>
- **Issue**: <GitHub issue URL — only when published via `--issues`; omit otherwise>

## Problem

What is wrong, where, and why it matters to how the product reads. Cite every
location as `path/to/file.tsx:123` and include the current string verbatim:

​```tsx
// src/components/save-bar.tsx:42 — current
<Toast>Something went wrong</Toast>
​```

## Target

The exact end state — the replacement string spelled out in full, not a
direction. Never "make it clearer":

​```tsx
// target
<Toast>Couldn't save your changes — you're offline. They'll retry when you reconnect.</Toast>
​```

For i18n, preserve the key and every interpolation slot exactly:

​```json
// src/locales/en.json — current → target (key unchanged, {count} slot preserved)
"screens.empty": "No results"
"screens.empty": "No screens yet — press ⌘N to create one"
"screens.deleteConfirm": "Delete {count} screens?"   // slot {count} kept verbatim
​```

## Repo conventions to follow

How this codebase already writes copy, with one exemplar the executor should
imitate (casing convention, terminology, person, where strings live):

- Casing: sentence case for buttons and headers; the terminology map calls this
  object a "<term>", never "<drifted synonym>".
- Person: the product speaks to the user as "you" / "your".
- Strings live in `src/locales/en.json` under dotted keys — add or edit the
  value only, never rename the key.
- <exemplar `file:line` whose copy is already right — the model to match>.

Documented voice / vocabulary / design constraints from the recon docs, quoted
so the executor (who has not read those docs) must honor them:

- From the style guide (`docs/voice.md:14`): "<quote the exact rule — e.g. never
  apologize more than once; contractions always>".
- From `CONTEXT.md`: the canonical term for this object is "<term>"; do not use
  "<rejected synonym>".

## Commands you will need

| Purpose               | Command                       | Expected on success        |
|-----------------------|-------------------------------|----------------------------|
| Typecheck             | `<repo's exact command>`      | exit 0, no errors          |
| Lint                  | `<repo's exact command>`      | exit 0                     |
| i18n key-completeness | `<repo's exact command>`      | no missing/orphaned keys   |

(Exact commands captured from this repo during recon, not guessed. Copy rarely
has a unit test — this small set is usually the whole mechanical surface. If a
row doesn't exist in this repo, delete it rather than invent it.)

## Scope

**In scope** (the only files you should modify):
- `src/components/save-bar.tsx`
- `src/locales/en.json`

**Out of scope** (looks related, do NOT touch — one line why each):
- `src/locales/fr.json` — translations are handled by the localization pipeline,
  not by hand; changing English keys is enough.
- Component logic / markup in `save-bar.tsx` — this is a copy change only.

## Steps

### Step 1: <imperative title>

One concrete edit: the file, the exact current string, the exact replacement
string. Reference exact symbols/keys.

**Verify**: `<command>` → <expected output>

### Step 2: ...

(Each step small enough to verify independently.)

**Verify**: `<command>` → <expected output>

## Read-aloud check (domain verification — do not skip)

Copy can be mechanically correct — right length, no filler, keys intact — and
still read like a robot or land wrong in context. Read every changed string out
loud in its UI context: it should sound like a competent human explaining what
happened and what to do next, not a system reporting an event. Confirm the tone
fits the moment (calm on errors, sober on destructive confirmations) and that
no interpolation slot now references a value that isn't in scope at that call
site. Paste a before/after table so a human can skim every changed string:

| Location | Before | After |
| --- | --- | --- |
| <file:line> | <old string> | <new string> |

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `<typecheck command>` exits 0
- [ ] `<i18n key-completeness command>` reports no key added, removed, or
      orphaned, and every interpolation slot survives
- [ ] `grep -Rn "<old string>" src/` returns no matches (the old copy is gone)
- [ ] `grep -Rn "<new string fragment>" src/` finds the replacement
- [ ] The before/after table is filled in and every row reads cleanly aloud
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The string at a "Problem" location doesn't match the excerpt (the copy drifted
  since this plan was written).
- The exact replacement string doesn't fit a fixed-width or length-constrained
  slot — report it; do not silently truncate or reword.
- A verification fails twice after a reasonable fix.
- The fix appears to require touching an out-of-scope file, renaming an i18n
  key, or changing markup/component logic.
- The replacement depends on product context you can't confirm (the error's real
  cause, whether a term is a deliberate brand word) — flag the open question.

## Maintenance notes

For whoever owns this copy after the change lands:

- What future changes interact with this (e.g. "if this key is reused on another
  surface, the interpolation assumes `{count}` is always ≥ 1").
- What a reviewer should scrutinize (that no string was reworded off-spec; that
  translations get regenerated downstream).
- Any follow-up explicitly deferred out of this plan, and why.
```

---

## Index file: `plans/README.md`

Written once by the advisor after all plans, updated by executors:

```markdown
# Copy Improvement Plans

Generated by improve-copy on <date>. Execute in the order below unless
dependencies say otherwise. Each executor: read the plan fully before starting,
apply replacement strings verbatim, honor STOP conditions, and update your row
when done.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 001  | ...   | P1       | S      | —          | TODO   |
| 002  | ...   | P1       | M      | 001        | TODO   |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (one-line reason) | REJECTED (one-line rationale — finding fixed independently or approach abandoned)

## Dependency notes

- 002 requires 001 because <reason — e.g. the terminology map must be settled
  before the strings that use the term are rewritten>.

## Findings considered and rejected

- <finding>: not worth doing because <one line — by-design, deliberate brand
  voice, or low leverage>. (So nobody re-audits it next run.)
```

## Quality bar — check before finishing each plan

- Could a zero-context model execute this from the plan file and the repo alone? If any step needs knowledge from the advisor session, inline it.
- Is the exact replacement string written out in full (never a direction), and is every i18n key + interpolation slot preserved verbatim?
- Is every verification a command or the read-aloud table, not a judgment ("make sure it reads well")?
- Are the STOP conditions specific to this plan's real risks (drift, a length-constrained slot, a missing product answer), not boilerplate?
- No secret or PII value anywhere in the file — locations and types only.
- "Planned at" SHA is filled in and the drift-check in-scope paths match the Scope section.

## Notes for the plan author

- One plan per finding. If two findings share every file and the same fix pattern (e.g. one casing convention applied across a menu), they may merge into one plan.
- Pull every rule and target shape from [AUDIT.md](AUDIT.md) — never approximate from memory. Every replacement string must be written out in full.
- The read-aloud check is not optional. It is this domain's test surface — copy can pass every command and still read like a robot; the before/after table is where a human (or the `execute` reviewer) catches it.
- Excerpts come from your own reads, never a subagent's report — a wrong excerpt becomes a plan that fails its own drift check.
