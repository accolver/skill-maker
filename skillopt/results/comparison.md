# SkillOpt benchmark smoke run

Compared Microsoft SkillOpt v0.2.0 (repo commit `e4ea6a6`) against the existing Skill Maker benchmark artifacts for `pdf-toolkit`, `gcloud-cli`, and `git-conventional-commits`.

Important: this is a first-pass smoke benchmark, not a final apples-to-apples paper-quality result. SkillOpt was run for **one epoch / one step** with a custom `agent_skill_eval` adapter and only the three existing eval cases per skill; train/validation/test used the same case set because our skills currently only have three evals each. The existing Skill Maker numbers are the historical repo eval-loop results from `workspaces/*/benchmark.json`, and those numbers are **in-sample**: the skills were iteratively improved against these same prompts/assertions. Treat Skill Maker's 100% scores here as regression-test pass rates, not evidence of held-out generalization.

## Headline results

| Skill | Skill Maker with-skill pass | Skill Maker delta vs no-skill | SkillOpt best test hard | SkillOpt best test soft | SkillOpt accepted? | SkillOpt test delta hard | Wall time | Target tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `pdf-toolkit` | 100.0% | 95.8% | 33.3% | 41.7% | 1 / 1 | -33.3% | 1535.2s | 3,648,138 |
| `gcloud-cli` | 100.0% | 12.5% | 0.0% | 79.2% | 1 / 1 | 0.0% | 951.0s | 832,988 |
| `git-conventional-commits` | 100.0% | 28.0% | 0.0% | 32.1% | 0 / 1 | 0.0% | 115.3s | 241,413 |

## Interpretation

- Skill Maker remains clearly stronger on these **existing/in-sample** eval suites: all three current skills have 100% historical with-skill pass rates.
- This likely overstates Skill Maker quality because the eval loop explicitly revised the skills until these prompts/assertions passed. The current comparison therefore tests regression fitness more than transfer.
- The one-step SkillOpt smoke run produced a useful gcloud candidate on soft score, a weaker PDF candidate on held-out/test hard score, and no accepted git-conventional-commits update.
- The current SkillOpt setup is expensive with Codex CLI target rollouts, especially for PDF prompts; target-token accounting is from Codex JSONL events and excludes SkillOpt optimizer-token summary, which is stored separately in `summary.json`.
- The result should not be read as a definitive Skill Maker > SkillOpt conclusion. SkillOpt is designed for larger train/validation/test splits and repeated epochs; our 3-case per-skill evals are too small to give it a fair held-out gate, and our Skill Maker scores are not held out.

## SkillOpt run details

- Upstream docs: https://microsoft.github.io/SkillOpt/
- Package: `skillopt==0.2.0`
- Checkout commit used: `e4ea6a6`
- Target + optimizer: Codex CLI `gpt-5.4-mini` via a local patch that enables `codex_exec` as an optimizer backend.
- Isolation: target and optimizer Codex subprocesses set `HOME` to a temporary run directory while preserving the authenticated `CODEX_HOME`, preventing installed user/project skills from being auto-loaded into rollouts.
- Config: one epoch, batch size 3, `full_rewrite_minibatch`, soft validation gate, no slow update, no meta skill.
- Scoring: the custom adapter used a lightweight assertion-presence heuristic so SkillOpt could receive numeric feedback without adding a second LLM grader. This is intentionally cheaper but less reliable than the repo's full eval-loop grading.

## Artifacts

- `skillopt/results/summary.json` — combined machine-readable summary
- `skillopt/results/skillmaker-baselines.json` — extracted existing Skill Maker benchmark metrics
- `skillopt/results/skillopt-runs/<skill>/summary.json` — raw SkillOpt run summary copied from `/tmp/SkillOpt/outputs/clean-<skill>/summary.json`
- `skillopt/results/skillopt-runs/<skill>/best_skill.md` — SkillOpt accepted/best skill
- `skillopt/results/skillopt-runs/<skill>/candidate_skill.md` — first rewrite candidate, even when rejected
- `skillopt/adapter/` and `skillopt/scripts/` — custom adapter and reproducibility scripts

## Recommended next benchmark

1. Freeze the current Skill Maker skills before seeing any new prompts.
2. Add 10-20 **new held-out evals** per skill, ideally written by a separate agent/human who does not inspect the current skill text beyond the public skill purpose.
3. Split evals into train/validation/test sets. SkillOpt may train on train/validation only; Skill Maker should either use its existing skill unchanged or train on the same train set only.
4. Use a blind semantic grader for both systems, with the same target model, same execution harness, same token/time budget, and multiple random seeds.
5. Run SkillOpt for 4+ epochs with slow update/meta skill enabled, using API-backed optimizer if available to avoid patching Codex as optimizer.
6. Report in-sample, validation, and held-out test separately. The held-out test score is the headline; in-sample scores are regression checks.
7. Compare quality, wall time, token cost, eval authoring effort, and final skill readability.
