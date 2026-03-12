---
name: gcloud-cli
description: Operate the Google Cloud gcloud CLI safely and effectively. Authenticates users, reads cloud resource state freely for debugging and exploration, and creates, updates, or deletes resources only after explicit user confirmation. Use when working with gcloud, Google Cloud CLI, GCP resources, cloud debugging, reading logs, managing Compute Engine, Cloud Run, Cloud Functions, GKE, IAM, networking, Cloud Storage, Cloud SQL, Pub/Sub, or when the user mentions any gcloud command, Google Cloud project, or needs to authenticate with GCP.
---

# gcloud CLI

## Overview

Operate the `gcloud` CLI as a safe, effective cloud assistant. Read cloud state
freely for debugging and exploration. **Always ask the user before any create,
update, or delete operation.** This is non-negotiable.

## When to use

- When running any `gcloud` command
- When debugging GCP resources (reading logs, describing instances, checking
  IAM)
- When creating, updating, or deleting cloud resources
- When authenticating to Google Cloud
- When exploring what resources exist in a project
- When the user asks about their GCP environment

**Do NOT use when:**

- Managing GCP infrastructure with Terraform (use terraform/IaC skills instead)
- Working with Firebase CLI (`firebase` commands)
- Using Google Cloud client libraries in application code (not CLI operations)

## Workflow

### 1. Verify context

Before running any `gcloud` command, check the current authentication and
project context. Wrong project is the #1 cause of gcloud disasters.

```bash
gcloud auth list
gcloud config get-value project
gcloud config get-value account
```

If not authenticated, guide the user through the appropriate auth flow (see
Authentication section below). If the active project looks wrong, confirm with
the user before proceeding.

### 2. Classify the operation

Every `gcloud` command falls into one of two categories:

| Category      | Verbs                                                                                                                                                    | Action                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Read-only** | `list`, `describe`, `get-iam-policy`, `logs read`, `info`, `operations list`                                                                             | Execute immediately. No confirmation needed.  |
| **Mutating**  | `create`, `delete`, `update`, `deploy`, `set-iam-policy`, `add-iam-policy-binding`, `remove-iam-policy-binding`, `ssh`, `scp`, `start`, `stop`, `resize` | Show command + impact, ask user for approval. |

When uncertain whether a command mutates state, treat it as mutating.

### 3. Discover the right command

For unfamiliar services or subcommands, use the built-in help system:

```bash
# Find available command groups
gcloud --help

# Explore a service
gcloud compute --help

# Find subcommands
gcloud compute instances --help

# Get flags for a specific command
gcloud compute instances create --help
```

Always verify flag names via `--help` rather than guessing. Flags change across
gcloud versions and services.

### 4. Execute read-only commands freely

Run read commands without asking. These are safe and help gather context:

```bash
# List resources
gcloud compute instances list --format="table(name,zone,status)"

# Describe a specific resource
gcloud compute instances describe my-instance --zone=us-central1-a

# Read logs
gcloud logging read "resource.type=gce_instance" --limit=50 --format=json

# Check IAM
gcloud projects get-iam-policy my-project --format=json
```

Use `--format` to control output: `json` for parsing, `table` for readability,
`value` for scripting.

### 5. Confirm before mutating

For ANY create, update, or delete operation:

1. **State what will happen** — describe the resource, the action, and the
   project/region it affects
2. **Show the exact command** — the user should see precisely what will run
3. **Ask for explicit approval** — do not proceed without a clear "yes"

Example confirmation flow:

> I'm going to create a new Compute Engine instance in project `my-project`:
>
> ```bash
> gcloud compute instances create web-server-1 \
>   --zone=us-central1-a \
>   --machine-type=e2-medium \
>   --image-family=debian-11 \
>   --image-project=debian-cloud
> ```
>
> This will create a billable VM in `us-central1-a`. Shall I proceed?

Never use `--quiet` on destructive commands unless the user explicitly requests
it. The `--quiet` flag suppresses confirmation prompts that are a safety net.

### 6. Verify the result

After any mutating operation, run a corresponding read command to confirm:

```bash
# After creating an instance
gcloud compute instances describe web-server-1 --zone=us-central1-a --format="table(name,status,networkInterfaces[0].accessConfigs[0].natIP)"

# After deploying to Cloud Run
gcloud run services describe my-service --region=us-central1 --format="table(status.url,status.conditions.status)"

# After updating IAM
gcloud projects get-iam-policy my-project --flatten="bindings[].members" --filter="bindings.members:user@example.com"
```

## Authentication

Choose the auth flow based on context:

| Context                         | Command                                                                                                      | Notes                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Local development (interactive) | `gcloud auth login`                                                                                          | Opens browser, stores user credentials                            |
| Application Default Credentials | `gcloud auth application-default login`                                                                      | For apps using Google client libraries locally                    |
| Service account (CI/scripts)    | `gcloud auth activate-service-account --key-file=KEY.json`                                                   | Use only when workload identity is unavailable                    |
| Workload Identity (production)  | No `gcloud` auth needed                                                                                      | Preferred for GKE, Cloud Run, Cloud Functions — no keys to manage |
| Impersonation                   | `gcloud auth login --update-adc` then use `--impersonate-service-account=SA@PROJECT.iam.gserviceaccount.com` | Test SA permissions without downloading keys                      |

**Recommendations:**

- For local dev: `gcloud auth login` + `gcloud auth application-default login`
- For CI/CD: Workload Identity Federation (no keys). Fall back to service
  account keys only if WIF is not available.
- For production workloads: Always use Workload Identity. Never store keys.

After authenticating, always set the project:

```bash
gcloud config set project PROJECT_ID
```

## Common service patterns

For detailed command patterns per service, see
[references/command-patterns.md](references/command-patterns.md).

Quick overview of the most common operations:

| Service         | Read                                              | Mutate                                              |
| --------------- | ------------------------------------------------- | --------------------------------------------------- |
| Compute Engine  | `gcloud compute instances list/describe`          | `gcloud compute instances create/delete/start/stop` |
| Cloud Run       | `gcloud run services list/describe`               | `gcloud run deploy`, `gcloud run services delete`   |
| Cloud Functions | `gcloud functions list/describe/logs read`        | `gcloud functions deploy/delete`                    |
| GKE             | `gcloud container clusters list/describe`         | `gcloud container clusters create/delete/resize`    |
| IAM             | `gcloud projects get-iam-policy`                  | `gcloud projects add-iam-policy-binding`            |
| Cloud Storage   | `gcloud storage ls/cat`                           | `gcloud storage cp/rm/mv`                           |
| Cloud SQL       | `gcloud sql instances list/describe`              | `gcloud sql instances create/delete/patch`          |
| Pub/Sub         | `gcloud pubsub topics list`, `subscriptions list` | `gcloud pubsub topics create/delete`                |
| Logging         | `gcloud logging read`                             | `gcloud logging write` (rare)                       |
| Networking      | `gcloud compute networks list/describe`           | `gcloud compute networks create/delete`             |

## Checklist

- [ ] Verified current auth and project context
- [ ] Classified operation as read-only or mutating
- [ ] Used `--help` to discover unfamiliar commands/flags
- [ ] Executed read-only commands without blocking on confirmation
- [ ] Showed exact command and impact before any mutating operation
- [ ] Got explicit user approval before mutating
- [ ] Did NOT use `--quiet` on destructive commands without user request
- [ ] Verified result with a read command after mutation
- [ ] Used appropriate `--format` flag for output readability

## Examples

**Example: Debug why a Cloud Run service is failing**

User asks: "My Cloud Run service `api-server` in `us-east1` is returning 503s,
help me debug."

Agent response (executes all reads freely, no confirmation needed):

```bash
# Check service status
gcloud run services describe api-server --region=us-east1 --format="yaml(status)"

# Check recent revisions
gcloud run revisions list --service=api-server --region=us-east1 --format="table(name,active,status)"

# Read logs for errors
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="api-server" AND severity>=ERROR' --limit=20 --format=json

# Check if the container image exists
gcloud run revisions describe REVISION_NAME --region=us-east1 --format="value(image)"
```

All of these are read-only. Run them immediately and analyze the results.

**Example: Create a new instance (mutating)**

User asks: "Create an e2-medium instance called web-1 in us-central1-a."

Agent response:

> I'll create a Compute Engine instance in project `current-project`:
>
> ```bash
> gcloud compute instances create web-1 \
>   --zone=us-central1-a \
>   --machine-type=e2-medium \
>   --image-family=debian-11 \
>   --image-project=debian-cloud
> ```
>
> This will create a billable e2-medium VM. Shall I proceed?

After user confirms, run the command, then verify:

```bash
gcloud compute instances describe web-1 --zone=us-central1-a --format="table(name,status,machineType,networkInterfaces[0].accessConfigs[0].natIP)"
```

## Common mistakes

| Mistake                                                   | Fix                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| Running mutating commands without checking active project | Always run `gcloud config get-value project` first                 |
| Guessing flag names instead of checking `--help`          | Use `gcloud <command> --help` to verify flags                      |
| Using `--quiet` on delete commands by default             | Only use `--quiet` when user explicitly requests it                |
| Not verifying mutations after execution                   | Run a corresponding `describe` or `list` command                   |
| Using service account keys in production                  | Use Workload Identity Federation instead                           |
| Forgetting `--format` flag, getting unreadable output     | Use `--format=json` for parsing, `--format=table(...)` for display |
| Running `gcloud auth login` in CI environments            | Use `gcloud auth activate-service-account` or Workload Identity    |
| Not specifying `--zone` or `--region`                     | Always include location flags to avoid interactive prompts         |
| Assuming `gcloud` is installed/authenticated              | Verify with `gcloud --version` and `gcloud auth list` first        |
| Deleting resources without confirming the project context | Double-check project with user before any delete                   |

## Quick reference

| Operation         | Command                                                     |
| ----------------- | ----------------------------------------------------------- |
| Check auth        | `gcloud auth list`                                          |
| Check project     | `gcloud config get-value project`                           |
| Switch project    | `gcloud config set project PROJECT_ID`                      |
| List all services | `gcloud services list --enabled`                            |
| Discover commands | `gcloud <group> --help`                                     |
| Format as JSON    | `--format=json`                                             |
| Format as table   | `--format="table(field1,field2)"`                           |
| Filter results    | `--filter="name:prefix-*"`                                  |
| Limit output      | `--limit=N`                                                 |
| All regions/zones | `gcloud compute regions list` / `gcloud compute zones list` |

## Key principles

1. **Read freely, write cautiously** — Read operations are safe and should run
   immediately to gather context. Every mutating operation requires explicit
   user approval, no exceptions.
2. **Verify context first** — Always confirm the active project and account
   before running commands. A command in the wrong project can cause real
   damage.
3. **Discover, don't guess** — Use `--help` to find correct subcommands and
   flags. Guessing leads to errors or worse, valid-but-wrong commands.
4. **Verify after mutation** — Always run a read command after any create,
   update, or delete to confirm the change took effect.
5. **Prefer keyless auth** — Workload Identity Federation for production,
   `gcloud
   auth login` for local dev. Service account keys are a last resort.
