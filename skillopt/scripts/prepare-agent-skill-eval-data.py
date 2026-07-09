#!/usr/bin/env python3
"""Materialize this repo's skill-maker evals into SkillOpt split_dir layout.

Usage:
  python skillopt/scripts/prepare-agent-skill-eval-data.py /path/to/SkillOpt [repo-root]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

SKILLS = ["pdf-toolkit", "gcloud-cli", "git-conventional-commits"]


def assertion_text(a: object) -> str:
    if isinstance(a, str):
        return a
    if isinstance(a, dict):
        return str(a.get("description") or a.get("text") or a)
    return str(a)


def main() -> None:
    if len(sys.argv) not in {2, 3}:
        raise SystemExit("Usage: prepare-agent-skill-eval-data.py /path/to/SkillOpt [repo-root]")
    skillopt_root = Path(sys.argv[1]).resolve()
    repo_root = Path(sys.argv[2]).resolve() if len(sys.argv) == 3 else Path.cwd()
    if not (skillopt_root / "scripts" / "train.py").exists():
        raise SystemExit(f"Not a SkillOpt checkout: {skillopt_root}")

    for sk in SKILLS:
        eval_path = repo_root / sk / "evals" / "evals.json"
        with eval_path.open(encoding="utf-8") as f:
            evals = json.load(f)["evals"]
        items = []
        for i, e in enumerate(evals, 1):
            items.append(
                {
                    "id": e.get("name") or e.get("eval_name") or f"eval-{i}",
                    "skill_name": sk,
                    "prompt": e["prompt"],
                    "assertions": [assertion_text(a) for a in e.get("assertions", [])],
                }
            )
        base = skillopt_root / "data" / "agent_skill_eval" / sk
        for split in ["train", "val", "test"]:
            p = base / split / "items.json"
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(json.dumps(items, indent=2), encoding="utf-8")
        init = base / "initial_skill.md"
        init.write_text(
            "# Skill\n\nSolve the user task carefully. Prefer concise, exact answers.\n",
            encoding="utf-8",
        )
        print(sk, "items", len(items), "base", base)


if __name__ == "__main__":
    main()
