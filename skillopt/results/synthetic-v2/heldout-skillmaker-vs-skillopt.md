# Held-out comparison: Skill Maker vs SkillOpt

All numbers below use the synthetic held-out `test` split from `skillopt/data/synthetic-agent-skill-v2`.

## Clean held-out comparison

This table compares frozen Skill Maker skills against the one-step live SkillOpt run. This is the cleaner quality comparison because it used the live SkillOpt path rather than deterministic fallbacks.

| Skill | Skill Maker hard | Skill Maker soft | SkillOpt one-step hard | SkillOpt one-step soft | Hard delta vs Skill Maker | Soft delta vs Skill Maker |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `pdf-toolkit` | 100.0% | 100.0% | 0.0% | 7.7% | -100.0% | -92.3% |
| `gcloud-cli` | 33.3% | 88.9% | 0.0% | 48.7% | -33.3% | -40.2% |
| `git-conventional-commits` | 0.0% | 78.6% | 0.0% | 71.7% | +0.0% | -6.9% |

### Readout

- `pdf-toolkit`: frozen Skill Maker generalized perfectly on held-out synthetic prompts; one-step SkillOpt did not improve beyond its generic seed.
- `gcloud-cli`: frozen Skill Maker had lower hard pass rate but high soft coverage; one-step SkillOpt accepted a validation candidate that regressed on held-out soft score, showing the 3-item validation set is noisy.
- `git-conventional-commits`: frozen Skill Maker had strong partial coverage but failed exact hard checks; one-step SkillOpt still failed hard checks and only slightly trailed soft coverage.

## Completed 4-epoch mechanics run

This table compares Skill Maker to the completed 4-epoch SkillOpt fallback run. Treat this as a SkillOpt orchestration/mechanics check, not a clean model-quality benchmark: the optimizer and target were deterministic fallbacks after Codex CLI, Pi subprocesses, and direct Gemini calls repeatedly hung inside SkillOpt's threaded loop.

| Skill | Skill Maker hard | Skill Maker soft | SkillOpt 4-epoch fallback hard | SkillOpt 4-epoch fallback soft | Hard delta vs Skill Maker | Soft delta vs Skill Maker |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `pdf-toolkit` | 100.0% | 100.0% | 100.0% | 100.0% | +0.0% | +0.0% |
| `gcloud-cli` | 33.3% | 88.9% | 66.7% | 96.7% | +33.3% | +7.8% |
| `git-conventional-commits` | 0.0% | 78.6% | 66.7% | 93.3% | +66.7% | +14.8% |

### Readout

- The fallback run verified that SkillOpt can complete multiple epochs, accept a validation-improving candidate, reject later non-improvements, and evaluate held-out test.
- Because the fallback encoded task-specific deterministic behavior, its improved held-out scores should not be interpreted as evidence that SkillOpt outperformed Skill Maker with live LLM optimization.
- For a fair future benchmark, use a larger synthetic split, seed SkillOpt with current Skill Maker `SKILL.md` files, and run a stable live backend for multiple epochs.
