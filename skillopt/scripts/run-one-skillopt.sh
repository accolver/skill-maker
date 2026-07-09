#!/usr/bin/env bash
set -euo pipefail
if [[ $# -ne 3 ]]; then
  echo "Usage: run-one-skillopt.sh /path/to/SkillOpt <skill-name> <out-dir>" >&2
  exit 2
fi
SKILLOPT_ROOT=$1
SKILL_NAME=$2
OUT_DIR=$3
DATA_DIR="$SKILLOPT_ROOT/data/agent_skill_eval/$SKILL_NAME"
cd "$SKILLOPT_ROOT"
CODEX_HOME=${CODEX_HOME:-$HOME/.codex} \
CODEX_PROFILE=review \
CODEX_SANDBOX_MODE=read-only \
CODEX_CLI_BIN=codex \
python scripts/train.py \
  --config configs/agent_skill_eval/default.yaml \
  --split_dir "$DATA_DIR" \
  --skill_init "$DATA_DIR/initial_skill.md" \
  --out_root "$OUT_DIR" \
  --num_epochs 1 \
  --batch_size 3 \
  --optimizer_model gpt-5.4-mini \
  --target_model gpt-5.4-mini \
  --cfg-options \
    model.optimizer_backend=codex_exec \
    model.target_backend=codex_exec \
    model.reasoning_effort=low \
    model.codex_exec_profile=review \
    model.codex_exec_sandbox=read-only \
    optimizer.use_slow_update=false \
    optimizer.use_meta_skill=false \
    evaluation.sel_env_num=3 \
    evaluation.test_env_num=3 \
    evaluation.gate_metric=soft
