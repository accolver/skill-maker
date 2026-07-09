#!/usr/bin/env python3
"""Patch a SkillOpt checkout so this repo's agent_skill_eval benchmark can run.

Usage:
  python skillopt/scripts/patch-skillopt-for-codex.py /path/to/SkillOpt

What it does:
- installs the custom agent_skill_eval adapter and config
- registers the adapter in scripts/train.py
- allows codex_exec as an optimizer backend for local no-API smoke runs
- runs Codex subprocesses with HOME pointed at the temporary run directory while
  keeping CODEX_HOME on the real Codex auth directory; this prevents installed
  user/project skills from contaminating target rollouts.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SRC_ADAPTER = REPO / "skillopt" / "adapter"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f"Could not find patch target: {label}")
    return text.replace(old, new, 1)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: patch-skillopt-for-codex.py /path/to/SkillOpt")
    root = Path(sys.argv[1]).resolve()
    if not (root / "scripts" / "train.py").exists():
        raise SystemExit(f"Not a SkillOpt checkout: {root}")

    env_dir = root / "skillopt" / "envs" / "agent_skill_eval"
    env_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SRC_ADAPTER / "adapter.py", env_dir / "adapter.py")
    shutil.copy2(SRC_ADAPTER / "dataloader.py", env_dir / "dataloader.py")
    (env_dir / "__init__.py").write_text("", encoding="utf-8")
    cfg_dir = root / "configs" / "agent_skill_eval"
    cfg_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SRC_ADAPTER / "default.yaml", cfg_dir / "default.yaml")

    train = root / "scripts" / "train.py"
    text = train.read_text(encoding="utf-8")
    needle = '''    try:\n        from skillopt.envs.searchqa.adapter import SearchQAAdapter\n        _ENV_REGISTRY["searchqa"] = SearchQAAdapter\n    except ImportError:\n        pass\n'''
    insert = needle + '''    try:\n        from skillopt.envs.agent_skill_eval.adapter import AgentSkillEvalAdapter\n        _ENV_REGISTRY["agent_skill_eval"] = AgentSkillEvalAdapter\n    except ImportError:\n        pass\n'''
    text = replace_once(text, needle, insert, "train registry")
    train.write_text(text, encoding="utf-8")

    eval_only = root / "scripts" / "eval_only.py"
    if eval_only.exists():
        text = eval_only.read_text(encoding="utf-8")
        text = replace_once(text, needle, insert, "eval_only registry")
        eval_only.write_text(text, encoding="utf-8")

    backend_config = root / "skillopt" / "model" / "backend_config.py"
    text = backend_config.read_text(encoding="utf-8")
    text = text.replace('{"openai_chat", "claude_chat", "qwen_chat", "minimax_chat"}', '{"openai_chat", "claude_chat", "qwen_chat", "minimax_chat", "codex_exec"}')
    text = text.replace("and 'minimax_chat'.", "'minimax_chat', and 'codex_exec'.")
    backend_config.write_text(text, encoding="utf-8")

    model_init = root / "skillopt" / "model" / "__init__.py"
    text = model_init.read_text(encoding="utf-8")
    text = replace_once(text, 'from skillopt.model import azure_openai as _openai\nfrom skillopt.model import claude_backend as _claude', 'from skillopt.model import azure_openai as _openai\nfrom skillopt.model import codex_backend as _codex\nfrom skillopt.model import claude_backend as _claude', "codex import")
    text = replace_once(text, '    if get_optimizer_backend() == "qwen_chat":\n        return _qwen.chat_optimizer(', '    if get_optimizer_backend() == "codex_exec":\n        return _codex.chat_optimizer(\n            system=system,\n            user=user,\n            max_completion_tokens=max_completion_tokens,\n            retries=retries,\n            stage=stage,\n            timeout=timeout,\n        )\n    if get_optimizer_backend() == "qwen_chat":\n        return _qwen.chat_optimizer(', "optimizer route")
    text = replace_once(text, '    if get_optimizer_backend() == "qwen_chat":\n        return _qwen.chat_optimizer_messages(', '    if get_optimizer_backend() == "codex_exec":\n        return _codex.chat_optimizer_messages(\n            messages=messages,\n            max_completion_tokens=max_completion_tokens,\n            retries=retries,\n            stage=stage,\n            tools=tools,\n            tool_choice=tool_choice,\n            return_message=return_message,\n            timeout=timeout,\n        )\n    if get_optimizer_backend() == "qwen_chat":\n        return _qwen.chat_optimizer_messages(', "optimizer messages route")
    if '_codex.set_reasoning_effort(effort)' not in text:
        text = text.replace('    _minimax.set_reasoning_effort(effort)', '    _minimax.set_reasoning_effort(effort)\n    _codex.set_reasoning_effort(effort)')
    if '_codex.set_target_deployment(deployment)' not in text:
        text = text.replace('    _minimax.set_target_deployment(deployment)', '    _minimax.set_target_deployment(deployment)\n    _codex.set_target_deployment(deployment)')
    if '_codex.set_optimizer_deployment(deployment)' not in text:
        text = text.replace('    _qwen.set_optimizer_deployment(deployment)', '    _qwen.set_optimizer_deployment(deployment)\n    _codex.set_optimizer_deployment(deployment)')
    model_init.write_text(text, encoding="utf-8")

    codex_backend = root / "skillopt" / "model" / "codex_backend.py"
    text = codex_backend.read_text(encoding="utf-8")
    old = '''        proc = subprocess.run(\n            command,\n            input=prompt,\n            text=True,\n            encoding="utf-8",\n            errors="replace",\n            capture_output=True,\n            timeout=timeout,\n            check=False,\n        )'''
    new = '''        env = os.environ.copy()\n        env.setdefault("CODEX_HOME", os.path.join(os.path.expanduser("~"), ".codex"))\n        env["HOME"] = temp_dir\n        proc = subprocess.run(\n            command,\n            input=prompt,\n            text=True,\n            encoding="utf-8",\n            errors="replace",\n            capture_output=True,\n            timeout=timeout,\n            check=False,\n            env=env,\n        )'''
    text = replace_once(text, old, new, "codex subprocess env")
    codex_backend.write_text(text, encoding="utf-8")

    print(f"Patched SkillOpt checkout at {root}")


if __name__ == "__main__":
    main()
