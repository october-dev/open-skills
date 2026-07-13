# Plan Template

Every plan written by `improve-prompts` follows this structure. The executor may be a less capable model with zero context and zero judgment — the plan must contain everything, exactly. No references to "the audit above" or "the rewrite we discussed." A rewrite shows the **full before and full after prompt text**, never a described edit ("add a rule about JSON", "tighten the tool description") — the executor pastes the after text in, it does not compose it.

```markdown
# NNN — <Short imperative title>

- **Status**: TODO
- **Commit**: <output of `git rev-parse --short HEAD` when this plan was written>
- **Severity**: HIGH | MEDIUM | LOW
- **Category**: <audit category>
- **Estimated scope**: <n prompts/files, rough size>

## Problem

What is wrong, where, and why it changes model behavior. Cite every location as
`path/to/file.ts:123` and include the current prompt text verbatim. If the finding
involves a secret, redact the value:

​```text
// src/agent/system-prompt.ts:12 — current
Always respond in strict JSON.
For greetings, reply casually with a friendly sentence.
​```

Explain the behavioral failure concretely: "On the input `"hi"`, both rules bind —
the model must both emit strict JSON and reply with a casual sentence — and it
resolves the conflict differently across runs."

## Target

The exact end state as full prompt text. Every rule spelled out; precedence stated
where it matters. Never "make the rules consistent":

​```text
// target — full replacement for src/agent/system-prompt.ts:12
Respond in strict JSON matching the schema. This rule always wins.
Exception: when the user only greets you (e.g. "hi", "hello") and asks nothing,
return {"reply": "<one friendly sentence>", "kind": "greeting"} — still valid JSON.
​```

For tool-description or example rewrites, show the complete before/after object or
example block, not a diff fragment.

## Repo conventions to follow

How this codebase already assembles prompts, with one exemplar the executor should
imitate (delimiter convention, where tool descriptions live, how examples are tagged):

- User/retrieved content is wrapped in `<user_data>…</user_data>` tags elsewhere in
  this fleet — reuse that convention, don't invent a new one.
- <exemplar file:line that already does this correctly>

## Steps

1. <One concrete edit per step: file, the exact old text to find, the exact new text.>
2. …

## Boundaries

- Do NOT touch <prompts/files out of scope>.
- Do NOT change the paired schema or tool signature unless a step says so — prompt text only.
- Do NOT add new dependencies.
- Do NOT reproduce any secret; if a step surfaces one, redact it and report.
- If a step doesn't match the code you find (drift since the commit stamp), STOP and report instead of improvising.

## Verification

- **Mechanical**: <exact commands — typecheck, lint, and any prompt/schema validation — with expected outcome>.
- **Behavior check**: run the affected prompt against 2–3 concrete test inputs and confirm the expected behavioral difference. Spell out input → before → after for each:
  - Input `"hi"` → **before**: sometimes plain text, sometimes JSON (nondeterministic) → **after**: always `{"reply": "…", "kind": "greeting"}`.
  - Input `{ topic: "" }` (empty slot) → **before**: prompt ships "Answer about " → **after**: guard fills the fallback, or the request is rejected.
  - <one edge case the prompt worried about in prose>.
- **Evals**: run the existing evals if any (`<command>`) and confirm they still pass. If none cover this prompt, the last step of this plan is adding one golden test — a single input and its expected output — so the behavior is pinned going forward.
- **Done when**: <machine- or transcript-checkable completion criteria>.
```

## Notes for the plan author

- One plan per finding. If two findings share every file and the same fix pattern (e.g. the same delimiter convention added around several interpolation slots), they may merge into one plan.
- Pull every rule and value from [AUDIT.md](AUDIT.md) — never approximate from memory.
- The behavior check is not optional. A prompt can be mechanically valid (typechecks, matches the schema) and still misbehave; give the executor — and the human reviewing the executor's diff — concrete inputs and the exact expected difference to watch for.
- Rewrites carry the full before/after prompt text. If you find yourself describing an edit in prose rather than showing the replacement text, the plan is not finished.
- Never write a secret into a plan. Cite `file:line` and redact.
- After writing plans, create or update `plans/README.md` with: a table of plans (number, title, severity, status), the recommended execution order, and any dependencies between plans.
