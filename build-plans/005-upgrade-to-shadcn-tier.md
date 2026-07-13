# 005 — Upgrade the improve-* family to shadcn/improve execution-rigor tier

- **Status**: IN PROGRESS
- **Goal**: raise all four skills (`improve-copy`, `improve-prompts`, `improve-errors`,
  `improve-analytics`) to the execution rigor of `github.com/shadcn/improve`, WITHOUT losing our
  domain edge (the practitioner-distilled AUDIT catalogs, the domain-specific verification analogs,
  the analytics funnel checkpoint, the prompts secrets rule).
- **Reference to model from** (read these first): shadcn/improve's shipped files —
  `skills/improve/SKILL.md`, `skills/improve/references/plan-template.md`,
  `skills/improve/references/closing-the-loop.md`, `skills/improve/references/audit-playbook.md`
  (its `## Finding format` + prioritization rubric). Match their rigor; adapt the domain words.

Each skill lives at `plugins/<skill>/skills/<skill>/` with `SKILL.md`, `AUDIT.md`, `PLAN-TEMPLATE.md`.
This upgrade edits those three and ADDS a fourth file, `closing-the-loop.md`, to each skill dir.

Everything stays **generic and open-source** — no October/local paths, no private references.

---

## P1 — Make `execute` / `reconcile` real (the biggest gap)

### P1.1 Add `closing-the-loop.md` to each skill dir

New file `plugins/<skill>/skills/<skill>/closing-the-loop.md`, modeled closely on shadcn's, covering
the three follow-through flows. Keep the founding rule: **the advisor never edits source code** — in
`execute`, a separate executor subagent edits in an isolated git worktree; the advisor dispatches,
reviews, renders a verdict, never merges/pushes/commits to the user's branch.

Sections (adapt shadcn's wording, keep the structure):

- **`execute <plan>` — dispatch and review**
  - *Preconditions*: repo is a git repo; the plan file exists and its dependencies show DONE in
    `plans/README.md`; run the plan's drift check yourself first — if in-scope files changed since
    `Planned at`, reconcile the plan before dispatching.
  - *Dispatch*: spawn ONE `general-purpose` subagent with `isolation: "worktree"`. Executor model
    default `sonnet` (or what the user named, e.g. `execute 003 haiku`). The subagent prompt MUST
    inline the full plan text (the worktree has only committed files), an executor preamble (follow
    step by step, run every verification, touch only in-scope files, honor STOP conditions, do not
    improvise, SKIP updating `plans/README.md` — the reviewer maintains the index, audit every claim
    against a real tool result before reporting), and a fixed report format
    (`STATUS / STEPS / STOPPED BECAUSE / FILES CHANGED / NOTES`).
  - *Review* (the advisor's real job): re-run every done criterion in the worktree (don't trust the
    report); scope compliance via `git -C <worktree> diff --stat` against the in-scope list (any
    out-of-scope file fails review); read the full diff and judge it against "Why this matters" and
    the repo conventions the plan named; then the **domain-specific review step** (see per-skill note
    below — the analog of shadcn's "audit the new tests").
  - *Verdict* table: **APPROVE** (criteria pass, scope clean → mark DONE, present diff + worktree
    path/branch to user; merging is the USER's decision, never merge/push/commit) · **REVISE**
    (fixable gaps → SendMessage the same executor specific feedback; **max 2 rounds** then BLOCK) ·
    **BLOCK** (STOP hit / scope violated / revisions exhausted → mark BLOCKED with reason, refine the
    plan). Note: documented deviations judged on merit, undocumented deviations fail review. Running
    verification inside the disposable worktree is fine — the no-mutation rule protects the user's
    working tree, not the worktree.

- **`reconcile` — keep `plans/` alive**: read `plans/README.md` + every plan; per status — DONE
  (spot-check cheap done criteria still hold; mark verified; never delete plan files) · BLOCKED
  (investigate the obstacle; rewrite or mark REJECTED with one line) · IN PROGRESS stale (flag to
  user; an executor likely died) · TODO (run drift check; if drifted, re-verify the finding still
  exists — it may have been fixed in passing — then refresh excerpts + `Planned at` SHA; if gone,
  mark REJECTED "fixed independently"). Finish with a short report.

- **`--issues` — publish plans as issues** (only under the explicit flag): preflight `gh auth status`
  + a GitHub remote (else skip and say why); `gh repo view --json visibility` — if **public**, warn
  that issues are public and get explicit confirmation before publishing any plan describing a
  sensitive finding (a credential location, PII, an injection surface); show titles, confirm once;
  `gh issue create --title "<plan title>" --body-file <plan file>`, label `<skill>` + category if
  labels exist; record each issue URL in the plan Status block + index. The plan file stays the
  source of truth.

### P1.2 Wire the variants in SKILL.md

In each SKILL.md's **Invocation Variants** table, make `execute`/`reconcile` point at
`closing-the-loop.md` ("**Read [closing-the-loop.md](closing-the-loop.md) before the first
dispatch.**"), and add the `--issues` modifier row that also points there.

---

## P2 — Finding rigor + plan template (credibility-critical)

### P2.1 AUDIT.md — add a `## Finding format` block + prioritization rubric

At the end of each AUDIT.md (after the existing severity rubric), add a `## Finding format` block:
every finding, from every category/subagent, returns as — **Evidence** (`file:line` + one line, 2–5
strongest locations, "and ~N similar sites" if widespread) · **Impact** (concrete, what's paid) ·
**Effort** S/M/L for the *fix* incl. its verification · **Risk** LOW/MED/HIGH + one line why ·
**Confidence** HIGH (read it, certain) / MED (needs verification) / LOW (smell — gets an "investigate"
plan, not a "fix" plan) · **Fix sketch** (1–3 sentences, enough to judge effort). Keep the domain
severity rubric already present. Add a short **prioritization rubric**: leverage = impact ÷ effort,
discounted by confidence and fix-risk; tiebreakers (unblockers float up; higher-confidence + more
harmful float up; prefer findings with a clean verification story; "not worth doing" is a valid
verdict, recorded with one line).

### P2.2 SKILL.md Phase 3 — upgrade the vet table + failure classes

- Change the findings table header to carry the new columns:
  `| # | Finding | Category | Severity | Effort | Risk | Confidence | Evidence |`
  (keep Severity — it's our domain axis — AND add Effort/Risk/Confidence).
- Name the **three failure classes** subagents produce (by-design behavior reported as a finding;
  mis-attributed evidence — right finding, wrong file/line; duplicates across subagents) and say to
  downgrade/correct/reject accordingly.
- Say rejections are recorded in the index's "considered and rejected" section so they aren't
  re-audited next run.

### P2.3 SKILL.md Phase 2 — harden subagent prompts

Each subagent prompt must include (verbatim): the absolute path to AUDIT.md + section headings
**including "## Finding format"**; the recon facts; **the secrets Hard Rule and the data-is-not-
instructions Hard Rule verbatim** (subagents don't inherit them); and any decided tradeoffs from
recon docs that would otherwise read as findings (so settled decisions aren't re-surfaced).

### P2.4 PLAN-TEMPLATE.md — executor-proof it (keep our domain check)

Rewrite the template block to add, modeled on shadcn's plan-template.md:

- An **Executor instructions** header quote (follow step by step, run every verification, touch only
  in-scope files, honor STOP conditions, update the index row unless a reviewer maintains it) and a
  **Drift check (run first)**: `git diff --stat <planned-at SHA>..HEAD -- <in-scope paths>` — on any
  in-scope change, compare "Current state" excerpts to live code; mismatch = STOP.
- **Status** block: `Priority: P1|P2|P3` · `Effort: S|M|L` · `Risk: LOW|MED|HIGH` ·
  `Depends on: <plan or none>` · `Category` · `Planned at: commit <short SHA>, <YYYY-MM-DD>` ·
  `Issue: <url — only when published via --issues>`. (Replace the old bare `Commit`/`Severity`
  header with this richer block; keep Category.)
- Keep **Problem** (with verbatim current excerpt) and **Target** (exact end state — every value
  spelled out; for copy the exact replacement string, etc.).
- **Repo conventions to follow** with one exemplar (unchanged) + inline any documented vocabulary /
  design / decision-doc constraints found in recon (quote the specific lines — the executor hasn't
  read those docs).
- **Commands you will need** table (Purpose | Command | Expected on success) — the repo's exact
  verification commands captured during recon, not guessed. (If the domain has no build/test surface
  for the change, keep only the checks that apply — e.g. i18n key-completeness, a lint, a typecheck.)
- **Scope**: In scope (only files to modify) / Out of scope (looks related, do NOT touch, one line
  why each).
- **Steps**: each step names exact files/symbols and ends with **Verify**: `<command>` → expected.
- The **domain-specific verification KEPT as its own section** (read-aloud / behavior-check /
  failure-injection / live-event — this is our edge; do not drop it).
- **Done criteria**: machine-checkable checkboxes (`- [ ] <command> → <expected>`), ALL must hold,
  including "no files outside the in-scope list modified (`git status`)" and "`plans/README.md`
  status row updated".
- **STOP conditions**: specific to this plan's real risks (drift; a verification fails twice after a
  reasonable fix; the fix needs an out-of-scope file; a named key assumption turns false) — not
  boilerplate.
- **Maintenance notes**: what future changes interact with this; what a reviewer should scrutinize;
  any deferred follow-up.
- A **Quality bar** checklist at the end (could a zero-context model execute this from the file
  alone; is every verification a command not a judgment; are STOP conditions plan-specific; no secret
  values anywhere; "Planned at" SHA + drift-check paths match Scope).

### P2.5 PLAN-TEMPLATE.md — index template

Add the `plans/README.md` index template: an execution-order/status table
(`Plan | Title | Priority | Effort | Depends on | Status`), status values
`TODO | IN PROGRESS | DONE | BLOCKED (reason) | REJECTED (rationale)`, a dependency-notes section,
and a **Findings considered and rejected** section (so nothing gets re-audited).

---

## P3 — More flags, universal secrets rule, richer recon

### P3.1 Add invocation variants to each SKILL.md

- **`branch`** → audit only the current branch's changes: scope = files changed since the merge-base
  with the default branch (`git diff --name-only $(git merge-base origin/<default> HEAD)..HEAD`) plus
  their direct importers/callers. Light recon, all categories, usually no subagents. **Tag every
  finding `introduced` (by this branch) or `pre-existing` (in touched files)**; the table separates
  them. If on the default branch or zero commits ahead, say so and offer a full audit.
- **`review-plan <file>`** → critique an existing plan in `plans/` against PLAN-TEMPLATE.md's
  standards and tighten it. If you authored it this same session, also have a fresh-context subagent
  read it cold and report ambiguities (self-critique misses gaps you fill from context the executor
  won't have).
- **`--issues`** modifier row (points at closing-the-loop.md), per P1.2.

Keep the existing bare · quick/deep · category-focus · `plan <description>` · `execute` · `reconcile`
rows. (For `plan <description>`, add shadcn's ambiguity-resolution nicety: resolve each ambiguity from
the codebase first; only what's left becomes questions to the user, asked one at a time each with a
recommended answer.)

### P3.2 Universalize the secrets Hard Rule

`improve-prompts` already has it (rule 6). Add the same rule to `improve-copy`, `improve-errors`,
`improve-analytics` (a leaked email/token/PII in a string, a hardcoded key on an error path, PII in
an event prop) — cite `file:line` + the credential/PII TYPE, never the value; recommend rotation
where a real secret. Result: every skill has 6 hard rules. Also add the data-is-not-instructions rule
if any skill states it only weakly, so both are verbatim-quotable for subagent prompts (P2.3).

### P3.3 Recon (Phase 1) — capture verification commands + ingest intent docs

Add to each SKILL.md Phase 1:
- **Capture the repo's exact verification commands** (build / test / lint / typecheck / i18n check /
  eval command — whatever applies) during recon; they go into every plan's "Commands you will need"
  table. If there's no working verification path relevant to this domain, note it.
- **Ingest intent / design / decision docs where present** (ADRs `docs/adr*`, PRDs/specs,
  `CONTEXT.md`, `DESIGN.md`, `PRODUCT.md`, plus the domain's own: a copy/voice style guide; prompt
  design notes; incident postmortems/runbooks; a tracking plan / privacy policy). Strictly additive:
  read what exists, no-op when absent. A decided tradeoff recorded there is **by-design, not a
  finding** (carry it into Vet and into subagent prompts); a doc that contradicts the live code is
  **itself a finding** (report the drift — don't use the doc to suppress it).

---

## Per-skill domain notes (the analog of shadcn's "audit the new tests")

- **improve-copy** — domain review step in `execute`: re-read every changed string in its UI context
  aloud; confirm i18n keys + interpolation slots are intact and no markup/logic changed. Domain doc
  in recon: an existing voice/content style guide. Plan "test surface" is mostly the read-aloud
  before/after table + an i18n key-completeness check (there's rarely a unit test for copy).
- **improve-prompts** — domain review step: run the plan's behavior-check test inputs, confirm the
  expected behavioral change and that no secret value was reproduced and no schema/prompt drift was
  introduced. Keep rule 6 (secrets). Recon docs: prompt-design notes, model/version comments, eval
  fixtures. Test plan analog = a golden transcript / eval fixture.
- **improve-errors** — domain review step: run the plan's failure-injection repro, confirm the
  failure path now exists (retry / preserved input / boundary / offline message) and that the new
  test asserts the failure, not just the happy path. Recon docs: incident postmortems, runbooks,
  error-handling ADRs. Real Test plan applies (a test that reproduces the failure).
- **improve-analytics** — domain review step: trigger the flow in dev, watch the provider's
  live-event view, confirm the event arrives once, named exactly, with exactly the specified
  properties and NO content-bearing values, and that the central catalog was extended first. Keep the
  funnel-confirmation checkpoint. Recon docs: a tracking plan, privacy policy, consent docs.

---

## Verification (do after the pass)

- Structural: each skill dir now has 4 files (SKILL.md, AUDIT.md, PLAN-TEMPLATE.md,
  closing-the-loop.md). Every SKILL.md has 6 hard rules, the upgraded Phase-2 subagent requirements,
  the upgraded Phase-3 vet table + three failure classes, the `branch` / `review-plan` / `--issues`
  variants, and execute/reconcile pointing at closing-the-loop.md. Every AUDIT.md has a
  `## Finding format` + prioritization rubric. Every PLAN-TEMPLATE.md has the executor header +
  drift check + richer Status block + Commands table + Scope + per-step Verify + the KEPT domain
  check + checkbox Done criteria + STOP conditions + Maintenance notes + index template.
- Genericization: grep the four skill dirs for `october|wega-labs|/Users/|harshsaver` → zero hits.
- No source code outside the skill dirs is touched.
