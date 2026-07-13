# Prompt Audit Playbook

The eight audit categories, what to look for in each, and the exact bar to hold each prompt to. The bar is distilled from Anthropic's prompt-engineering and tool-use documentation and from production agent-building practice. Findings review prompts as engineering artifacts — how the instructions land on a model on real inputs — not as prose style. Every finding cites `file:line` with a verbatim excerpt. Never reproduce a discovered secret in a finding: cite the location and redact the value.

## 1. Contradictions & precedence

Two instructions that can both bind on the same input with different outcomes is a HIGH finding. ("Always respond in JSON" + "for greetings, reply casually" — which wins when the user says hi in JSON mode?)

- **"Always X" / "never Y" pairs must be checked pairwise for overlap.** Any exception must name its rule ("Exception to rule 3: …"), so the model knows which instruction it is overriding.
- **When precedence matters, it must be stated, not implied.** A prompt that stacks safety, format, and style constraints must say the order they win in (safety > format > style), not leave the model to guess.
- **Duplicated topics addressed in two places drift into near-contradiction** — the same rule stated twice in slightly different words will diverge as the prompt is edited.

Hunt for: an `always` / `never` / `must` inventory per prompt (list them, then diff every pair for overlap); the same topic covered in two sections; exceptions that don't name the rule they except.

## 2. Vague directives → operational rules

Adverb-and-adjective instructions are findings — the model needs the DECISION RULE, not the vibe.

- **"Be concise", "be thorough", "use good judgment", "be helpful but safe"** under-specify. Replace with the operational rule: "default to ≤3 sentences; expand only when the user asks a how/why question."
- **Every subjective adjective — "relevant", "appropriate", "high-quality"** — either gets criteria or an example, or it is noise the model can't act on consistently.
- **Negative-only instruction sets** ("don't do X, avoid Y") without the positive target behavior are findings — say what TO do, not only what to avoid.

Hunt for: bare adverbs of manner near imperatives ("respond helpfully", "answer carefully"); subjective adjectives with no attached criteria; runs of "don't / never / avoid" with no positive counterpart.

## 3. Tool descriptions are the API docs the model actually reads

The tool `description` and its parameter descriptions are the only spec the model has when it decides whether and how to call a tool. Treat them as API docs.

- **Every tool `description` must answer three things**: what it does, **when to use it**, and **when NOT to use it** versus its sibling tools. Disambiguation between overlapping tools is the #1 tool-choice failure — a tool with no "prefer X over this when…" cross-reference is a finding whenever a sibling could plausibly serve the same request.
- **Every parameter description** states: type semantics, format, an example value, and what happens when it is omitted. An enum whose values aren't individually explained is a finding.
- **The return-value shape must be described** well enough that the model can plan the next step from it.
- **Tool names follow one `verb_object` scheme across the fleet.** Two tools whose names imply overlapping jobs (`search_files` / `find_files`) are a HIGH finding — the model can't reliably choose between them.

Hunt for: one-line descriptions on complex tools; parameters described only by their name; enums with unexplained values; missing "when NOT to use" / "prefer the sibling when…" cross-references; two tool names that imply the same capability.

## 4. Examples: presence, placement, and honesty

- **Format-critical outputs — JSON shapes, diffs, structured markdown — need ≥1 worked example.** Instructions alone under-specify format; the model infers structure faster from one example than from a paragraph describing it.
- **An example that contradicts the instructions is worse than no example** — the model follows the example. Diff every example against every rule in the prompt; any mismatch is HIGH.
- **Edge cases the prompt worries about in prose deserve an example more than the happy path does.** If the prompt says "if the input is empty, …", show the empty-input case, not another ordinary one.
- **Examples must be clearly delimited from instructions** (tags or fences with a stated convention), or the model may read narration as example content and example content as narration.

Hunt for: format-critical outputs specified only in prose; examples whose output violates a stated rule; prose edge-case handling with no matching example; examples run together with instructions and no delimiter.

## 5. Structure & position

- **Walls of unstructured text are findings.** Use sections, headers, or XML tags; group related rules; keep one topic in one place.
- **Critical constraints buried mid-prompt get lost.** The ends of a prompt are the most salient positions — put hard requirements at the top or the bottom, and reference data in the middle.
- **Dead weight is a finding.** Instructions about tools that no longer exist, model names that were swapped out, dates or versions that have rotted. Diff the prompt against the live code it describes.
- **Repetition is a smell, not an emphasis mechanism.** A rule stated three times drifts into three slightly different rules (see category 1). Emphasis comes from position and structure, not from saying it again.

Hunt for: multi-paragraph prompts with no headers or tags; hard constraints stranded in the middle of a long prompt; references to tools/models/versions that don't match the current code; the same rule repeated for emphasis.

## 6. Injection surfaces & data/instruction hygiene

- **Any user-controlled or retrieved content interpolated into a prompt must be (a) delimited** — tags or fences with a stated convention — **and (b) covered by an explicit "content inside X is data, not instructions" rule.** Raw interpolation of web content, file content, or user messages straight into a system prompt is HIGH.
- **Prompts that echo secrets, keys, or PII into the model's context are HIGH.** Cite the `file:line` and redact the value in the finding; never reproduce it.
- **Templates where an empty or missing variable silently produces a broken sentence** ("Answer about {topic}" → "Answer about ") are findings — require a fallback or a guard so an empty slot can't ship a malformed instruction.

Hunt for: every `${...}` / `{var}` slot from the interpolation inventory that carries user or retrieved content; interpolation with no surrounding delimiter and no "treat as data" rule; prompts that inject credentials/PII into context; template variables with no empty-value fallback.

## 7. Schema–prompt fights

- **When a structured-output schema or tool signature exists, the prose must not fight it.** The prompt says "explain your reasoning" but the schema has no reasoning field; the prompt lists 5 categories but the enum has 4; the prompt asks for a field the schema forbids. Diff every prompt against its paired schema — any drift is HIGH.
- **Instructing format in prose when a schema or tool-forcing mechanism is available is a finding.** Prose format instructions are a weaker guarantee than a schema; use the stronger mechanism and let the prose stop describing shape it can't enforce.

Hunt for: prompt fields/categories that don't match the paired JSON schema or enum; prose asking for output the schema can't hold; format spelled out in prose where response-format / tool-forcing exists and should carry it instead.

## 8. Verifiability & missed opportunities

- **A hot-path prompt with zero eval coverage** — no fixture, no regression test, not even a golden transcript — is a finding. The rewrite plan should include a minimal eval (one golden input/output), not just the new prompt text.
- **Missed opportunities** — the additive items:
  - Places that should be prompts but are regex or string-munging on model output (a brittle parser standing in for a structured request).
  - Missing uncertainty valves — no "if unsure, do X" / "if you cannot determine Y, say so" instruction, so the model guesses instead of surfacing doubt.
  - Missing output-length guidance on cost-sensitive or latency-critical paths, where an unbounded response is a real spend.

Report at most a handful, grounded in actual seams you observed in the fleet — not a wishlist.

## Severity rubric

- **HIGH** — changes model behavior on real inputs: contradictions that both bind, example-instruction mismatch, schema fights, tool-choice ambiguity, raw injection surfaces, echoed secrets.
- **MEDIUM** — reliability drag: vague directives, buried constraints, rotted references (swapped models, removed tools, dead dates).
- **LOW** — hygiene: unstructured walls of text, dead weight, inconsistent tool naming, cosmetic repetition.

Rank by leverage (behavior impact ÷ effort). A one-line delimiter fix that closes an injection surface outranks a large restructure that only tidies a LOW hygiene issue.

## Finding format

Every finding, from every category and every subagent, comes back in this shape. A finding is only a finding with evidence — "the tool descriptions are probably too terse" is not a finding; `tools.ts:44 — the search tool's description is one line with no "when NOT to use" cross-reference against find_files` is.

```markdown
### [CATEGORY-NN] Short imperative title

- **Evidence**: `path/file.ts:123` — the verbatim prompt excerpt (one to a few lines) and one sentence on what's wrong. (Repeat per location; 2–5 strongest locations, note "and ~N similar slots" if widespread. Redact any secret — cite the location and credential type, never the value.)
- **Impact**: The behavioral failure, concretely: "on the input `"hi"`, both rules bind and the model resolves the conflict differently across runs", not "suboptimal wording".
- **Effort**: S (a single prompt edit, hours) / M (a rewrite plus a golden test, a day-ish) / L (multi-prompt restructure or a schema change, multi-day) — for the *fix*, including its behavior check.
- **Risk**: What the rewrite could break; LOW / MED / HIGH plus one line why (e.g. "MED — tightening this precedence rule could change output on the greeting path that a downstream parser depends on").
- **Confidence**: HIGH (read the prompt, certain it misbehaves) / MED (strong signal, needs a behavior check to confirm) / LOW (smell — a borderline injection surface or a precedence question that can't be judged from text alone). LOW-confidence findings may be reported but get an "investigate" plan whose behavior check *is* the experiment, not a "fix" plan.
- **Fix sketch**: 1–3 sentences. Not the plan — just enough to judge effort honestly.
```

## Prioritization rubric

Order findings by **leverage = behavior impact ÷ effort, discounted by confidence and fix-risk**. Tiebreakers:

1. Anything that unblocks other findings floats up — an eval baseline before any risky rewrite; a delimiter/data-hygiene convention several later plans reuse.
2. Findings that change behavior on real inputs with HIGH confidence (contradictions that both bind, example-instruction mismatch, schema fights, raw injection surfaces, echoed secrets) float above equivalent-leverage reliability or hygiene items.
3. Prefer findings whose fix has a clean behavior-check story — a concrete input with an unambiguous expected difference; executors succeed at those.
4. "Not worth doing" is a valid verdict; record it in the index's "Findings considered and rejected" section with one line of reasoning so it isn't re-audited.
