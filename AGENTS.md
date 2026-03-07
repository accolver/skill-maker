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
├── skill-maker/               # The skill-maker skill itself
│   ├── SKILL.md
│   ├── scripts/
│   ├── references/
│   ├── assets/
│   └── evals/
├── api-doc-generator/         # 21 additional skills, all at root level
├── changelog-generator/
├── code-reviewer/
├── database-migration/
├── error-handling/
├── gcp-foundation-fabric/
├── git-conventional-commits/
├── monitoring-setup/
├── nostr-client-patterns/
├── nostr-crypto-guide/
├── nostr-dvms/
├── nostr-event-builder/
├── nostr-filter-designer/
├── nostr-marketplace-builder/
├── nostr-nip-advisor/
├── nostr-nip05-setup/
├── nostr-relay-builder/
├── nostr-social-graph/
├── nostr-zap-integration/
├── pdf-toolkit/
├── pr-description/
└── workspaces/                # Eval loop artifacts for all skills
    ├── skill-maker-workspace/
    ├── api-doc-generator-workspace/
    ├── ...
    └── nostr-dvms-workspace/
```

## How Examples Are Generated

Each skill was built by running the full skill-maker process. This means each
skill went through:

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
- **Plateau detection** — stops when pass rate delta < 2% for 2 consecutive
  iterations, or immediately when pass rate reaches 100%

All artifacts are preserved in `<skill>-workspace/` directories: grading.json,
benchmark.json, timing.json, eval_metadata.json, and output files.

## Aggregate Metrics

### Summary across all built example skills

| Metric                          | Value  |
| ------------------------------- | ------ |
| Skills built                    | 21     |
| Total eval cases                | 63     |
| Total assertions evaluated      | ~504   |
| Total iterations run            | 55     |
| Average iterations to 100%      | 2.1    |
| Average delta (with vs without) | +62.9% |

### Per-skill results

| Skill                       | Pass Rate (w/ skill) | Pass Rate (w/o skill) | Delta      | Iterations | Plateau At |
| --------------------------- | -------------------- | --------------------- | ---------- | ---------- | ---------- |
| git-conventional-commits    | 100%                 | 72.3%                 | +27.7%     | 3          | 1          |
| gcp-foundation-fabric       | 100%                 | 70.8%                 | +29.2%     | 3          | 3          |
| code-reviewer               | 100%                 | 41.7%                 | +58.3%     | 4          | 2          |
| api-doc-generator           | 100%                 | 16.7%                 | +83.3%     | 3          | 3          |
| database-migration          | 100%                 | 4.2%                  | +95.8%     | 3          | 2          |
| pr-description              | 100%                 | 20.8%                 | +79.2%     | 3          | 2          |
| error-handling              | 100%                 | 8.3%                  | +91.7%     | 3          | 3          |
| changelog-generator         | 100%                 | 20.8%                 | +79.2%     | 3          | 3          |
| monitoring-setup            | 100%                 | 26.1%                 | +73.9%     | 3          | 3          |
| pdf-toolkit                 | 100%                 | 4.2%                  | +95.8%     | 3          | 1          |
| nostr-event-builder         | 100%                 | 41.7%                 | +58.3%     | 1          | 1          |
| nostr-nip-advisor           | 100%                 | 100%*                 | 0%*        | 2          | 2          |
| nostr-relay-builder         | 100%                 | 95.8%                 | +4.2%      | 1          | 1          |
| nostr-filter-designer       | 100%                 | 54.8%                 | +45.2%     | 1          | 1          |
| nostr-crypto-guide          | 100%                 | 4.2%                  | +95.8%     | 2          | 2          |
| nostr-nip05-setup           | 100%                 | 83.3%                 | +16.7%     | 5          | 5          |
| nostr-client-patterns       | 100%                 | 0%                    | +100%      | 2          | 2          |
| nostr-social-graph          | 100%                 | 0%                    | +100%      | 3          | 3          |
| nostr-zap-integration       | 100%                 | 91.7%                 | +8.3%      | 3          | 3          |
| nostr-marketplace-builder   | 100%                 | 25.0%                 | +75.0%     | 1          | 1          |
| nostr-dvms                  | 100%                 | 0%                    | +100%      | 2          | 2          |
| **skill-maker (self-eval)** | **100%**             | **57.3%**             | **+42.7%** | **6**      | **4**      |

_\*nostr-nip-advisor: 0% delta is a grader heuristic limitation, not a real
quality parity. Both runs match generic keywords like "NIP" but with_skill
responses have correct deprecation warnings and protocol flows that
without_skill lacks._

### Timing and cost

| Skill                    | Avg Time (w/) | Avg Time (w/o) | Avg Tokens (w/) | Avg Tokens (w/o) |
| ------------------------ | ------------- | -------------- | --------------- | ---------------- |
| git-conventional-commits | 10.2s         | 5.7s           | 5,060           | 3,143            |
| code-reviewer            | 20.3s         | 11.4s          | 4,753           | 2,647            |
| api-doc-generator        | 43.1s         | 16.9s          | 23,367          | 9,100            |
| database-migration       | 34.5s         | 6.3s           | 8,290           | 1,443            |
| pr-description           | 29.7s         | 8.3s           | 7,132           | 2,119            |
| error-handling           | 34.9s         | 15.0s          | 15,800          | 6,867            |
| changelog-generator      | 31.4s         | 13.5s          | 14,577          | 6,450            |
| monitoring-setup         | 44.4s         | 17.9s          | 34,133          | 14,833           |
| pdf-toolkit              | 32.7s         | 19.0s          | 8,800           | 6,300            |
| nostr-crypto-guide       | 41.7s         | 18.7s          | 22,367          | 7,500            |
| nostr-nip05-setup        | 33.7s         | 12.3s          | 9,967           | 3,267            |
| nostr-client-patterns    | 42.0s         | 12.9s          | —               | —                |
| nostr-zap-integration    | 41.7s         | 17.7s          | 10,367          | 3,533            |
| nostr-dvms               | 36.5s         | 13.8s          | 9,700           | 3,700            |
| skill-maker (self-eval)  | 55.0s         | 50.0s          | 30,000          | 28,000           |

Skills with more complex output formats (API docs, structured reviews) show
larger time/token overhead but also the largest quality improvements. The
tradeoff is consistently worthwhile.

### What skills fix that agents miss

Analysis across all examples reveals consistent patterns in what agents get
wrong without skill guidance:

| Pattern                                                              | Frequency Without Skill | With Skill    |
| -------------------------------------------------------------------- | ----------------------- | ------------- |
| Structured output format                                             | Always fails            | Always passes |
| Convention-specific rules (commit format, severity levels)           | 60-100% failure         | 0% failure    |
| Comprehensive coverage (all error codes, all endpoints)              | 70-90% failure          | 0% failure    |
| Concrete fix suggestions (not just "consider doing X")               | 80-100% failure         | 0% failure    |
| Domain-specific metadata (BREAKING CHANGE footers, OpenAPI fields)   | 90-100% failure         | 0% failure    |
| Protocol-specific details (kind numbers, tag formats, crypto params) | 90-100% failure         | 0% failure    |

The common thread: agents have broad knowledge but lack the specificity and
structure that skills enforce. Skills don't teach agents new facts — they
enforce consistent application of knowledge the agent already has.

The Nostr skills reveal a new pattern: **protocol-specific knowledge.** Agents
know what "Nostr DMs" or "zaps" are conceptually, but consistently miss exact
event kind numbers (kind:9734 vs kind:9735), correct tag structures (relays tag
in zap requests), proper encryption parameters (NIP-44 HKDF salt `nip44-v2`),
and protocol edge cases (MAC-before-decrypt, ephemeral keys for gift wrap).
Skills with protocol-specific details show the highest deltas:
nostr-crypto-guide (+95.8%), nostr-client-patterns (+100%), nostr-social-graph
(+100%), nostr-dvms (+100%).

## Building New Examples

All 21 skills have been built and benchmarked. To add a new skill:

```
Create a skill for [description]
```

The skill-maker eval loop will produce benchmark artifacts in the corresponding
workspace directory. Results can be aggregated into the metrics tables in this
file. See the [Contributing](#contributing) section for the full checklist.

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

## Skill Directory Layout

All skills are at the repo root, each with its own directory containing at
minimum a `SKILL.md`. Eval workspace artifacts are consolidated in
`workspaces/`.

Each skill directory follows this structure:

```
<skill-name>/
├── SKILL.md               # Main instructions (follows Agent Skills spec)
├── scripts/               # Optional: bundled scripts
├── references/            # Optional: reference docs
├── assets/                # Optional: templates
└── evals/                 # Eval test cases (evals.json)
```

## Contributing

To add a new skill:

1. Create a directory at the repo root: `<skill-name>/`
2. Run skill-maker to build it (goes through the full eval loop)
3. Verify eval artifacts are generated in `workspaces/<skill-name>-workspace/`
4. Update the aggregate metrics table in this file
5. Update `README.md` with the new skill
