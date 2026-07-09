#!/usr/bin/env python3
"""Evaluate frozen Skill Maker skills on synthetic held-out split.

Usage:
  python skillopt/scripts/run-skillmaker-heldout.py skillopt/data/synthetic-agent-skill-v2 skillopt/results/synthetic-v2/skillmaker-heldout
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

SKILLS = ["pdf-toolkit", "gcloud-cli", "git-conventional-commits"]


def line_candidates(text: str) -> list[str]:
    out: list[str] = []
    in_fence = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            continue
        if stripped:
            out.append(stripped)
    return out


def check_passed(text: str, check: dict[str, Any]) -> tuple[bool, str]:
    ctype = str(check.get("type", "contains"))
    t = text.lower()
    if ctype == "contains":
        value = str(check.get("value", ""))
        return value.lower() in t, f"contains {value!r}"
    if ctype == "not_contains":
        value = str(check.get("value", ""))
        return value.lower() not in t, f"does not contain {value!r}"
    if ctype == "regex":
        pattern = str(check.get("pattern", ""))
        flags = re.I if "i" in str(check.get("flags", "i")) else 0
        return re.search(pattern, text, flags) is not None, f"regex {pattern!r}"
    if ctype == "commit_subject":
        pattern = str(check.get("pattern", r"^(feat|fix|refactor|docs|test|perf|style|build|ci|chore)(\([a-z0-9-]+\))?!?: .+"))
        max_len = int(check.get("max_length", 50))
        flags = re.I if "i" in str(check.get("flags", "")) else 0
        for line in line_candidates(text):
            if re.search(pattern, line, flags):
                if len(line) <= max_len and not line.endswith("."):
                    return True, f"commit subject {line!r}"
                return False, f"subject found but invalid length/trailing period: {line!r}"
        return False, f"no commit subject matching {pattern!r}"
    return False, f"unknown check {ctype}"


def score(text: str, checks: list[dict[str, Any]]) -> dict[str, Any]:
    passed: list[str] = []
    failed: list[str] = []
    for check in checks:
        ok, label = check_passed(text, check)
        (passed if ok else failed).append(label)
    return {
        "passed": len(passed),
        "failed": len(failed),
        "total": len(checks),
        "pass_rate": len(passed) / len(checks) if checks else 0.0,
        "passed_checks": passed,
        "failed_checks": failed,
    }


def run_codex(prompt: str, out_dir: Path, model: str = "gpt-5.4-mini", timeout: int = 180) -> tuple[str, dict[str, int]]:
    out_dir.mkdir(parents=True, exist_ok=True)
    last = out_dir / "last_message.txt"
    events = out_dir / "codex.jsonl"
    err = out_dir / "codex.stderr"
    cmd = [
        "codex",
        "exec",
        "--json",
        "--ephemeral",
        "--profile",
        "review",
        "-c",
        'approval_policy="never"',
        "--sandbox",
        "read-only",
        "--skip-git-repo-check",
        "--cd",
        str(Path.cwd()),
        "--model",
        model,
        "--output-last-message",
        str(last),
        "-",
    ]
    usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    with tempfile.TemporaryDirectory(prefix="skillmaker_heldout_") as tmp_home:
        env = os.environ.copy()
        env.setdefault("CODEX_HOME", str(Path.home() / ".codex"))
        env["HOME"] = tmp_home
        try:
            proc = subprocess.run(
                cmd,
                input=prompt,
                text=True,
                encoding="utf-8",
                errors="replace",
                capture_output=True,
                timeout=timeout,
                check=False,
                env=env,
            )
        except subprocess.TimeoutExpired:
            return f"TIMEOUT after {timeout}s", usage
    events.write_text(proc.stdout, encoding="utf-8")
    err.write_text(proc.stderr, encoding="utf-8")
    for line in proc.stdout.splitlines():
        try:
            payload = json.loads(line)
        except Exception:
            continue
        if payload.get("type") == "turn.completed":
            u = payload.get("usage") or {}
            usage = {
                "prompt_tokens": int(u.get("input_tokens", 0) or 0),
                "completion_tokens": int(u.get("output_tokens", 0) or 0),
                "total_tokens": int((u.get("input_tokens", 0) or 0) + (u.get("output_tokens", 0) or 0)),
            }
    text = last.read_text(encoding="utf-8").strip() if last.exists() else ""
    if proc.returncode != 0:
        text = text or (proc.stderr.strip() or proc.stdout.strip())[-4000:]
    return text, usage


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(__doc__ or "usage error")
    dataset = Path(sys.argv[1]).resolve()
    out_root = Path(sys.argv[2]).resolve()
    out_root.mkdir(parents=True, exist_ok=True)
    repo = Path.cwd()

    summary: dict[str, Any] = {"dataset": str(dataset), "skills": {}}
    for skill in SKILLS:
        skill_doc = (repo / skill / "SKILL.md").read_text(encoding="utf-8")
        items = json.loads((dataset / skill / "test" / "items.json").read_text(encoding="utf-8"))
        skill_out = out_root / skill
        results = []
        for item in items:
            item_out = skill_out / str(item["id"])
            prompt = (
                "You are evaluating a frozen Skill Maker skill. Follow the skill document below exactly.\n"
                "Do not load any other installed skills. Do not run shell commands or inspect the file system; produce the command plan or final answer only.\n\n"
                "# Skill Document\n"
                + skill_doc
                + "\n\n# Held-out task\n"
                + item["prompt"]
                + "\n\nReturn the final answer only."
            )
            answer, usage = run_codex(prompt, item_out)
            (item_out / "answer.txt").write_text(answer, encoding="utf-8")
            scored = score(answer, item.get("checks", []))
            results.append({"id": item["id"], "score": scored, "usage": usage})
        total_checks = sum(r["score"]["total"] for r in results)
        total_passed = sum(r["score"]["passed"] for r in results)
        hard = sum(1 for r in results if r["score"]["pass_rate"] >= 0.999) / len(results)
        soft = total_passed / total_checks if total_checks else 0.0
        usage_total = {
            "calls": len(results),
            "prompt_tokens": sum(r["usage"]["prompt_tokens"] for r in results),
            "completion_tokens": sum(r["usage"]["completion_tokens"] for r in results),
            "total_tokens": sum(r["usage"]["total_tokens"] for r in results),
        }
        skill_summary = {"hard": hard, "soft": soft, "total_checks": total_checks, "passed_checks": total_passed, "usage": usage_total, "items": results}
        (skill_out / "summary.json").write_text(json.dumps(skill_summary, indent=2), encoding="utf-8")
        summary["skills"][skill] = skill_summary
        print(skill, "hard", hard, "soft", soft, "tokens", usage_total["total_tokens"])

    (out_root / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(out_root / "summary.json")


if __name__ == "__main__":
    main()
