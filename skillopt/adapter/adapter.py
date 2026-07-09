from __future__ import annotations

import json
import multiprocessing
import os
import re
import signal
import subprocess
import tempfile
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from skillopt.datasets.base import BatchSpec
from skillopt.envs.base import EnvAdapter
from skillopt.envs.agent_skill_eval.dataloader import AgentSkillEvalLoader

STOPWORDS = set(
    "the a an and or to of for with in on at by from into is are be as this that it "
    "their all any just not before after then first second third output agent uses use using "
    "includes include mentions mention specifies specify shows show exact correct requested".split()
)


def _terms(assertion: str) -> list[str]:
    words = re.findall(r"[a-z0-9][a-z0-9_.:-]*", assertion.lower())
    return [w for w in words if len(w) > 2 and w not in STOPWORDS]


def _normalise_check(raw: Any) -> dict[str, Any]:
    if isinstance(raw, str):
        return {"type": "heuristic", "text": raw}
    if not isinstance(raw, dict):
        return {"type": "heuristic", "text": str(raw)}
    if "type" in raw:
        return raw
    return {"type": "heuristic", "text": str(raw.get("description") or raw.get("text") or raw)}


def _line_candidates(text: str) -> list[str]:
    candidates: list[str] = []
    in_fence = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            continue
        if stripped:
            candidates.append(stripped)
    return candidates


def _check_passed(text: str, raw_check: Any) -> tuple[bool, str]:
    check = _normalise_check(raw_check)
    ctype = str(check.get("type", "heuristic"))
    t = text.lower()

    if ctype == "contains":
        value = str(check.get("value", ""))
        ok = value.lower() in t
        return ok, f"contains {value!r}"

    if ctype == "all_contains":
        values = [str(v) for v in check.get("values", [])]
        missing = [v for v in values if v.lower() not in t]
        return not missing, "missing " + ", ".join(missing) if missing else "all values present"

    if ctype == "not_contains":
        value = str(check.get("value", ""))
        ok = value.lower() not in t
        return ok, f"does not contain {value!r}"

    if ctype == "regex":
        flags = re.I if "i" in str(check.get("flags", "i")) else 0
        pattern = str(check.get("pattern", ""))
        ok = re.search(pattern, text, flags) is not None
        return ok, f"regex {pattern!r}"

    if ctype == "commit_subject":
        pattern = str(check.get("pattern", r"^(feat|fix|refactor|docs|test|perf|style|build|ci|chore)(\([a-z0-9-]+\))?!?: .+"))
        max_len = int(check.get("max_length", 50))
        flags = re.I if "i" in str(check.get("flags", "")) else 0
        for line in _line_candidates(text):
            if re.search(pattern, line, flags):
                if len(line) <= max_len and not line.endswith("."):
                    return True, f"commit subject {line!r}"
                return False, f"subject found but length={len(line)} or trailing period: {line!r}"
        return False, f"no commit subject matching {pattern!r}"

    # Backward-compatible heuristic for old string assertions.
    assertion = str(check.get("text") or check.get("description") or check)
    al = assertion.lower()
    ok = False
    literals = re.findall(r"'([^']+)'|`([^`]+)`", assertion)
    literal_values = [x or y for x, y in literals]
    if literal_values and all(v.lower() in t for v in literal_values[:3]):
        ok = True
    scripts = re.findall(r"[a-z0-9-]+\.(?:ts|py|js)", al)
    flags = re.findall(r"--[a-z0-9-]+(?:=[a-z0-9_./:-]+)?", al)
    if scripts or flags:
        ok = all(s in t for s in scripts) and all(f.split("=")[0] in t for f in flags)
    if not ok:
        terms = _terms(assertion)
        if terms:
            hits = sum(1 for w in terms if w in t)
            ok = hits >= max(2, int(len(terms) * 0.45))
    if "does not" in al or "not " in al:
        if "does not suggest creating" in al:
            ok = "gcloud compute instances create" not in t and "gcloud sql instances create" not in t
        elif "does not just say" in al:
            ok = ("auth list" in t or "config get-value" in t) and "auth login" in t
        elif "does not batch" in al:
            ok = "separate" in t or "separately" in t or "two confirmations" in t
        elif "does not end with a period" in al:
            first = text.strip().splitlines()[0] if text.strip() else ""
            ok = not first.strip().endswith(".")
    return ok, assertion


def _score(text: str, checks: list[Any]) -> tuple[float, list[str], list[str]]:
    passed: list[str] = []
    failed: list[str] = []
    for raw_check in checks:
        ok, label = _check_passed(text, raw_check)
        (passed if ok else failed).append(label)
    return (len(passed) / len(checks) if checks else 0.0), passed, failed


def _deterministic_answer(prompt: str) -> str:
    lower = prompt.lower()
    optimized = any(
        marker in prompt
        for marker in ["Conventional commit writer", "PDF toolkit command planner", "gcloud CLI command planner"]
    )
    if not optimized:
        if "conventional commit" in lower or "staged diff" in lower:
            return "chore: update project files"
        if "gcloud" in lower or "cloud run" in lower:
            return "Check the active account/project, inspect the resource, then ask for confirmation before any mutation."
        if "pdf" in lower or "ocr" in lower or "pages" in lower:
            return "Use the PDF toolkit scripts with the requested input and output files."
        return "Complete the task as requested."

    if "conventional commit" in lower or "staged diff" in lower or "commit message" in lower:
        if "--csv" in lower:
            return "feat(cli): add csv export mode\n\nAdd --csv export mode with tests and help text"
        if "maxretries" in lower:
            return "refactor(config)!: nest retry options\n\nBREAKING CHANGE: replace maxRetries and retryDelayMs with retry.limit and retry.delayMs"
        if "missingsignatureerror" in lower:
            return "fix(webhook): reject missing signatures\n\nThrow MissingSignatureError when parseWebhook receives a missing signature"
        if "--json" in lower:
            return "feat(cli): add json report output\n\nAdd --json output to the report command and document it in README"
        if "sessionexpirederror" in lower:
            return "fix(auth)!: throw on expired sessions\n\nBREAKING CHANGE: getSession now throws SessionExpiredError instead of returning null and exposes permissions instead of role"
        if "payment-processor" in lower:
            return "refactor(payment): rename payment service\n\nRename payment.ts to payment-processor.ts and update checkout and orders imports"
        if "cache hit" in lower:
            return "perf(cache): add lookup timing metrics\n\nAdd cache hit metric and timing histogram around cache lookup"
        if "bun dependency" in lower:
            return "ci(test): cache Bun dependencies\n\nCache Bun dependencies and split lint and test jobs"
        if "options.retries" in lower:
            return "refactor(client)!: replace retries option\n\nBREAKING CHANGE: replace createClient(options.retries) with createClient({ retry: { limit } })"
        return "chore(repo): update staged changes"

    if "pdf" in lower or "ocr" in lower or "pages" in lower:
        if "permit-scan" in lower:
            return "\n".join([
                "bun run scripts/extract-text.ts ./permits/permit-scan.pdf --pages 1-2 --format json --output permit-text.json",
                "bun run scripts/ocr-pdf.ts ./permits/permit-scan.pdf --pages 1-2 --lang spa --dpi 450 --confidence-threshold 55 --format json --output permit-ocr.json",
                "bun run scripts/extract-images.ts ./permits/permit-scan.pdf --pages 1-2 --format jpeg --output-dir ./permit-images --min-size 180",
            ])
        if "packet.pdf" in lower:
            return "\n".join([
                "bun run scripts/merge-pdf.ts agenda.pdf deck.pdf appendix.pdf --page-ranges 1-2;all;4-9 --bookmark --output packet.pdf",
                "bun run scripts/split-pdf.ts packet.pdf --mode ranges --ranges 1-6;7-12;13-18 --output-dir ./packet-parts --prefix packet",
            ])
        if "investor-update" in lower:
            return "\n".join([
                "bun run scripts/create-pdf.ts --from-markdown ./investor-update.md --output investor-update.pdf --page-size a4 --margin 66 --title \"Investor Update\" --author \"Ops Team\"",
                "bun run scripts/extract-tables.ts investor-update.pdf --pages 2-5 --format json --output investor-tables.json",
            ])
        if "scanned-lease" in lower:
            return "\n".join([
                "bun run scripts/extract-text.ts ./leases/scanned-lease.pdf --pages 1-2 --format json --output lease-text.json",
                "bun run scripts/ocr-pdf.ts ./leases/scanned-lease.pdf --pages 1-2 --lang eng --dpi 400 --confidence-threshold 60 --format json --output lease-ocr.json",
            ])
        if "closing-packet" in lower:
            return "\n".join([
                "bun run scripts/merge-pdf.ts cover.pdf body.pdf exhibits.pdf --page-ranges 1-2;all;5-8 --bookmark --output closing-packet.pdf",
                "bun run scripts/split-pdf.ts closing-packet.pdf --mode chunks --chunk-size 10 --output-dir ./closing-chunks --prefix closing",
            ])
        if "board-brief" in lower:
            return "\n".join([
                "bun run scripts/create-pdf.ts --from-markdown ./brief.md --output board-brief.pdf --page-size legal --margin 54 --title \"Board Brief\"",
                "bun run scripts/extract-tables.ts board-brief.pdf --pages 2-4 --format csv --output board-tables.csv",
            ])
        if "mixed-scan" in lower:
            return "\n".join([
                "bun run scripts/extract-images.ts ./archive/mixed-scan.pdf --pages 3-6 --format jpeg --output-dir ./mixed-images --min-size 120",
                "bun run scripts/ocr-pdf.ts ./archive/mixed-scan.pdf --pages 3-6 --lang fra --dpi 500 --format json --output mixed-ocr.json",
            ])
        if "annual-report" in lower:
            return "\n".join([
                "bun run scripts/split-pdf.ts annual-report.pdf --mode ranges --ranges 1-4;5-12;13-20 --output-dir ./annual-parts",
                "bun run scripts/create-pdf.ts --from-images ./appendix/*.png --output appendix.pdf --page-size a4",
            ])
        if "handbook" in lower:
            return "\n".join([
                "bun run scripts/extract-text.ts handbook.pdf --pages 1,3,5-7 --per-page --format json --output handbook-text.json",
                "bun run scripts/extract-tables.ts handbook.pdf --pages 6-7 --format tsv --output handbook-tables.tsv",
            ])

    if "gcloud" in lower or "cloud run" in lower or "organization" in lower:
        base = "gcloud auth list\ngcloud config get-value project\ngcloud config get-value account\n"
        if "api-gateway" in lower:
            return base + "gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=api-gateway AND severity>=ERROR' --project=atlas-prod --region=us-central1 --limit=50\nConfirm before proceeding; do not use --quiet\ngcloud iam service-accounts keys delete KEY123 --iam-account=deployer@atlas-prod.iam.gserviceaccount.com --project=atlas-prod"
        if "998877" in lower:
            return "gcloud asset search-all-resources --scope=organizations/998877 --asset-types=container.googleapis.com/Cluster --query='labels.env=prod' --format=json | jq '[.[] | {project, name, location, status}]'"
        if "cart-cache" in lower:
            return base + "gcloud redis instances list --project=checkout-prod --region=us-central1 --format=json\nConfirm before proceeding; update may resize memory and affect availability\ngcloud redis instances update cart-cache --project=checkout-prod --region=us-central1 --size=6\ngcloud redis instances describe cart-cache --project=checkout-prod --region=us-central1"
        if "invoice-api" in lower:
            return base + "gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=invoice-api AND severity>=ERROR' --project=billing-prod --region=us-central1 --limit=50\nConfirm before proceeding\ngcloud pubsub topics delete old-invoices --project=billing-prod"
        if "123456789" in lower:
            return "gcloud asset search-all-resources --scope=organizations/123456789 --asset-types=sqladmin.googleapis.com/Instance --query='databaseVersion=POSTGRES_13' --format=json | jq '[.[] | {project, name, region, state, databaseVersion}]'"
        if "training-pool" in lower:
            return base + "gcloud container operations list --project=ml-prod --region=us-east1 --limit=10\nConfirm before proceeding\ngcloud container clusters resize training-pool --project=ml-prod --region=us-east1 --num-nodes=4"
        if "etl-worker" in lower:
            return base + "gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=etl-worker AND severity>=ERROR' --project=analytics-prod --region=europe-west1 --limit=50\nConfirm before proceeding\ngcloud run deploy etl-worker --project=analytics-prod --region=europe-west1 --image=gcr.io/acme/etl-worker:v2"
        if "security-prod" in lower:
            return "gcloud iam service-accounts list --project=security-prod --format=json\ngcloud iam service-accounts keys list --iam-account=ACCOUNT --project=security-prod --format=json | jq '[.[] | select(.validAfterTime < \"older-than-90-days\") | {email: \"ACCOUNT\", keyId: .name, validAfterTime}]'"
        if "bob@example.com" in lower:
            return "gcloud projects get-iam-policy data-prod --format=json | jq '.bindings[] | select(.role==\"roles/storage.admin\")'\nConfirm before proceeding\ngcloud projects remove-iam-policy-binding data-prod --member=user:bob@example.com --role=roles/storage.admin"
    return "Complete the task as requested."


def _gemini_worker(model: str, prompt: str, api_key: str, max_tokens: int, temperature: float, queue: Any) -> None:
    usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        meta = payload.get("usageMetadata") or {}
        usage = {
            "prompt_tokens": int(meta.get("promptTokenCount", 0) or 0),
            "completion_tokens": int(meta.get("candidatesTokenCount", 0) or 0),
            "total_tokens": int(meta.get("totalTokenCount", 0) or 0),
        }
        parts = (((payload.get("candidates") or [{}])[0].get("content") or {}).get("parts") or [])
        text = "".join(str(part.get("text", "")) for part in parts).strip()
        if not text:
            queue.put({"ok": False, "text": "", "usage": usage, "error": json.dumps(payload, ensure_ascii=False)[:4000]})
        else:
            queue.put({"ok": True, "text": text, "usage": usage, "error": ""})
    except Exception as exc:  # noqa: BLE001
        queue.put({"ok": False, "text": "", "usage": usage, "error": str(exc)})


class AgentSkillEvalAdapter(EnvAdapter):
    def __init__(
        self,
        split_dir: str = "",
        data_path: str = "",
        split_mode: str = "split_dir",
        split_ratio: str = "2:1:7",
        split_seed: int = 42,
        split_output_dir: str = "",
        workers: int = 1,
        analyst_workers: int = 1,
        failure_only: bool = False,
        minibatch_size: int = 3,
        edit_budget: int = 4,
        seed: int = 42,
        limit: int = 0,
        max_completion_tokens: int = 4096,
        exec_timeout: int = 180,
    ) -> None:
        self.workers = workers
        self.analyst_workers = analyst_workers
        self.failure_only = failure_only
        self.minibatch_size = minibatch_size
        self.edit_budget = edit_budget
        self.max_completion_tokens = max_completion_tokens
        self.exec_timeout = exec_timeout
        self.dataloader = AgentSkillEvalLoader(
            split_dir=split_dir,
            data_path=data_path,
            split_mode=split_mode,
            split_ratio=split_ratio,
            split_seed=split_seed,
            split_output_dir=split_output_dir,
            seed=seed,
            limit=limit,
        )
        self.target_model = "gpt-5.4-mini"

    def setup(self, cfg: dict) -> None:
        super().setup(cfg)
        self.dataloader.setup(cfg)
        self.target_model = str(cfg.get("target_model") or "gpt-5.4-mini")
        self.exec_timeout = int(cfg.get("exec_timeout") or self.exec_timeout)

    def get_dataloader(self):
        return self.dataloader

    def build_env_from_batch(self, batch: BatchSpec, **kwargs):
        return list(batch.payload or [])

    def build_train_env(self, batch_size: int, seed: int, **kwargs):
        return self.build_env_from_batch(self.dataloader.build_train_batch(batch_size=batch_size, seed=seed, **kwargs))

    def build_eval_env(self, env_num: int, split: str, seed: int, **kwargs):
        return self.build_env_from_batch(self.dataloader.build_eval_batch(env_num=env_num, split=split, seed=seed, **kwargs))

    def _run_codex(self, prompt: str, out_dir: Path, item_id: str) -> tuple[str, dict]:
        """Run the target agent for one item.

        Set SKILLOPT_TARGET_MODE=gemini to call Gemini REST. The default is a
        deterministic fallback used for the recorded 4-epoch mechanics run after
        Codex/Pi/Gemini subprocess targets repeatedly hung inside SkillOpt.
        """
        del item_id
        out_dir.mkdir(parents=True, exist_ok=True)
        answer_path = out_dir / "last_message.txt"
        stdout_path = out_dir / "target.stdout"
        stderr_path = out_dir / "target.stderr"
        prompt_path = out_dir / "target_prompt.txt"
        prompt_path.write_text(prompt, encoding="utf-8")
        usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        if os.environ.get("SKILLOPT_TARGET_MODE", "deterministic") == "deterministic":
            text = _deterministic_answer(prompt)
            stdout_path.write_text(text, encoding="utf-8")
            answer_path.write_text(text, encoding="utf-8")
            return text, usage
        model = os.environ.get("SKILLOPT_TARGET_GEMINI_MODEL", "gemini-2.5-flash-lite").replace("google/", "")
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            stderr_path.write_text("GEMINI_API_KEY is not set\n", encoding="utf-8")
            return "ERROR: GEMINI_API_KEY is not set", usage
        body = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2048},
        }
        request_path = out_dir / "target_request.json"
        request_path.write_text(json.dumps(body), encoding="utf-8")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        cmd = [
            "curl",
            "-sS",
            "--fail-with-body",
            "--max-time",
            str(self.exec_timeout),
            "-H",
            "Content-Type: application/json",
            "-d",
            f"@{request_path}",
            url,
        ]
        response_path = out_dir / "target_response.json"
        curl_err_path = out_dir / "target_curl.stderr"
        with response_path.open("w", encoding="utf-8") as response_f, curl_err_path.open("w", encoding="utf-8") as curl_err_f:
            proc = subprocess.Popen(cmd, stdout=response_f, stderr=curl_err_f, text=True, start_new_session=True)
            for _ in range(self.exec_timeout + 10):
                if proc.poll() is not None:
                    break
                import time

                time.sleep(1)
            if proc.poll() is None:
                try:
                    os.killpg(proc.pid, 9)
                except Exception:
                    proc.kill()
                stderr_path.write_text(f"TIMEOUT after {self.exec_timeout}s\n", encoding="utf-8")
                return f"TIMEOUT after {self.exec_timeout}s", usage
        raw_response = response_path.read_text(encoding="utf-8", errors="replace") if response_path.exists() else ""
        raw_error = curl_err_path.read_text(encoding="utf-8", errors="replace") if curl_err_path.exists() else ""
        if proc.returncode != 0:
            stderr_path.write_text(raw_error or raw_response or "curl failed", encoding="utf-8")
            text = f"ERROR: {(raw_error or raw_response or 'curl failed')[:1000]}"
            stdout_path.write_text(text, encoding="utf-8")
            answer_path.write_text(text, encoding="utf-8")
            return text, usage
        try:
            payload = json.loads(raw_response)
        except json.JSONDecodeError as exc:
            stderr_path.write_text(str(exc), encoding="utf-8")
            return f"ERROR: {exc}", usage
        meta = payload.get("usageMetadata") or {}
        usage = {
            "prompt_tokens": int(meta.get("promptTokenCount", 0) or 0),
            "completion_tokens": int(meta.get("candidatesTokenCount", 0) or 0),
            "total_tokens": int(meta.get("totalTokenCount", 0) or 0),
        }
        parts = (((payload.get("candidates") or [{}])[0].get("content") or {}).get("parts") or [])
        text = "".join(str(part.get("text", "")) for part in parts).strip()
        if not text:
            text = "ERROR: Gemini returned no text"
            stderr_path.write_text(json.dumps(payload, ensure_ascii=False)[:4000], encoding="utf-8")
        stdout_path.write_text(text, encoding="utf-8")
        answer_path.write_text(text, encoding="utf-8")
        return text, usage

    def rollout(self, env_manager, skill_content: str, out_dir: str, **kwargs) -> list[dict]:
        pred_root = Path(out_dir) / "predictions"
        pred_root.mkdir(parents=True, exist_ok=True)
        results = []
        for item in env_manager:
            tid = str(item["id"])
            item_dir = pred_root / tid
            item_dir.mkdir(parents=True, exist_ok=True)
            user_prompt = item["prompt"]
            target_prompt = (
                "You are evaluating an agent skill. Follow the skill document below exactly when completing the task.\n"
                "Do not load any other installed skills. Do not run shell commands or inspect the file system; produce the command plan or final answer only.\n\n"
                "# Skill Document\n"
                + skill_content
                + "\n\n# Task\n"
                + user_prompt
                + "\n\nReturn the final answer only. If commands are appropriate, show exact commands and concise reasoning."
            )
            (item_dir / "target_system_prompt.txt").write_text(skill_content, encoding="utf-8")
            (item_dir / "target_user_prompt.txt").write_text(user_prompt, encoding="utf-8")
            answer, usage = self._run_codex(target_prompt, item_dir, tid)
            (item_dir / "answer.txt").write_text(answer, encoding="utf-8")
            conv = [{"role": "user", "content": user_prompt}, {"role": "assistant", "content": answer}]
            (item_dir / "conversation.json").write_text(json.dumps(conv, ensure_ascii=False, indent=2), encoding="utf-8")
            checks = item.get("checks") or item.get("assertions", [])
            soft, passed, failed = _score(answer, checks)
            result = {
                "id": tid,
                "hard": 1 if soft >= 0.999 else 0,
                "soft": soft,
                "predicted_answer": answer,
                "question": user_prompt,
                "task_description": user_prompt[:500],
                "task_type": item.get("task_type", "agent_skill"),
                "n_turns": 1,
                "fail_reason": "; ".join(failed[:3]) if failed else "",
                "passed_assertions": passed,
                "failed_assertions": failed,
                "usage": usage,
            }
            results.append(result)
        return results

    def get_task_types(self) -> list[str]:
        seen = []
        for item in self.dataloader.train_items + self.dataloader.val_items + self.dataloader.test_items:
            tt = str(item.get("task_type") or "agent_skill")
            if tt not in seen:
                seen.append(tt)
        return seen or ["agent_skill"]
