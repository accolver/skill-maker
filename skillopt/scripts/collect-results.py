#!/usr/bin/env python3
"""Collect SkillOpt run summaries and existing Skill Maker baselines.

Usage:
  python skillopt/scripts/collect-results.py /path/to/SkillOpt [repo-root]
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

SKILLS = ["pdf-toolkit", "gcloud-cli", "git-conventional-commits"]


def latest_benchmark(repo: Path, skill: str) -> Path | None:
    ws = repo / "workspaces" / f"{skill}-workspace"
    benches = sorted(
        ws.glob("iteration-*/benchmark.json"),
        key=lambda p: int(p.parent.name.split("-")[-1]),
    )
    return benches[-1] if benches else None


def codex_usage(root: Path) -> dict[str, int]:
    calls = 0
    input_tokens = 0
    output_tokens = 0
    for p in root.rglob("codex.jsonl"):
        for line in p.read_text(errors="ignore").splitlines():
            try:
                obj = json.loads(line)
            except Exception:
                continue
            if obj.get("type") != "turn.completed":
                continue
            usage = obj.get("usage") or {}
            calls += 1
            input_tokens += int(usage.get("input_tokens", 0) or 0)
            output_tokens += int(usage.get("output_tokens", 0) or 0)
    return {
        "calls": calls,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
    }


def main() -> None:
    if len(sys.argv) not in {2, 3}:
        raise SystemExit("Usage: collect-results.py /path/to/SkillOpt [repo-root]")
    skillopt_root = Path(sys.argv[1]).resolve()
    repo = Path(sys.argv[2]).resolve() if len(sys.argv) == 3 else Path.cwd()
    out_root = repo / "skillopt"
    results_root = out_root / "results"
    (results_root / "skillopt-runs").mkdir(parents=True, exist_ok=True)

    skillmaker = {}
    for sk in SKILLS:
        bench = latest_benchmark(repo, sk)
        if not bench:
            continue
        data = json.loads(bench.read_text())
        rs = data["run_summary"]
        skillmaker[sk] = {
            "source": str(bench.relative_to(repo)),
            "iteration": data.get("iteration"),
            "with_skill_pass_rate": rs["with_skill"]["pass_rate"]["mean"],
            "without_skill_pass_rate": rs["without_skill"]["pass_rate"]["mean"],
            "delta_pass_rate": rs["delta"]["pass_rate"],
            "with_skill_time_seconds_mean": rs["with_skill"]["time_seconds"]["mean"],
            "without_skill_time_seconds_mean": rs["without_skill"]["time_seconds"]["mean"],
            "with_skill_tokens_mean": rs["with_skill"]["tokens"]["mean"],
            "without_skill_tokens_mean": rs["without_skill"]["tokens"]["mean"],
            "per_eval": data.get("per_eval", []),
        }
    (results_root / "skillmaker-baselines.json").write_text(
        json.dumps(skillmaker, indent=2), encoding="utf-8"
    )

    try:
        commit = subprocess.check_output(
            ["git", "-C", str(skillopt_root), "rev-parse", "--short", "HEAD"],
            text=True,
        ).strip()
    except Exception:
        commit = "unknown"

    skillopt = {}
    for sk in SKILLS:
        src = skillopt_root / "outputs" / f"clean-{sk}"
        if not (src / "summary.json").exists():
            continue
        dest = results_root / "skillopt-runs" / sk
        dest.mkdir(parents=True, exist_ok=True)
        summary = json.loads((src / "summary.json").read_text())
        copied = []
        for name in ["summary.json", "best_skill.md"]:
            if (src / name).exists():
                shutil.copy2(src / name, dest / name)
                copied.append(name)
        for rel, name in [
            ("steps/step_0001/candidate_skill.md", "candidate_skill.md"),
            ("steps/step_0001/step_record.json", "step_record.json"),
        ]:
            if (src / rel).exists():
                shutil.copy2(src / rel, dest / name)
                copied.append(name)
        skillopt[sk] = {
            "source_output": str(src),
            "copied_artifacts": copied,
            "best_step": summary.get("best_step"),
            "total_steps": summary.get("total_steps"),
            "total_accepts": summary.get("total_accepts"),
            "total_rejects": summary.get("total_rejects"),
            "baseline_selection_hard": summary.get("baseline_selection_hard"),
            "best_selection_hard": summary.get("best_selection_hard"),
            "baseline_test_hard": summary.get("baseline_test_hard"),
            "baseline_test_soft": summary.get("baseline_test_soft"),
            "best_test_hard": summary.get("test_hard"),
            "best_test_soft": summary.get("test_soft"),
            "test_delta_hard": summary.get("test_delta_hard"),
            "wall_time_seconds": summary.get("total_wall_time_s"),
            "optimizer_token_summary": summary.get("token_summary"),
            "target_token_summary": codex_usage(src),
        }

    combined = {
        "created_at": "2026-07-08",
        "skillopt_version": "0.2.0",
        "skillopt_repo_commit": commit,
        "run_note": (
            "One-epoch SkillOpt smoke benchmark using a custom agent_skill_eval adapter. "
            "Train/validation/test reused the three existing eval cases per skill."
        ),
        "skills": SKILLS,
        "skillmaker_historical": skillmaker,
        "skillopt_smoke_runs": skillopt,
    }
    (results_root / "summary.json").write_text(json.dumps(combined, indent=2), encoding="utf-8")
    print(results_root / "summary.json")


if __name__ == "__main__":
    main()
