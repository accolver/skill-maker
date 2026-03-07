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

- [Bun](https://bun.sh) — required for `bunx` and all bundled scripts

## Quick install

```bash
npx skill-maker install    # npm
pnpx skill-maker install   # pnpm
bunx skill-maker install   # bun
```

This installs the skill-maker skill to `~/.agents/skills/` and auto-detects any
AI coding clients (Claude Code, OpenCode) to install there too.

### Install example skills

skill-maker includes 9 example skills built with the eval loop. Install specific
ones alongside skill-maker:

```bash
bunx skill-maker install pdf-toolkit code-reviewer
```

Or install everything:

```bash
bunx skill-maker install --all
```

### Available skills

| Skill                    | What it does                                         |
| ------------------------ | ---------------------------------------------------- |
| **skill-maker**          | Creates other agent skills with eval-driven dev      |
| api-doc-generator        | Generates API documentation from code                |
| changelog-generator      | Creates changelogs from git history                  |
| code-reviewer            | Reviews code for quality, bugs, and best practices   |
| database-migration       | Creates safe database migration scripts              |
| error-handling           | Adds comprehensive error handling patterns           |
| git-conventional-commits | Writes conventional commit messages                  |
| monitoring-setup         | Sets up application monitoring and alerting          |
| pdf-toolkit              | Extracts text, tables, and images from PDFs with OCR |
| pr-description           | Writes detailed pull request descriptions            |

Run `bunx skill-maker list` to see all available skills.

### Install options

```bash
# Force install to a specific client
bunx skill-maker install --client claude

# Also install to the current project (./agents/skills/)
bunx skill-maker install --local

# Combine flags
bunx skill-maker install pdf-toolkit --client opencode --local
```

### Where skills are installed

Skills are always installed to `~/.agents/skills/`. The CLI also auto-detects
and installs to any client directories that exist on your system:

| Client      | Directory                    | Detected by                  |
| ----------- | ---------------------------- | ---------------------------- |
| Generic     | `~/.agents/skills/`          | Always                       |
| Claude Code | `~/.claude/skills/`          | `~/.claude/` exists          |
| OpenCode    | `~/.config/opencode/skills/` | `~/.config/opencode/` exists |

### Manual installation

If you prefer not to use `bunx`, clone and copy manually:

```bash
git clone https://github.com/accolver/skill-maker.git
cd skill-maker
mkdir -p ~/.agents/skills
cp -r skill-maker ~/.agents/skills/skill-maker
```

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
