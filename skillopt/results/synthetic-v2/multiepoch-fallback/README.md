# Four-epoch SkillOpt fallback run

This directory records the completed multi-epoch SkillOpt orchestration run requested after the one-step smoke benchmark.

## Important caveat

This is **not** a clean LLM-vs-LLM quality benchmark. Repeated attempts to run Codex CLI, Pi subprocesses, and direct Gemini HTTP calls from inside SkillOpt's threaded rollout/reflect loop hung mid-run. To prove the actual SkillOpt multi-epoch train/validation/test machinery could run to completion, I patched `/tmp/SkillOpt` to use deterministic offline optimizer and target fallbacks.

Interpret these numbers as a **mechanics check** for SkillOpt's 4-epoch loop, acceptance/rejection, validation gating, and held-out test plumbing. The earlier `skillopt/results/synthetic-v2/comparison.md` remains the cleaner held-out comparison for frozen Skill Maker vs the one-step real SkillOpt run.

## Results

| Skill | Epochs | Accept / Reject | Best step | Baseline test hard | Best test hard | Best test soft |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `pdf-toolkit` | 4 | 1 / 3 | 1 | 0.0% | 100.0% | 100.0% |
| `gcloud-cli` | 4 | 1 / 3 | 1 | 0.0% | 66.7% | 96.7% |
| `git-conventional-commits` | 4 | 1 / 3 | 1 | 0.0% | 66.7% | 93.3% |

## Artifacts

- `summary.json` — combined machine-readable results
- `<skill>/summary.json` — raw SkillOpt summary for the 4-epoch fallback run
- `<skill>/history.json` — step-level accept/reject history
- `<skill>/best_skill.md` — best skill selected by validation
- `<skill>/step_0001_candidate_skill.md` — first accepted candidate skill
