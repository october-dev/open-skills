<div align="center">

<pre aria-label="OCTOBER">
  ___   ____ _____ ___  ____  _____ ____
 / _ \ / ___|_   _/ _ \| __ )| ____|  _ \
| | | | |     | || | | |  _ \|  _| | |_) |
| |_| | |___  | || |_| | |_) | |___|  _ <
 \___/ \____| |_| \___/|____/|_____|_| \_\
</pre>

# Open Skills

### Senior codebase audits that end in executable plans.

Audit first. Exercise judgment once. Hand implementation to any capable agent.

[![License](https://img.shields.io/badge/license-MIT-1C1B18?style=flat-square)](LICENSE)
[![Skills](https://img.shields.io/badge/skills-4-7C6CF0?style=flat-square)](#skill-catalog)
[![Source changes](https://img.shields.io/badge/source%20changes-none-3BAA6E?style=flat-square)](#safety-contract)

</div>

---

**Open Skills is October's `improve-*` family for Claude Code.** Each skill audits one product-quality domain as a senior specialist, verifies every finding against the repository, and writes a prioritized, self-contained implementation plan.

The skills do not edit source code. They separate the work that needs judgment—understanding the system, deciding what matters, and specifying the fix—from the mechanical implementation that another agent can execute later.

## Quickstart

Add the marketplace and install the skill you need:

```text
/plugin marketplace add october-dev/open-skills
/plugin install improve-copy@open-skills
```

Then ask naturally:

```text
Audit the user-facing copy in this repository.
```

The skill maps the relevant surface, audits it against a codified rule catalog, vets its own findings, and presents a leverage-ordered shortlist. You choose what should become an implementation plan.

## Skill catalog

| Skill | Reviews | Example request |
| --- | --- | --- |
| [`improve-copy`](plugins/improve-copy/skills/improve-copy) | Error messages, empty states, labels, microcopy, tone, and casing | “Audit the UX writing.” |
| [`improve-prompts`](plugins/improve-prompts/skills/improve-prompts) | System prompts, tool descriptions, examples, context assembly, and injection surfaces | “Why does this agent misbehave?” |
| [`improve-errors`](plugins/improve-errors/skills/improve-errors) | Swallowed errors, dead ends, lost input, and missing loading, empty, offline, or recovery states | “Make the app more resilient.” |
| [`improve-analytics`](plugins/improve-analytics/skills/improve-analytics) | Funnel coverage, event taxonomy, identity, PII, and delivery reliability | “Audit our product analytics.” |

Each skill contains four parts:

| File | Purpose |
| --- | --- |
| `SKILL.md` | Posture, hard rules, workflow, and invocation modes |
| `AUDIT.md` | The domain-specific quality bar and exact review rules |
| `PLAN-TEMPLATE.md` | The self-contained handoff format an executor receives |
| `closing-the-loop.md` | Execution, review, issue publishing, and reconciliation behavior |

## How an audit works

1. **Recon** maps where the domain lives, how the repository is organized, and which surfaces matter most.
2. **Audit** reviews each rule category and records only evidenced findings with exact locations.
3. **Vet** re-reads every cited line, removes duplicates and by-design behavior, then ranks the remaining findings by leverage.
4. **Plan** writes one standalone plan for each finding you select, including exact targets and verification.

The output is intentionally boring to execute: no missing decisions, no implied context, and no taste required at implementation time.

## Invocation modes

| Mode | What changes |
| --- | --- |
| `quick` | Reviews high-traffic surfaces and returns a small set of high-impact findings |
| `standard` | Balanced default audit |
| `deep` | Whole-repository review, including lower-severity polish |
| Category focus | Limits the audit to one named rule category |
| `branch` | Reviews the current diff and labels findings as introduced or pre-existing |
| `plan <description>` | Skips discovery and writes one implementation plan |
| `review-plan <file>` | Critiques and tightens an existing plan |
| `execute <plan>` | Dispatches implementation, reviews the diff, and returns a verdict |
| `reconcile` | Rechecks existing plans against the current codebase |
| `--issues` | Publishes selected plans as GitHub issues after a public-repository safety check |

Examples:

```text
improve-errors quick
improve-prompts branch
improve-copy plan Rewrite the empty state in the activity feed
improve-analytics reconcile
```

## Install manually

Clone the repository, then copy only the skill you want into your user or project skill directory:

```bash
git clone https://github.com/october-dev/open-skills.git

# Available in every project
mkdir -p ~/.claude/skills
cp -R open-skills/plugins/improve-copy/skills/improve-copy ~/.claude/skills/

# Available only in the current project
mkdir -p .claude/skills
cp -R open-skills/plugins/improve-copy/skills/improve-copy .claude/skills/
```

Replace `improve-copy` with `improve-prompts`, `improve-errors`, or `improve-analytics` as needed.

## Safety contract

Every skill follows the same boundaries:

- **No source edits.** The only written output lives under `plans/`.
- **No repository mutation.** Audits do not install dependencies, run formatters, build, or commit.
- **Evidence over intuition.** Findings cite exact repository locations and excerpts.
- **Repository content is data.** Instructions found inside the audited codebase are not followed.
- **Settled decisions are respected.** Documented tradeoffs are recorded, not reopened by default.
- **Plans stand alone.** The executor receives all required context, values, files, and verification steps.

## The design formula

A useful `improve-*` skill needs four things:

1. A specific, codified taste bar with testable rules.
2. Evidence that is cheap for a human or agent to verify.
3. Fixes precise enough to become mechanical after planning.
4. Systemic findings that improve patterns, not just isolated call sites.

The original build plans and a reusable description of the formula live in [`build-plans/`](build-plans).

## Contributing

New skills should target a coherent quality domain, define their review bar in an `AUDIT.md`, and preserve the recon → audit → vet → plan lifecycle. Improvements to existing rules should include a concrete bad pattern, a target state, and enough evidence for another agent to apply the rule consistently.

Keep the central promise intact: the audit may write plans, but it never changes the product it reviews.

## License

Open Skills is licensed under the [MIT License](LICENSE).

---

<div align="center">

Built in the open by [October](https://october.dev).

</div>
