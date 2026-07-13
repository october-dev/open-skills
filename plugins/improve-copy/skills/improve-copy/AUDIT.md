# Copy Audit Playbook

The eight audit categories, what to look for in each, and the exact targets to cite in findings and plans. The bar is distilled from Torrey Podmajersky's *Strategic Writing for UX*, Apple's Human Interface Guidelines on writing, Material Design's writing guidance, and the Mailchimp Content Style Guide. When a category names a target shape or a kill-list, copy it — don't paraphrase it away.

## 1. Buttons & actions say what they do

A button label is the answer to "what happens when I press this?" — verb-first and specific: `Delete project`, not `Delete`; `Save changes`, not `OK`.

- **`OK` / `Yes` / `No` / `Submit` / `Continue` on a consequential action is always a finding.** A confirmation dialog's title is a specific question ("Delete 'Atlas' and its 3 screens?") and its buttons are the answers ("Delete project" / "Cancel") — never a generic "OK / Cancel" pair under a vague title.
- Destructive buttons name the object and are never the visually-primary default.

Hunt for: `>OK<`, `>Yes<`, `>Submit<`, generic `Continue`, dialogs whose buttons don't answer their title.

## 2. Error messages: what happened, why, what now

Every user-facing error must carry (a) what happened in plain words, (b) why, if known, and (c) the next action. Target shape: `Couldn't save your changes — you're offline. They'll retry when you reconnect.`

- **"Something went wrong" with no action is always a finding.** So are raw error codes or stack fragments shown without translation, and blame-the-user phrasing ("Invalid input" → say what *is* valid).
- Never "please try again" as the only guidance when the retry can be automatic or a cause is known.
- Apologize at most once, and only for real damage; never "Oops!" on a destructive failure.

Hunt for: generic catch-all toasts, `error.message` piped straight to the UI, `Invalid`, `Failed to`, HTTP status numbers appearing in copy.

## 3. Empty states teach

A blank region is a dead end. An empty state says what belongs here and how to create it, ideally with the action inline ("No screens yet — press ⌘N or ask the agent to scaffold one").

- Distinguish first-run empty ("you haven't made one yet") from filtered/searched-empty ("No matches for 'foo'" + a clear-filter action) from error-empty (that's category 2, not an empty state).

Hunt for: bare "No results", "Nothing here", empty `map()` renders with no fallback branch.

## 4. Consistency: casing, terminology, person

- **One casing convention.** Recommend sentence case for buttons, headers, and menus (it reads faster and is the modern default); Title Case is acceptable if it already dominates — the finding is the MIX, not the choice. Tally both conventions and report the minority set as the fix list.
- **One name per concept.** "Workspace" on one screen and "project" on another for the same object is a HIGH finding; build the terminology map in recon and diff against it.
- **One person.** "Your projects" (the product speaks to the user) — never mixed with "My projects" in the same product. Pick whichever dominates and align the rest.
- Punctuation: no periods on fragments and labels; periods on complete-sentence body copy; a budget of one exclamation point per surface.

## 5. Tone calibrated to the moment

Tone follows the user's emotional state, not the brand's: errors are calm and direct, success can be warm, destructive confirmations are sober, onboarding may be friendly. A joke inside a failure or a payment flow is a finding.

- Robot-voice ("An error has occurred while attempting to…") and corporate filler ("Please note that", "In order to") are findings — contractions and plain words are the target register.

## 6. Microcopy mechanics

- Placeholder text is NOT a label — it disappears on input. If it carries required information, that's a finding (move it to a label or helper text). Placeholders show format examples only.
- Tooltips add information; a tooltip that repeats the button's own label is a finding (delete it).
- Loading states name the work when it's slow ("Cloning repo…" beats a bare spinner for anything ≥2s).
- Keyboard-shortcut hints, units, and timestamps are formatted consistently across the product.

## 7. Concision & front-loading

- Front-load the point: the first three words carry the message, because users scan. Trailing qualifiers move up or die.
- Filler kill-list: "please note", "in order to", "simply", "just", "actually", "there is / there are".
- A wall of text in a dialog is a finding: one idea per sentence, ≤2 sentences per dialog body, link out for detail.

## 8. Missed opportunities

The additive category — places with NO copy that need it:

- Unlabeled icon-only buttons users hesitate on.
- Silent successes (something saved with no confirmation).
- Destructive actions without specifics (no count, no name).
- Keyboard shortcuts with no discoverability hint.

Report a handful, grounded in real UI seams you observed — not a wishlist.

## Severity rubric

**HIGH** = user-blocking or trust-damaging: dead-end errors, lying or ambiguous destructive confirmations, terminology drift on core objects.

**MEDIUM** = friction: generic buttons, mixed casing, placeholder-as-label.

**LOW** = polish: filler words, tone warmth, tooltip dedup.

## Finding format

Every finding, from every category and every subagent, comes back in this shape. Severity above is the domain axis; the fields below let the advisor rank and the executor scope.

```markdown
### [CATEGORY-NN] Short imperative title

- **Evidence**: `path/to/file.tsx:123` — the verbatim current string, one line on where the user sees it. (Repeat per location; 2–5 strongest, note "and ~N similar sites" if the pattern is widespread — e.g. the same generic toast in 12 places.) Never paste a secret or PII value here: cite the `file:line` and the type only (Hard Rule 6).
- **Impact**: What the current copy costs the user — concrete. "The offline save failure dead-ends with 'Something went wrong'; the user retypes lost work", not "reads poorly".
- **Effort**: S (a few strings, one file) / M (a surface's worth, or a terminology sweep across several files) / L (multi-surface, needs product answers) — for the *fix*, including its verification.
- **Risk**: What the rewrite could break — LOW/MED/HIGH plus one line. Copy risk is usually LOW, but MED/HIGH when a string is inside interpolation logic, a shared i18n key used in multiple contexts, or a length-constrained UI slot.
- **Confidence**: HIGH (read the string in context, certain it's wrong) / MED (looks wrong but the real cause / brand intent needs a product answer) / LOW (a smell — needs investigation). A LOW-confidence finding may be reported, but it gets an "investigate / confirm intent" plan, not a "rewrite" plan.
- **Fix sketch**: 1–3 sentences — the direction and, where you already know it, the exact replacement string. Enough to judge effort honestly; the full replacement is spelled out later in the plan.
```

## Prioritization rubric

Order findings by **leverage = impact ÷ effort, discounted by confidence and fix-risk**. Tiebreakers:

1. Anything that unblocks other findings floats up (settle the terminology map before rewriting the strings that depend on it).
2. HIGH-severity + HIGH-confidence findings float above equal-leverage polish.
3. Prefer findings with a clean verification story — an exact replacement string that reads cleanly aloud and passes the i18n key-completeness check is a safe win; a rewrite that hinges on a product answer you don't have is not.
4. "The copy here is already right" — or "not worth the churn" — is a valid verdict. Record it in the index's "Findings considered and rejected" section with one line of reasoning, so it isn't re-audited next run.
