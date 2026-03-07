# Agent Skills Spec — Quick Reference

## SKILL.md Frontmatter

```yaml
---
name: my-skill-name
description: >
  Does X for Y. Use when Z happens.
license: MIT
compatibility: Requires Node.js 18+
metadata:
  author: team-name
  version: "1.0"
allowed-tools: Bash Read Write Edit Glob Grep
---
```

| Field           | Required | Constraints                                                                                                               |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `name`          | Yes      | 1–64 chars. Lowercase `a-z`, `0-9`, hyphens only. No leading/trailing/consecutive hyphens. **Must match directory name.** |
| `description`   | Yes      | 1–1024 chars. What it does + "Use when…" triggers. Third person. Include discovery keywords.                              |
| `license`       | No       | License name or path to bundled LICENSE file.                                                                             |
| `compatibility` | No       | 1–500 chars. Runtime/environment requirements.                                                                            |
| `metadata`      | No       | Flat map of string key→value pairs.                                                                                       |
| `allowed-tools` | No       | Space-delimited tool names (experimental).                                                                                |

## Directory Structure

```
skill-name/
├── SKILL.md          # Required — frontmatter + instructions
├── scripts/          # Optional — executable code agents can run
├── references/       # Optional — docs loaded on demand
└── assets/           # Optional — templates, config files, resources
```

## Progressive Disclosure (3 Tiers)

| Tier            | What                           | Budget         | When Loaded         |
| --------------- | ------------------------------ | -------------- | ------------------- |
| 1. Metadata     | `name` + `description`         | ~100 tokens    | Startup / discovery |
| 2. Instructions | Full SKILL.md body             | < 5,000 tokens | Skill activation    |
| 3. Resources    | scripts/, references/, assets/ | Varies         | On demand by agent  |

**Rule of thumb:** SKILL.md body < 500 lines. If longer, split into reference
files.

## Body Content Guidelines

No format restrictions — write what helps agents succeed. Recommended sections:

- **Step-by-step workflow** — numbered steps the agent follows
- **Examples** — concrete inputs/outputs
- **Edge cases** — what to watch for
- **Checklists** — verification before completion

## Description Writing Checklist

- [ ] Starts with what the skill does (verb phrase)
- [ ] Includes "Use when…" trigger conditions
- [ ] Written in third person
- [ ] Contains specific keywords agents search for
- [ ] Under 1024 characters

## Script Design Rules

| Rule                               | Rationale                                |
| ---------------------------------- | ---------------------------------------- |
| No interactive prompts             | Agents run non-interactive shells        |
| Include `--help` output            | Agents discover usage autonomously       |
| Structured output (JSON) to stdout | Parseable by agents                      |
| Diagnostics to stderr              | Keeps stdout clean for data              |
| Meaningful exit codes              | 0 = success, non-zero = specific failure |
| Idempotent operations              | Safe to re-run on failure                |
| Pin dependency versions            | Reproducible across environments         |

## File References

- Use **relative paths** from skill root (e.g., `references/patterns.md`)
- Keep files **one level deep** from SKILL.md
- Files > 300 lines should include a table of contents

## Common Anti-Patterns

| Anti-Pattern                                | Fix                                        |
| ------------------------------------------- | ------------------------------------------ |
| Deep reference chains (a.md → b.md → c.md)  | Flatten to one level from SKILL.md         |
| Windows backslash paths (`refs\file.md`)    | Always use forward slashes                 |
| Too many tool options, no clear default     | State the default action prominently       |
| Over-explaining what models already know    | Focus on project-specific context          |
| Time-sensitive info without migration notes | Add "old patterns" or "deprecated" section |
| SKILL.md > 5,000 tokens                     | Move detail into references/               |

## Minimal Valid Skill

```yaml
---
name: example-skill
description: >
  Generates widget configs from templates.
  Use when creating new widgets or updating widget settings.
---
```

```markdown
## Steps

1. Read the widget spec from the user
2. Load `references/widget-schema.json` for field definitions
3. Generate config matching the schema
4. Validate output with `scripts/validate.sh`
```
