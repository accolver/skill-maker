# Synthetic held-out Skill Maker vs SkillOpt benchmark

SkillOpt trained on train and gated on val for one epoch/one step. Frozen Skill Maker skills were evaluated only on held-out test. Final comparison uses test split only.

## Dataset

- Location: `skillopt/data/synthetic-agent-skill-v2`
- Splits per skill: 3 train, 3 validation, 3 held-out test
- The held-out `test` split is used for the headline comparison; it was not used in SkillOpt train/validation and was only shown to frozen Skill Maker skills during final evaluation.

## Headline held-out results

| Skill | Frozen Skill Maker hard | Frozen Skill Maker soft | SkillOpt seed soft | SkillOpt best hard | SkillOpt best soft | SkillOpt accepted | SkillOpt wall time | SkillOpt target tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `pdf-toolkit` | 100.0% | 100.0% | 7.7% | 0.0% | 7.7% | 0 / 1 | 448.1s | 242,213 |
| `gcloud-cli` | 33.3% | 88.9% | 59.3% | 0.0% | 48.7% | 1 / 1 | 994.4s | 257,769 |
| `git-conventional-commits` | 0.0% | 78.6% | 56.7% | 0.0% | 71.7% | 0 / 1 | 592.8s | 198,655 |

## Notes

- This directly addresses the prior overfitting concern: the headline numbers are from newly generated held-out prompts, not the original eval loop prompts.
- Skill Maker was evaluated as the current frozen repo skill. I did **not** tune Skill Maker on the synthetic train split in this run, so this is a stricter transfer test for our existing skills rather than a new Skill Maker training run.
- SkillOpt did train on the synthetic train split and used validation for gating, but only for one epoch/one update step to keep runtime bounded.
- The scorer is deterministic and check-based (`contains`, `not_contains`, regex, and conventional-commit subject checks). It is stricter and less semantically forgiving than an LLM grader.
- SkillOpt underperformed heavily on PDF because its seed skill was generic and the one candidate did not improve validation; a longer run or seeding SkillOpt with current Skill Maker skills would be a separate experiment.
- On this split, SkillOpt only accepted a gcloud candidate, but that candidate improved validation while lowering held-out soft score versus the generic seed. That is a useful sign that even this new split is still too small for reliable validation gating.

## Follow-up: 4-epoch SkillOpt mechanics run

I also attempted the requested real multi-epoch SkillOpt flow. Codex CLI, Pi subprocess, and direct Gemini calls repeatedly hung inside SkillOpt's threaded rollout/reflect loop. To get a completed 4-epoch run and verify SkillOpt's train/val/test orchestration, I patched `/tmp/SkillOpt` with deterministic offline optimizer/target fallbacks.

Those fallback numbers are recorded separately under `multiepoch-fallback/` and should **not** be treated as a clean LLM quality comparison:

| Skill | Epochs | Accept / Reject | Best test hard | Best test soft |
| --- | ---: | ---: | ---: | ---: |
| `pdf-toolkit` | 4 | 1 / 3 | 100.0% | 100.0% |
| `gcloud-cli` | 4 | 1 / 3 | 66.7% | 96.7% |
| `git-conventional-commits` | 4 | 1 / 3 | 66.7% | 93.3% |

## Artifacts

- `heldout-skillmaker-vs-skillopt.md` — explicit held-out comparison tables for Skill Maker vs one-step SkillOpt and the 4-epoch fallback mechanics run
- `summary.json` — machine-readable combined results
- `multiepoch-fallback/summary.json` — completed 4-epoch fallback mechanics run
- `skillmaker-heldout/<skill>/summary.json` — frozen Skill Maker per-item held-out scores
- `skillopt-runs/<skill>/summary.json` — raw SkillOpt summary copied from `/tmp/SkillOpt/outputs/synthetic-v2-<skill>`
- `skillopt-runs/<skill>/candidate_skill.md` — SkillOpt step-1 candidate
- `skillopt-runs/<skill>/best_skill.md` — SkillOpt best accepted skill
