# skill-maker

An [Agent Skill](https://agentskills.io) that creates other agent skills. It
guides an AI coding agent through the full lifecycle: intent capture, drafting a
SKILL.md, running an eval loop with subagents, refining based on grading
signals, and optimizing the description for trigger accuracy.

The eval loop is the core — it spawns isolated subagents per test case, grades
assertions with bundled Bun TypeScript scripts, aggregates benchmarks, and
iterates until pass_rate plateaus (delta < 2% for 3 consecutive iterations) or
hits 20 iterations.

## What's included

```
skill-maker/
├── SKILL.md                        # Main skill instructions
├── scripts/
│   ├── grade.ts                    # Grade assertions against eval outputs
│   ├── aggregate-benchmark.ts      # Aggregate grading into benchmark.json
│   ├── detect-plateau.ts           # Detect pass_rate plateau across iterations
│   └── validate-skill.ts           # Validate SKILL.md against the spec
├── references/
│   ├── schemas.md                  # JSON schemas for all eval artifact types
│   └── spec-summary.md             # Quick reference of the Agent Skills spec
├── assets/
│   └── skill-template.md           # Starter template with {{PLACEHOLDER}} markers
└── evals/
    └── evals.json                  # Test prompts with quality-focused assertions
```

## Prerequisites

- [Bun](https://bun.sh) — all bundled scripts require Bun
  (`bun run scripts/<name>.ts`)

## Installation

The skill follows the
[Agent Skills specification](https://agentskills.io/specification). Install it
**globally** (available to all projects) or **locally** (scoped to one project).

### Global installation

Global skills are available across all your projects. Copy the `skill-maker`
directory to your global skills location.

**Generic (any Agent Skills-compatible client):**

```bash
mkdir -p ~/.agents/skills
cp -r skill-maker ~/.agents/skills/skill-maker
```

**Claude Code:**

```bash
mkdir -p ~/.claude/skills
cp -r skill-maker ~/.claude/skills/skill-maker
```

**OpenCode:**

```bash
mkdir -p ~/.config/opencode/skills
cp -r skill-maker ~/.config/opencode/skills/skill-maker
```

**Codex:**

```bash
# Codex reads skills from ~/.agents/skills by default
mkdir -p ~/.agents/skills
cp -r skill-maker ~/.agents/skills/skill-maker
```

### Local installation (per-project)

Local skills are scoped to a single project. Place the skill directory in your
project's `.agents/skills/` folder.

```bash
cd /path/to/your/project
mkdir -p .agents/skills
cp -r /path/to/skill-maker .agents/skills/skill-maker
```

Or clone this repo directly into your project:

```bash
cd /path/to/your/project
mkdir -p .agents/skills
git clone git@github.com:accolver/skill-skill.git .agents/skills/skill-skill
# The skill is at .agents/skills/skill-skill/skill-maker/
```

> **Note:** Some clients scan `.agents/skills/` at the project root for local
> skills. Check your client's documentation for the exact path it expects.

### Verify installation

Run the bundled validator to confirm the skill is correctly structured:

```bash
bun run skill-maker/scripts/validate-skill.ts skill-maker
```

Expected output includes `"valid": true` with zero errors.

## Usage

Once installed, ask your coding agent to create a skill. The skill triggers on
prompts like:

- "Create a skill for writing git commit messages"
- "Build a SKILL.md that helps with data pipeline validation"
- "Make a reusable agent workflow for deploying to AWS"
- "Package this debugging process as a skill"

The agent will follow the 5-phase workflow automatically:

1. **Capture intent** — asks clarifying questions about what the skill should do
2. **Draft** — generates the SKILL.md, scripts, references, and assets
3. **Eval loop** — runs test cases with and without the skill, grades outputs,
   detects plateau
4. **Refine** — improves the skill based on which assertions failed
5. **Finalize** — runs validation, optimizes the description, installs the skill

## Benchmark results

The skill was tested on itself (meta-evaluation). After 6 iterations:

| Metric                  | Score       |
| ----------------------- | ----------- |
| with_skill pass rate    | 100%        |
| without_skill pass rate | 57.3%       |
| Delta                   | +42.7%      |
| Plateau reached at      | Iteration 6 |

See `skill-maker-workspace/FINAL-BENCHMARK.md` for the full iteration history.

## License

MIT
