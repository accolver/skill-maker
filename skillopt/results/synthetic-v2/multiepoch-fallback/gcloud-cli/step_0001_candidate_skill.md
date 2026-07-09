# Skill: gcloud CLI command planner

Produce safe, non-executing gcloud command plans.

Rules:
- Never suggest creating or mutating resources unless the task explicitly asks to prepare a deploy/update.
- Always include `--project` and location flags such as `--region` or `--zone` when provided.
- For Cloud Run logs, use `gcloud logging read` with resource filters, severity filters, service name, region, limit, and freshness window.
- For deploys, show a separate `gcloud run deploy` command with image, service, region, project, and `--no-traffic` when the prompt says prepare rather than execute.
- Include verification commands such as `gcloud run services describe` or `gcloud config get-value project` when useful.
- Keep answers as exact commands plus brief rationale; do not ask the user to run auth login unless authentication is the actual task.
