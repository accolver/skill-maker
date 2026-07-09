#!/usr/bin/env python3
"""Materialize all repo skills except explicitly excluded ones into SkillOpt layout.

This is for broad SkillOpt mechanics/optimization runs over the repository's
existing evals. It reuses each skill's eval prompts in train/val/test, so the
resulting scores are in-sample signals, not held-out quality claims.

Usage:
  python skillopt/scripts/prepare-remaining-skillopt-data.py [repo-root] [--skillopt-root /tmp/SkillOpt]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

DEFAULT_EXCLUDE = {"pdf-toolkit", "gcloud-cli", "git-conventional-commits", "skillopt-runner"}
DATASET = "remaining-skillopt-v1"


def assertion_text(assertion: Any) -> str:
    if isinstance(assertion, str):
        return assertion
    if isinstance(assertion, dict):
        return str(assertion.get("description") or assertion.get("text") or assertion)
    return str(assertion)


def normalize_eval(skill: str, eval_case: dict[str, Any], idx: int) -> dict[str, Any]:
    return {
        "id": str(eval_case.get("id") or eval_case.get("name") or eval_case.get("eval_name") or f"eval-{idx}"),
        "skill_name": skill,
        "prompt": str(eval_case["prompt"]),
        "assertions": [assertion_text(a) for a in eval_case.get("assertions", [])],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("repo_root", nargs="?", default=".")
    parser.add_argument("--skillopt-root", default="/tmp/SkillOpt")
    parser.add_argument("--include-first-three", action="store_true")
    args = parser.parse_args()

    repo = Path(args.repo_root).resolve()
    skillopt_root = Path(args.skillopt_root).resolve()
    exclude = set() if args.include_first_three else set(DEFAULT_EXCLUDE)
    out_repo = repo / "skillopt" / "data" / DATASET
    out_tmp = skillopt_root / "data" / "agent_skill_eval_remaining_v1"

    skills: list[str] = []
    for skill_md in sorted(repo.glob("*/SKILL.md")):
        skill = skill_md.parent.name
        if skill in exclude:
            continue
        eval_path = repo / skill / "evals" / "evals.json"
        if not eval_path.exists():
            continue
        data = json.loads(eval_path.read_text())
        items = [normalize_eval(skill, e, i) for i, e in enumerate(data.get("evals", []), 1)]
        if not items:
            continue
        skills.append(skill)
        for base in [out_repo / skill, out_tmp / skill]:
            for split in ["train", "val", "test"]:
                target = base / split
                target.mkdir(parents=True, exist_ok=True)
                (target / "items.json").write_text(json.dumps(items, indent=2), encoding="utf-8")
            (base / "initial_skill.md").write_text(
                "# Skill\n\nSolve the user task carefully. Prefer concise, exact answers.\n",
                encoding="utf-8",
            )

    manifest = {"dataset": DATASET, "skills": skills, "excluded": sorted(exclude)}
    out_repo.mkdir(parents=True, exist_ok=True)
    out_tmp.mkdir(parents=True, exist_ok=True)
    (out_repo / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (out_tmp / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
