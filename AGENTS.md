# AGENTS.md

## About This Repository

skill-maker is an [Agent Skill](https://agentskills.io) that creates other agent
skills. It guides an AI coding agent through the full skill lifecycle:

1. **Capture intent** — interview the user to understand the skill's purpose
2. **Draft** — write SKILL.md, scripts, references, and eval test cases
3. **Eval loop** — spawn isolated subagents, grade assertions, aggregate
   benchmarks, iterate until pass rate plateaus or 20 iterations
4. **Refine** — improve the skill from failed assertions, user feedback, and
   execution transcripts
5. **Finalize** — validate, optimize the description for trigger accuracy,
   install

The eval loop is the core mechanism. Each iteration spawns fresh subagents for
every test case (one with the skill, one without), grades outputs against
assertions, detects performance plateaus, and signals when to stop.

## Repository Structure

```
skill-maker/
├── AGENTS.md                  # This file
├── README.md                  # Project overview and installation
├── LICENSE                    # MIT
├── skill-maker/               # The skill itself
│   ├── SKILL.md               # Main instructions (follows Agent Skills spec)
│   ├── scripts/               # Bun TypeScript tools for grading/benchmarking
│   ├── references/            # Schemas, spec summary
│   ├── assets/                # SKILL.md template
│   └── evals/                 # Self-eval test cases
├── skill-maker-workspace/     # Self-evaluation workspace (6 iterations)
│   ├── iteration-1/ through iteration-6/
│   └── FINAL-BENCHMARK.md
└── examples/                  # Example skills built with skill-maker
    ├── README.md              # Aggregate charts and metrics
    ├── git-conventional-commits/
    ├── code-reviewer/
    ├── api-doc-generator/
    └── [7 planned skills]/
```

## How Examples Are Generated

Each example skill in `examples/` was built by running the full skill-maker
process. This means each skill went through:

1. **Intent capture** — defining what the skill should do, its triggers, and
   success criteria
2. **Drafting** — creating a SKILL.md under 500 lines with frontmatter, workflow
   steps, examples, and common mistakes
3. **Eval creation** — writing 3 realistic test cases with 6-8 objectively
   verifiable assertions each
4. **Eval loop execution** — running isolated subagent pairs (with-skill vs
   without-skill) for each test case, grading outputs, aggregating benchmarks,
   and iterating until plateau
5. **Finalization** — validating the SKILL.md against the Agent Skills spec

### Eval loop mechanics

For each iteration, every eval case produces:

- **with_skill run** — subagent reads the SKILL.md, then executes the test
  prompt
- **without_skill run** — subagent executes the same prompt with no skill
  guidance
- **Grading** — each assertion is checked against outputs (PASS/FAIL with
  evidence)
- **Benchmarking** — pass rates, timing, and token usage aggregated across all
  evals
- **Plateau detection** — stops when pass rate delta < 2% for 3 consecutive
  iterations

All artifacts are preserved in `<skill>-workspace/` directories: grading.json,
benchmark.json, timing.json, eval_metadata.json, and output files.

## Aggregate Metrics

### Summary across all built example skills

| Metric                          | Value  |
| ------------------------------- | ------ |
| Skills built                    | 3      |
| Total eval cases                | 9      |
| Total assertions evaluated      | 70     |
| Total iterations run            | 10     |
| Average iterations to 100%      | 2.0    |
| Average delta (with vs without) | +56.4% |

### Per-skill results

| Skill                       | Pass Rate (w/ skill) | Pass Rate (w/o skill) | Delta      | Iterations | Plateau At |
| --------------------------- | -------------------- | --------------------- | ---------- | ---------- | ---------- |
| git-conventional-commits    | 100%                 | 72.3%                 | +27.7%     | 3          | 1          |
| code-reviewer               | 100%                 | 41.7%                 | +58.3%     | 4          | 2          |
| api-doc-generator           | 100%                 | 16.7%                 | +83.3%     | 3          | 3          |
| **skill-maker (self-eval)** | **100%**             | **57.3%**             | **+42.7%** | **6**      | **4**      |

### Timing and cost

| Skill                    | Avg Time (w/) | Avg Time (w/o) | Avg Tokens (w/) | Avg Tokens (w/o) |
| ------------------------ | ------------- | -------------- | --------------- | ---------------- |
| git-conventional-commits | 10.2s         | 5.7s           | 5,060           | 3,143            |
| code-reviewer            | 20.3s         | 11.4s          | 4,753           | 2,647            |
| api-doc-generator        | 43.1s         | 16.9s          | 23,367          | 9,100            |
| skill-maker (self-eval)  | 55.0s         | 50.0s          | 30,000          | 28,000           |

Skills with more complex output formats (API docs, structured reviews) show
larger time/token overhead but also the largest quality improvements. The
tradeoff is consistently worthwhile.

### What skills fix that agents miss

Analysis across all examples reveals consistent patterns in what agents get
wrong without skill guidance:

| Pattern                                                            | Frequency Without Skill | With Skill    |
| ------------------------------------------------------------------ | ----------------------- | ------------- |
| Structured output format                                           | Always fails            | Always passes |
| Convention-specific rules (commit format, severity levels)         | 60-100% failure         | 0% failure    |
| Comprehensive coverage (all error codes, all endpoints)            | 70-90% failure          | 0% failure    |
| Concrete fix suggestions (not just "consider doing X")             | 80-100% failure         | 0% failure    |
| Domain-specific metadata (BREAKING CHANGE footers, OpenAPI fields) | 90-100% failure         | 0% failure    |

The common thread: agents have broad knowledge but lack the specificity and
structure that skills enforce. Skills don't teach agents new facts — they
enforce consistent application of knowledge the agent already has.

## Planned Examples

Seven additional skills are scaffolded in `examples/` and ready to be built:

| Skill                  | Domain                                               |
| ---------------------- | ---------------------------------------------------- |
| pdf-tools              | PDF extraction, form filling, merging                |
| image-gif-tools        | Image/GIF processing with ffmpeg/ImageMagick         |
| docker-manager         | Container lifecycle and Dockerfile optimization      |
| security-analyst       | OWASP scanning, secret detection, auth review        |
| code-refactoring       | Code smell detection, extraction, cleanup            |
| infrastructure-as-code | Terraform, CloudFormation, Pulumi modules            |
| debugging              | Systematic debugging, bisection, root cause analysis |

To build any planned skill:

```
Create a skill for [description]
```

The skill-maker eval loop will produce benchmark artifacts in the corresponding
workspace directory. Results can be aggregated into the examples/README.md
charts.

## Markdown Formatting Guidelines

SKILL.md files and documentation in this repo are rendered on GitHub. Follow
these rules to avoid broken rendering:

### Code fence nesting

GitHub markdown uses backtick fences (`` ``` ``) for code blocks. When your
content contains code blocks (e.g., showing example output that itself has
fenced code), you **must** use a longer fence for the outer block:

- Use `` ````` `` (5 backticks) to wrap content containing `` ``` `` (3
  backticks)
- Use `` ```` `` (4 backticks) to wrap content containing `` ``` `` (3
  backticks)
- Never nest fences of the same length — the inner fence will close the outer

**Correct** — 5-backtick outer fence wrapping 3-backtick inner blocks:

``````
`````markdown
## Example

```json
{ "key": "value" }
```
`````
``````

**Broken** — same-length fences cause the inner block to close the outer:

````
```markdown
## Example

```json
{ "key": "value" }
```
```
````

The second `` ``` `` closes the first fence, and everything after renders as raw
text. This is the most common rendering bug in this repo.

### Mermaid chart legends

Mermaid `xychart-beta` does not support legends. When using multiple `bar` or
`line` datasets, always add a text legend immediately below the chart explaining
what each color represents. Colors are assigned in palette order (first dataset
= first color, second = second color):

```
> **Legend:** <span style="color: #4CAF50;">&#9632;</span> With Skill
> &nbsp;&nbsp; <span style="color: #FF6B6B;">&#9632;</span> Without Skill
```

### YAML frontmatter in SKILL.md

- The `description` field must be a **single line** — do not use YAML multiline
  scalars (`>` or `|`) because minimal YAML parsers reject them
- Keep the description under 1024 characters
- The `name` field must be lowercase, match the directory name, and use only
  `a-z`, `0-9`, and hyphens

### General rules

- Keep SKILL.md body under 500 lines; move heavy content to `references/`
- Use tables for structured data (common mistakes, quick reference)
- Prefer single concrete examples over multiple mediocre ones
- Use `diff` language tag for before/after code comparisons

## Key Scripts

All scripts require [Bun](https://bun.sh) and live in `skill-maker/scripts/`:

| Script                   | Purpose                               | Usage                                                                |
| ------------------------ | ------------------------------------- | -------------------------------------------------------------------- |
| `grade.ts`               | Grade assertions against eval outputs | `bun run scripts/grade.ts <run-dir>`                                 |
| `aggregate-benchmark.ts` | Aggregate grading into benchmark.json | `bun run scripts/aggregate-benchmark.ts <iter-dir> --skill-name <n>` |
| `detect-plateau.ts`      | Detect pass_rate plateau              | `bun run scripts/detect-plateau.ts <workspace>`                      |
| `validate-skill.ts`      | Validate SKILL.md against spec        | `bun run scripts/validate-skill.ts <skill-dir>`                      |

## Contributing

To add a new example skill:

1. Create a directory under `examples/<skill-name>/`
2. Run skill-maker to build it (goes through the full eval loop)
3. Verify the FINAL-BENCHMARK.md is generated in the workspace
4. Update `examples/README.md` charts with the new skill's metrics
5. Update the aggregate metrics table in this file
