# 001 — Build the `improve-copy` skill

- **Status**: TODO
- **Deliverable**: `improve-copy/` skill folder (SKILL.md, AUDIT.md, PLAN-TEMPLATE.md), generic and
  open-source ready
- **Read first**: `README.md` in this folder (shared anatomy — follow it exactly), then the reference
  implementation at `/Users/harsh/Wega-Labs/october-desktop/.claude/skills/improve-animations/`
  (all three files) as the structural exemplar.

## What this skill does

Surveys every user-facing string in a codebase — button labels, error messages, empty states,
toasts, tooltips, placeholders, confirmation dialogs, onboarding copy — as a senior UX writer, then
produces a vetted findings table and self-contained rewrite plans. Read-only on source; plans go to
`plans/` (or `copy-plans/` if taken).

SKILL.md `description` (frontmatter, tune for discovery): "Survey a codebase's user-facing copy —
error messages, empty states, button labels, microcopy — as a senior UX writer, then produce a
prioritized audit and self-contained rewrite plans for other agents to execute. Use when the user
asks to 'improve the copy', 'audit the UX writing', 'fix our error messages', or wants the product
to sound more professional/consistent."

## Recon phase specifics (Phase 1 deltas)

- **Where strings live**: JSX text nodes, `title=`/`placeholder=`/`aria-label=`/`alt=` attributes,
  toast/alert/dialog calls, i18n message files (`en.json`, `messages.ts`), backend-sent messages
  surfaced in UI, CLI output if the product is a CLI.
- **Voice baseline**: does the product have a stated voice (marketing site, existing style doc)?
  Casing convention in the wild (tally Title Case vs Sentence case across buttons/headers).
- **Terminology map**: the product's nouns (what do they call the core objects?) — needed to catch
  drift.
- **Frequency/criticality map**: strings on the critical path (composer, primary CTA, most-hit
  errors) vs. settings-page depths vs. once-ever onboarding.
- Useful sweeps: `grep -rn "Something went wrong\|Oops\|An error occurred\|Please try again"`,
  `placeholder=`, `confirm(`, `alert(`, `toast`, `aria-label`, `>OK<`, `>Yes<`, `>Submit<`.

## AUDIT.md — write this rule catalog (the taste bar; adapt wording, keep every rule and value)

Preamble: bar distilled from Torrey Podmajersky (*Strategic Writing for UX*), Apple HIG Writing,
Material Design writing guidance, and the Mailchimp Content Style Guide. State this attribution in
the file.

### 1. Buttons & actions say what they do

- A button label is the answer to "what happens when I press this?" — verb-first, specific:
  `Delete project`, not `Delete`; `Save changes`, not `OK`.
- **`OK` / `Yes` / `No` / `Submit` / `Continue` on a consequential action is always a finding.**
  Confirmation dialogs: title is a specific question ("Delete 'Atlas' and its 3 screens?"), buttons
  are the answers ("Delete project" / "Cancel").
- Destructive buttons name the object and are never the visually-primary default.
- Hunt for: `>OK<`, `>Yes<`, `>Submit<`, generic `Continue`, dialogs whose buttons don't answer
  their title.

### 2. Error messages: what happened, why, what now

Every user-facing error must carry (a) what happened in plain words, (b) why if known, (c) the next
action. Target shape: `Couldn't save your changes — you're offline. They'll retry when you reconnect.`

- **"Something went wrong" with no action is always a finding.** So are raw error codes/stack
  fragments shown without translation, and blame-the-user phrasing ("Invalid input" → say what's
  valid).
- Never "please try again" as the only guidance when retry can be automatic or a cause is known.
- Apologize at most once, only for real damage; never "Oops!" on a destructive failure.
- Hunt for: generic catch-all toasts, `error.message` piped straight to UI, `Invalid`, `Failed to`,
  HTTP status numbers in copy.

### 3. Empty states teach

- A blank region is a dead end; an empty state says what belongs here and how to create it, ideally
  with the action inline ("No screens yet — press ⌘N or ask the agent to scaffold one").
- Distinguish first-run empty ("you haven't made one yet") from filtered/searched-empty ("no matches
  for 'foo'" + clear-filter action) from error-empty (that's category 2, not an empty state).
- Hunt for: bare "No results", "Nothing here", empty `map()` renders with no fallback branch.

### 4. Consistency: casing, terminology, person

- **One casing convention.** Recommend sentence case for buttons/headers/menus (screen-readable,
  modern default); Title Case acceptable if already dominant — the finding is the MIX, not the
  choice. Tally both; report the minority set as the fix list.
- **One name per concept.** "Workspace" on one screen and "project" on another for the same object
  is a HIGH finding; build the terminology map in recon and diff against it.
- **One person.** "Your projects" (product speaks to user) — never mixed with "My projects" in the
  same product. Pick whichever dominates.
- Punctuation: no periods on fragments/labels; periods on complete-sentence body copy; one
  exclamation point budget per surface.

### 5. Tone calibrated to the moment

- Tone follows the user's emotional state, not the brand's: errors are calm and direct, success can
  be warm, destructive confirmations are sober, onboarding may be friendly. A joke inside a failure
  or payment flow is a finding.
- Robot-voice ("An error has occurred while attempting to…") and corporate filler ("Please note
  that", "In order to") are findings — contractions and plain words are the target register.

### 6. Microcopy mechanics

- Placeholder text is NOT a label — it disappears on input; if it carries required information,
  that's a finding (move to a label or helper text). Placeholders show format examples only.
- Tooltips add information; a tooltip repeating the button's label is a finding (delete it).
- Loading states name the work when it's slow ("Cloning repo…" beats a bare spinner ≥2s).
- Keyboard-shortcut hints, units, and timestamps formatted consistently.

### 7. Concision & front-loading

- Front-load the point: first three words carry the message (users scan). Trailing qualifiers move
  up or die.
- Filler kill-list: "please note", "in order to", "simply", "just", "actually", "there is/are".
- A wall of text in a dialog is a finding: 1 idea per sentence, ≤2 sentences per dialog body, link
  out for detail.

### 8. Missed opportunities

Places with NO copy that need it: unlabeled icon-only buttons users hesitate on, silent successes
(saved with no confirmation), destructive actions without specifics (counts, names), keyboard
shortcuts with no discoverability. Report a handful, grounded in real UI seams.

### Severity rubric

HIGH = user-blocking or trust-damaging (dead-end errors, lying/ambiguous destructive confirms,
terminology drift on core objects). MEDIUM = friction (generic buttons, mixed casing, placeholder
-as-label). LOW = polish (filler words, tone warmth, tooltip dedup).

## PLAN-TEMPLATE.md delta

Same skeleton as the reference. The feel-check analog is the **read-aloud check**: "read the new
copy out loud in the UI context; it should sound like a competent human explaining, not a system
reporting. Paste the before/after table for a human to skim." Plans for copy findings MUST contain
the exact replacement string for every citation (never "make it friendlier") and must preserve i18n
keys/interpolation slots verbatim.

## Steps

1. Create `improve-copy/` with the three files, copying structure from the reference implementation.
2. Write AUDIT.md from the catalog above — keep the hunt-for greps and severity rubric.
3. Write SKILL.md per the shared anatomy (README.md of this folder), with the recon specifics above
   and category-focus variants (`errors`, `empty-states`, `consistency`, `tone`).
4. Write PLAN-TEMPLATE.md with the read-aloud verification.
5. Strip every October/local-path reference from the shipped files (generic examples only).

## Verification

- Structural: three files exist; SKILL.md hard rules match the shared anatomy verbatim; no absolute
  local paths inside the skill folder.
- Live test: install into a real repo (e.g. `~/.claude/skills/` on this machine), run bare
  `improve-copy` against `/Users/harsh/Wega-Labs/october-desktop` — it must produce recon, a vetted
  findings table with verbatim string citations, stop for selection, and write ≥1 self-contained
  plan with exact replacement strings. Confirm `git status` in the target repo shows ZERO source
  modifications.
- Negative test: ask it to "just fix the strings directly" — it must decline and point to
  `execute`.
