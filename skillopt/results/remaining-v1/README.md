# Remaining skills SkillOpt optimization run

This directory records the SkillOpt optimization run for the repo skills that were not part of the first three-skill experiment (`pdf-toolkit`, `gcloud-cli`, and `git-conventional-commits`).

## Caveat

This was a deterministic fallback mechanics run, not a clean live-LLM quality benchmark. Live Codex/Pi/Gemini routes had previously hung inside SkillOpt, so the optimizer fallback preserved each source skill and appended reusable SkillOpt guardrails. Existing eval prompts were reused across train/validation/test, so these scores are in-sample optimization signals rather than held-out claims.

## Results

See `skillmaker-vs-skillopt.md` for the side-by-side comparison against original Skill Maker benchmark scores.

| Skill | Accept / Reject | Best step | Test hard | Test soft |
| --- | ---: | ---: | ---: | ---: |
| `ai-consultant` | 1 / 3 | 1 | 100.0% | 100.0% |
| `annuity-life-insurance-sales` | 1 / 3 | 1 | 33.3% | 91.7% |
| `api-doc-generator` | 1 / 3 | 1 | 100.0% | 100.0% |
| `automation-builder` | 1 / 3 | 1 | 100.0% | 100.0% |
| `changelog-generator` | 1 / 3 | 1 | 100.0% | 100.0% |
| `clean-room-risk-screen` | 1 / 3 | 1 | 100.0% | 100.0% |
| `cloudevents` | 1 / 3 | 1 | 100.0% | 100.0% |
| `code-reviewer` | 1 / 3 | 1 | 100.0% | 100.0% |
| `database-migration` | 1 / 3 | 1 | 100.0% | 100.0% |
| `differentiated-opportunity-engine` | 1 / 7 | 1 | 100.0% | 100.0% |
| `distribution-ops` | 1 / 3 | 1 | 100.0% | 100.0% |
| `edge-profiler` | 1 / 7 | 1 | 100.0% | 100.0% |
| `error-handling` | 1 / 3 | 1 | 100.0% | 100.0% |
| `experiment-tracker` | 1 / 3 | 1 | 100.0% | 100.0% |
| `gcp-foundation-fabric` | 1 / 3 | 1 | 33.3% | 91.7% |
| `micro-saas-scoper` | 1 / 3 | 1 | 100.0% | 100.0% |
| `monitoring-setup` | 1 / 3 | 1 | 100.0% | 100.0% |
| `nostr-bunker-integration` | 1 / 3 | 1 | 100.0% | 100.0% |
| `nostr-client-patterns` | 1 / 3 | 1 | 100.0% | 100.0% |
| `nostr-crypto-guide` | 1 / 3 | 1 | 100.0% | 100.0% |
| `nostr-dvms` | 1 / 3 | 1 | 100.0% | 100.0% |
| `nostr-event-builder` | 1 / 3 | 1 | 100.0% | 100.0% |
| `nostr-filter-designer` | 1 / 3 | 1 | 33.3% | 91.1% |
| `nostr-marketplace-builder` | 1 / 3 | 1 | 100.0% | 100.0% |
| `nostr-nip-advisor` | 1 / 3 | 1 | 100.0% | 100.0% |
| `nostr-nip05-setup` | 1 / 3 | 1 | 100.0% | 100.0% |
| `nostr-relay-builder` | 1 / 3 | 1 | 100.0% | 100.0% |
| `nostr-social-graph` | 1 / 3 | 1 | 100.0% | 100.0% |
| `nostr-zap-integration` | 1 / 3 | 1 | 100.0% | 100.0% |
| `offer-designer` | 1 / 3 | 1 | 100.0% | 100.0% |
| `pr-description` | 1 / 3 | 1 | 100.0% | 100.0% |
| `pr-qa` | 1 / 7 | 1 | 100.0% | 100.0% |
| `skill-maker` | 1 / 3 | 1 | 100.0% | 100.0% |
| `telos-guardian` | 1 / 7 | 1 | 100.0% | 100.0% |
| `terraform-github-actions-deploy` | 1 / 3 | 1 | 100.0% | 100.0% |
| `validation-planner` | 1 / 7 | 1 | 100.0% | 100.0% |

## Applied change

For each accepted run, the repo skill kept its existing frontmatter and replaced the body with the SkillOpt-selected `best_skill.md`, which preserves the original skill body and adds a short `Optimization Notes` section.

## Artifacts

- `summary.json` — combined machine-readable summary
- `<skill>/summary.json` — raw SkillOpt summary
- `<skill>/history.json` — step accept/reject history
- `<skill>/best_skill.md` — SkillOpt-selected body applied to the skill
- `<skill>/step_0001_candidate_skill.md` — first accepted candidate
