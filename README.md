# <img src="web/src/lib/assets/favicon.svg" width="32" height="32" align="center" alt="skill-maker logo"> skill-maker

An [Agent Skill](https://agentskills.io) that creates other agent skills. It
guides an AI coding agent through the full lifecycle: intent capture, drafting a
SKILL.md, running an eval loop with subagents, refining based on grading
signals, and optimizing the description for trigger accuracy.

**[Visit skill-maker.pages.dev](https://skill-maker.pages.dev)** for an
interactive overview of how it works, benchmark results, and quick-start install
commands.

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

- [Bun](https://bun.sh) — required for all bundled scripts

## Quick install

```bash
npx skills add accolver/skill-maker
```

This auto-detects your AI coding agents (Claude Code, Cursor, Windsurf,
OpenCode, etc.) and installs skill-maker to each one.

### Install options

```bash
# Install globally (user-level, available in all projects)
npx skills add accolver/skill-maker -g

# Install to specific agents only
npx skills add accolver/skill-maker --agent claude-code opencode

# List available skills without installing
npx skills add accolver/skill-maker --list
```

### Manual installation

If you prefer not to use the skills CLI:

```bash
git clone https://github.com/accolver/skill-maker.git
cd skill-maker
mkdir -p ~/.agents/skills
cp -r skill-maker ~/.agents/skills/skill-maker
```

### Verify installation

```bash
npx skills list
```

Or run the bundled validator:

```bash
bun run skill-maker/scripts/validate-skill.ts skill-maker
```

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

Skills built with skill-maker were evaluated against unguided agents across 9
domains. Each skill went through the full eval loop: isolated subagent pairs
(with-skill vs without-skill), assertion grading, and iteration until plateau.

| Metric                     | Value      |
| -------------------------- | ---------- |
| Skills evaluated           | 9          |
| Total eval assertions      | 213        |
| With-skill pass rate       | 100%       |
| Average without-skill rate | 23.9%      |
| **Average improvement**    | **+76.1%** |
| Average iterations to 100% | 2.2        |

### Per-skill results

| Skill                    | With Skill | Without | Delta      |
| ------------------------ | ---------- | ------- | ---------- |
| database-migration       | 100%       | 4.2%    | **+95.8%** |
| pdf-toolkit              | 100%       | 4.2%    | **+95.8%** |
| error-handling           | 100%       | 8.3%    | **+91.7%** |
| api-doc-generator        | 100%       | 16.7%   | **+83.3%** |
| pr-description           | 100%       | 20.8%   | **+79.2%** |
| changelog-generator      | 100%       | 20.8%   | **+79.2%** |
| monitoring-setup         | 100%       | 26.1%   | **+73.9%** |
| code-reviewer            | 100%       | 41.7%   | **+58.3%** |
| git-conventional-commits | 100%       | 72.3%   | **+27.7%** |

Skills add the most value where agents have knowledge but lack structure: output
formatting, safety checklists, comprehensive coverage, and convention-specific
rules consistently fail without skill guidance.

See [examples/README.md](examples/README.md) for detailed per-skill breakdowns,
convergence charts, and guidance on choosing high-delta skill use cases.

### Self-evaluation

skill-maker was also tested on itself (meta-evaluation):

| Metric               | Score  |
| -------------------- | ------ |
| with_skill pass rate | 100%   |
| without_skill rate   | 57.3%  |
| Delta                | +42.7% |
| Plateau reached at   | Iter 6 |

See `skill-maker-workspace/FINAL-BENCHMARK.md` for the full iteration history.

## License

MIT
