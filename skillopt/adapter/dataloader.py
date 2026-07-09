from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from skillopt.datasets.base import SplitDataLoader


def _normalize_item(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(raw.get("id", "")),
        "prompt": str(raw.get("prompt", "")),
        "task_description": str(raw.get("prompt", ""))[:500],
        "task_type": str(raw.get("skill_name", raw.get("task_type", "agent_skill"))),
        "skill_name": str(raw.get("skill_name", "")),
        "assertions": list(raw.get("assertions", [])),
        "checks": list(raw.get("checks", raw.get("assertions", []))),
    }


class AgentSkillEvalLoader(SplitDataLoader):
    def load_split_items(self, split_path: str) -> list[dict[str, Any]]:
        path = Path(split_path)
        json_files = sorted(path.glob("*.json"))
        if not json_files:
            raise FileNotFoundError(f"No .json found in {split_path}")
        with json_files[0].open(encoding="utf-8") as f:
            payload = json.load(f)
        if isinstance(payload, dict) and "items" in payload:
            payload = payload["items"]
        if not isinstance(payload, list):
            raise ValueError(f"Expected list in {json_files[0]}")
        return [_normalize_item(row) for row in payload]
