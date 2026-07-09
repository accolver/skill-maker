#!/usr/bin/env python3
"""Generate synthetic train/validation/held-out eval splits for Skill Maker vs SkillOpt.

Usage:
  python skillopt/scripts/generate-synthetic-splits.py [repo-root] [--skillopt-root /tmp/SkillOpt]

The held-out split is the only split used for final comparison.
"""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

DATASET = "synthetic-agent-skill-v2"


def c(value: str) -> dict[str, str]:
    return {"type": "contains", "value": value}


def nc(value: str) -> dict[str, str]:
    return {"type": "not_contains", "value": value}


def rx(pattern: str) -> dict[str, str]:
    return {"type": "regex", "pattern": pattern, "flags": "i"}


def cs(pattern: str, max_length: int = 50) -> dict[str, Any]:
    return {"type": "commit_subject", "pattern": pattern, "max_length": max_length}


def item(skill: str, split: str, n: int, prompt: str, checks: list[dict[str, Any]]) -> dict[str, Any]:
    assertions = []
    for check in checks:
        t = check["type"]
        if t == "contains":
            assertions.append(f"Output contains {check['value']}")
        elif t == "not_contains":
            assertions.append(f"Output does not contain {check['value']}")
        elif t == "regex":
            assertions.append(f"Output matches regex {check['pattern']}")
        elif t == "commit_subject":
            assertions.append(f"Output includes conventional commit subject matching {check['pattern']}")
        else:
            assertions.append(str(check))
    return {
        "id": f"{split}-{n}",
        "skill_name": skill,
        "prompt": prompt.strip(),
        "assertions": assertions,
        "checks": checks,
    }


SPLITS: dict[str, dict[str, list[dict[str, Any]]]] = {
    "pdf-toolkit": {
        "train": [
            item(
                "pdf-toolkit",
                "train",
                1,
                """
Do not execute anything. Draft the exact Bun command plan for ./leases/scanned-lease.pdf: first try selectable text extraction for pages 1-2 as JSON to lease-text.json, then OCR pages 1-2 in English at 400 DPI to lease-ocr.json with JSON output and confidence threshold 60.
""",
                [c("scripts/extract-text.ts"), c("--pages 1-2"), c("--format json"), c("--output lease-text.json"), c("scripts/ocr-pdf.ts"), c("--dpi 400"), c("--confidence-threshold 60"), c("--output lease-ocr.json")],
            ),
            item(
                "pdf-toolkit",
                "train",
                2,
                """
Do not run commands. I need to merge cover.pdf pages 1-2, body.pdf all pages, and exhibits.pdf pages 5-8 into closing-packet.pdf with source bookmarks, then split closing-packet.pdf into 10-page chunks under ./closing-chunks with prefix closing.
""",
                [c("scripts/merge-pdf.ts"), c("--output closing-packet.pdf"), c("--page-ranges"), c("1-2;all;5-8"), c("--bookmark"), c("scripts/split-pdf.ts"), c("--mode chunks"), c("--chunk-size 10"), c("--output-dir ./closing-chunks"), c("--prefix closing")],
            ),
            item(
                "pdf-toolkit",
                "train",
                3,
                """
Command plan only: create board-brief.pdf from ./brief.md using markdown mode, legal page size, margin 54, title "Board Brief"; then extract tables from board-brief.pdf pages 2-4 as CSV to board-tables.csv.
""",
                [c("scripts/create-pdf.ts"), c("--from-markdown ./brief.md"), c("--output board-brief.pdf"), c("--page-size legal"), c("--margin 54"), c("--title"), c("Board Brief"), c("scripts/extract-tables.ts"), c("--pages 2-4"), c("--format csv"), c("--output board-tables.csv")],
            ),
        ],
        "val": [
            item(
                "pdf-toolkit",
                "val",
                1,
                """
Do not execute. For ./archive/mixed-scan.pdf, give commands to extract images from pages 3-6 as JPEG files to ./mixed-images with min size 120, and OCR the same pages in French at 500 DPI to mixed-ocr.json.
""",
                [c("scripts/extract-images.ts"), c("--pages 3-6"), c("--format jpeg"), c("--output-dir ./mixed-images"), c("--min-size 120"), c("scripts/ocr-pdf.ts"), c("--lang fra"), c("--dpi 500"), c("--output mixed-ocr.json")],
            ),
            item(
                "pdf-toolkit",
                "val",
                2,
                """
Plan only: split annual-report.pdf into custom ranges 1-4,5-12,13-20 under ./annual-parts, then create a new PDF appendix.pdf from images ./appendix/*.png with A4 page size.
""",
                [c("scripts/split-pdf.ts"), c("--mode ranges"), c("--ranges"), c("1-4;5-12;13-20"), c("--output-dir ./annual-parts"), c("scripts/create-pdf.ts"), c("--from-images"), c("./appendix/*.png"), c("--output appendix.pdf"), c("--page-size a4")],
            ),
            item(
                "pdf-toolkit",
                "val",
                3,
                """
Do not execute commands. Show how to extract text from handbook.pdf pages 1,3,5-7 as per-page JSON to handbook-text.json and tables from pages 6-7 as TSV to handbook-tables.tsv.
""",
                [c("scripts/extract-text.ts"), c("--pages 1,3,5-7"), c("--per-page"), c("--format json"), c("--output handbook-text.json"), c("scripts/extract-tables.ts"), c("--pages 6-7"), c("--format tsv"), c("--output handbook-tables.tsv")],
            ),
        ],
        "test": [
            item(
                "pdf-toolkit",
                "test",
                1,
                """
Held-out eval. Do not execute commands. For ./permits/permit-scan.pdf, first test pages 1-2 for selectable text as JSON to permit-text.json, then OCR pages 1-2 with Spanish language at 450 DPI, confidence threshold 55, JSON output to permit-ocr.json. Also extract JPEG images from pages 1-2 to ./permit-images with min size 180.
""",
                [c("scripts/extract-text.ts"), c("--pages 1-2"), c("--format json"), c("--output permit-text.json"), c("scripts/ocr-pdf.ts"), c("--lang spa"), c("--dpi 450"), c("--confidence-threshold 55"), c("--output permit-ocr.json"), c("scripts/extract-images.ts"), c("--format jpeg"), c("--output-dir ./permit-images"), c("--min-size 180")],
            ),
            item(
                "pdf-toolkit",
                "test",
                2,
                """
Held-out eval. Command plan only. Build packet.pdf by merging agenda.pdf pages 1-2, deck.pdf all pages, and appendix.pdf pages 4-9, with bookmarks. Then split packet.pdf by ranges 1-6,7-12,13-18 under ./packet-parts with prefix packet.
""",
                [c("scripts/merge-pdf.ts"), c("--output packet.pdf"), c("--page-ranges"), c("1-2;all;4-9"), c("--bookmark"), c("scripts/split-pdf.ts"), c("--mode ranges"), c("--ranges"), c("1-6;7-12;13-18"), c("--output-dir ./packet-parts"), c("--prefix packet")],
            ),
            item(
                "pdf-toolkit",
                "test",
                3,
                """
Held-out eval. Do not run anything. Create investor-update.pdf from ./investor-update.md with A4 page size, 66pt margin, title "Investor Update", author "Ops Team". Then extract tables from investor-update.pdf pages 2-5 as JSON to investor-tables.json.
""",
                [c("scripts/create-pdf.ts"), c("--from-markdown ./investor-update.md"), c("--output investor-update.pdf"), c("--page-size a4"), c("--margin 66"), c("--title"), c("Investor Update"), c("--author"), c("Ops Team"), c("scripts/extract-tables.ts"), c("--pages 2-5"), c("--format json"), c("--output investor-tables.json")],
            ),
        ],
    },
    "gcloud-cli": {
        "train": [
            item(
                "gcloud-cli",
                "train",
                1,
                """
Do not execute commands; produce the command plan. In project billing-prod, inspect recent ERROR logs for Cloud Run service invoice-api in us-central1, then prepare to delete Pub/Sub topic old-invoices. Read-only log checks should not require confirmation, but deletion must.
""",
                [c("gcloud auth list"), c("gcloud config get-value project"), c("gcloud config get-value account"), c("gcloud logging read"), c("invoice-api"), c("severity>=ERROR"), c("gcloud pubsub topics delete old-invoices"), rx("confirm|approval|proceed"), nc("--quiet")],
            ),
            item(
                "gcloud-cli",
                "train",
                2,
                """
Plan only. Across organization 123456789, find Cloud SQL instances with databaseVersion POSTGRES_13 and output project, name, region, and state as JSON for scripting. This is read-only.
""",
                [c("gcloud asset search-all-resources"), c("--scope=organizations/123456789"), c("sqladmin.googleapis.com/Instance"), c("databaseVersion"), c("POSTGRES_13"), c("--format=json"), rx(r"jq|json\("), nc("delete"), nc("patch")],
            ),
            item(
                "gcloud-cli",
                "train",
                3,
                """
Command plan only. Project ml-prod may be wrong locally. Need to resize GKE cluster training-pool in us-east1 from 8 to 4 nodes, and also list recent operations first. Show safety steps.
""",
                [c("gcloud auth list"), c("gcloud config get-value project"), c("gcloud container operations list"), c("gcloud container clusters resize training-pool"), c("--region=us-east1"), c("--num-nodes=4"), rx("confirm|approval|proceed"), nc("--quiet")],
            ),
        ],
        "val": [
            item(
                "gcloud-cli",
                "val",
                1,
                """
Do not run commands. In analytics-prod, check Cloud Run service etl-worker error logs in europe-west1 and prepare a deploy of image gcr.io/acme/etl-worker:v2. Reads are okay; deploy needs approval.
""",
                [c("gcloud auth list"), c("gcloud config get-value project"), c("gcloud logging read"), c("etl-worker"), c("europe-west1"), c("gcloud run deploy etl-worker"), c("--image=gcr.io/acme/etl-worker:v2"), rx("confirm|approval|proceed"), nc("--quiet")],
            ),
            item(
                "gcloud-cli",
                "val",
                2,
                """
Plan only. Find every enabled service account key older than 90 days in project security-prod and output JSON with service account email, key id, and validAfterTime. Do not delete anything.
""",
                [c("gcloud iam service-accounts list"), c("gcloud iam service-accounts keys list"), c("--format=json"), rx("validAfterTime|validAfter"), rx("jq|json"), nc("keys delete"), nc("--quiet")],
            ),
            item(
                "gcloud-cli",
                "val",
                3,
                """
Do not execute. Prepare to remove IAM role roles/storage.admin from user bob@example.com on project data-prod, but first show read-only policy inspection commands and the exact mutating command gated behind explicit confirmation.
""",
                [c("gcloud projects get-iam-policy data-prod"), c("bob@example.com"), c("roles/storage.admin"), c("gcloud projects remove-iam-policy-binding data-prod"), c("--member=user:bob@example.com"), c("--role=roles/storage.admin"), rx("confirm|approval|proceed"), nc("--quiet")],
            ),
        ],
        "test": [
            item(
                "gcloud-cli",
                "test",
                1,
                """
Held-out eval. Do not execute commands. In project atlas-prod, inspect Cloud Run service api-gateway ERROR logs in us-central1, then prepare to delete service account key KEY123 for deployer@atlas-prod.iam.gserviceaccount.com. Read-only checks can proceed; key deletion must be separately confirmed and must not use --quiet.
""",
                [c("gcloud auth list"), c("gcloud config get-value project"), c("gcloud config get-value account"), c("gcloud logging read"), c("api-gateway"), c("severity>=ERROR"), c("gcloud iam service-accounts keys delete KEY123"), c("--iam-account=deployer@atlas-prod.iam.gserviceaccount.com"), rx("confirm|approval|proceed"), nc("--quiet")],
            ),
            item(
                "gcloud-cli",
                "test",
                2,
                """
Held-out eval. Command plan only. Across organization 998877, find all GKE clusters whose resource labels include env=prod and output clean JSON with project, name, location, and status. This is read-only.
""",
                [c("gcloud asset search-all-resources"), c("--scope=organizations/998877"), c("container.googleapis.com/Cluster"), c("env=prod"), c("--format=json"), rx(r"jq|json\("), nc("delete"), nc("resize")],
            ),
            item(
                "gcloud-cli",
                "test",
                3,
                """
Held-out eval. Do not run commands. Project checkout-prod: list current Memorystore Redis instances in us-central1, then prepare to update instance cart-cache to 6GB. Show exact read command, exact update command, impact, confirmation gate, and verification command.
""",
                [c("gcloud auth list"), c("gcloud config get-value project"), c("gcloud redis instances list"), c("--region=us-central1"), c("gcloud redis instances update cart-cache"), c("--size=6"), rx("confirm|approval|proceed"), c("gcloud redis instances describe cart-cache"), nc("--quiet")],
            ),
        ],
    },
    "git-conventional-commits": {
        "train": [
            item(
                "git-conventional-commits",
                "train",
                1,
                """
Do not run git. Write a conventional commit message for a staged diff that adds `--json` output to `src/cli/report.ts` and documents it in README. Include only the message artifact.
""",
                [cs(r"^feat\(cli\): add json report output$"), c("--json"), nc("Added"), nc(".")],
            ),
            item(
                "git-conventional-commits",
                "train",
                2,
                """
Do not run commands. Generate a conventional commit for a staged auth change: `getSession()` now throws `SessionExpiredError` instead of returning null and the public result field `role` is replaced by `permissions`.
""",
                [cs(r"^fix\(auth\)!: .+"), c("BREAKING CHANGE:"), c("null"), c("permissions"), nc(".")],
            ),
            item(
                "git-conventional-commits",
                "train",
                3,
                """
Do not inspect files. Write a conventional commit message for a refactor that renames `src/services/payment.ts` to `src/services/payment-processor.ts` and updates imports in checkout and orders. No behavior changed.
""",
                [cs(r"^refactor\(payments?\): .+"), rx("rename|move"), c("payment-processor"), nc("BREAKING CHANGE:"), nc(".")],
            ),
        ],
        "val": [
            item(
                "git-conventional-commits",
                "val",
                1,
                """
Do not run git. Staged diff adds a cache hit metric and timing histogram around `src/cache/lookup.ts`, with no behavior change. Write the conventional commit.
""",
                [cs(r"^perf\(cache\): .+"), rx("metric|histogram|latency|timing"), nc("BREAKING CHANGE:"), nc(".")],
            ),
            item(
                "git-conventional-commits",
                "val",
                2,
                """
Do not inspect files. Staged changes update only `.github/workflows/test.yml` to add Bun dependency caching and split lint/test jobs. Write the conventional commit.
""",
                [cs(r"^ci\(test\): .+"), c("Bun"), rx("cache|caching"), nc("BREAKING CHANGE:"), nc(".")],
            ),
            item(
                "git-conventional-commits",
                "val",
                3,
                """
No commands. Staged diff removes deprecated `createClient(options.retries)` and replaces it with `createClient({ retry: { limit } })` across docs and tests. Write a conventional commit.
""",
                [cs(r"^refactor\(client\)!: .+"), c("BREAKING CHANGE:"), c("options.retries"), c("retry"), nc(".")],
            ),
        ],
        "test": [
            item(
                "git-conventional-commits",
                "test",
                1,
                """
Held-out eval. Do not run git. Staged diff adds `--csv` export mode to `src/cli/export.ts`, adds unit tests, and updates CLI help text. Write the conventional commit message only.
""",
                [cs(r"^feat\(cli\): add csv export mode$"), c("--csv"), nc("BREAKING CHANGE:"), nc(".")],
            ),
            item(
                "git-conventional-commits",
                "test",
                2,
                """
Held-out eval. Do not inspect files. Staged diff changes public config from `maxRetries` and `retryDelayMs` to nested `retry.limit` and `retry.delayMs`; callers must update config. Write a conventional commit.
""",
                [cs(r"^refactor\(config\)!: .+"), c("BREAKING CHANGE:"), c("maxRetries"), c("retry.limit"), nc(".")],
            ),
            item(
                "git-conventional-commits",
                "test",
                3,
                """
Held-out eval. No commands. Staged changes fix a bug where `parseWebhook()` accepted missing signatures and now throws `MissingSignatureError`; tests were added. Write the conventional commit.
""",
                [cs(r"^fix\(webhooks?\): .+"), c("MissingSignatureError"), rx("signature|missing"), nc("BREAKING CHANGE:"), nc(".")],
            ),
        ],
    },
}


def write_dataset(base: Path) -> None:
    for skill, splits in SPLITS.items():
        for split, items in splits.items():
            path = base / skill / split / "items.json"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(items, indent=2), encoding="utf-8")
        (base / skill / "initial_skill.md").write_text(
            "# Skill\n\nSolve the user task carefully. Prefer concise, exact answers.\n",
            encoding="utf-8",
        )
    manifest = {
        "dataset": DATASET,
        "splits": {skill: {split: len(items) for split, items in splits.items()} for skill, splits in SPLITS.items()},
        "heldout_rule": "Only */test/items.json is used for final evaluation. SkillOpt training uses train and validation/gate uses val.",
    }
    (base / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("repo_root", nargs="?", default=".")
    parser.add_argument("--skillopt-root", default="")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    repo_base = repo_root / "skillopt" / "data" / DATASET
    if repo_base.exists():
        shutil.rmtree(repo_base)
    write_dataset(repo_base)
    print(f"wrote {repo_base}")

    if args.skillopt_root:
        skillopt_root = Path(args.skillopt_root).resolve()
        dest = skillopt_root / "data" / "agent_skill_eval_synthetic_v2"
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(repo_base, dest)
        print(f"copied {dest}")


if __name__ == "__main__":
    main()
