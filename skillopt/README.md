# SkillOpt comparison

This directory contains a first-pass benchmark of Microsoft SkillOpt against this repo's Skill Maker outputs for `pdf-toolkit`, `gcloud-cli`, and `git-conventional-commits`.

Start with:

- [`results/comparison.md`](results/comparison.md) — original in-sample smoke comparison
- [`results/synthetic-v2/comparison.md`](results/synthetic-v2/comparison.md) — new synthetic train/validation/held-out comparison addressing overfitting
- [`results/synthetic-v2/multiepoch-fallback/README.md`](results/synthetic-v2/multiepoch-fallback/README.md) — completed 4-epoch SkillOpt mechanics run using deterministic fallbacks after live model subprocesses hung

## Reproduce

```bash
git clone https://github.com/microsoft/SkillOpt.git /tmp/SkillOpt
python3 -m venv /tmp/skillopt-venv
/tmp/skillopt-venv/bin/pip install -e /tmp/SkillOpt
python skillopt/scripts/patch-skillopt-for-codex.py /tmp/SkillOpt
python skillopt/scripts/prepare-agent-skill-eval-data.py /tmp/SkillOpt .
PATH=/tmp/skillopt-venv/bin:$PATH skillopt/scripts/run-one-skillopt.sh /tmp/SkillOpt pdf-toolkit /tmp/SkillOpt/outputs/clean-pdf-toolkit
PATH=/tmp/skillopt-venv/bin:$PATH skillopt/scripts/run-one-skillopt.sh /tmp/SkillOpt gcloud-cli /tmp/SkillOpt/outputs/clean-gcloud-cli
PATH=/tmp/skillopt-venv/bin:$PATH skillopt/scripts/run-one-skillopt.sh /tmp/SkillOpt git-conventional-commits /tmp/SkillOpt/outputs/clean-git-conventional-commits
python skillopt/scripts/collect-results.py /tmp/SkillOpt .
```

The committed original smoke results were produced from `/tmp/SkillOpt` at commit `e4ea6a6`.

For the synthetic held-out benchmark, generate/copy the split data and run the held-out evaluator:

```bash
python skillopt/scripts/generate-synthetic-splits.py . --skillopt-root /tmp/SkillOpt
python skillopt/scripts/run-skillmaker-heldout.py skillopt/data/synthetic-agent-skill-v2 skillopt/results/synthetic-v2/skillmaker-heldout
```

Then run SkillOpt with `--split_dir /tmp/SkillOpt/data/agent_skill_eval_synthetic_v2/<skill>` and collect results into `skillopt/results/synthetic-v2/`.
