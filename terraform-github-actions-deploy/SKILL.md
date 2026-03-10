---
name: terraform-github-actions-deploy
description: Create secure GitHub Actions workflows for Terraform and Terragrunt plan/apply pipelines with OIDC authentication (GCP Workload Identity Federation or AWS OIDC), environment protection, concurrency controls, and security scanning. Use when setting up CI/CD for Terraform, deploying infrastructure via GitHub Actions, creating terraform plan/apply workflows, adding Terragrunt to GitHub Actions, or securing infrastructure pipelines.
---

# Terraform GitHub Actions Deploy

Create production-grade GitHub Actions workflows that plan Terraform on pull
requests and apply on merge, using keyless cloud authentication and
defense-in-depth security.

## When to use

- When creating GitHub Actions workflows for Terraform or Terragrunt
- When setting up CI/CD pipelines for infrastructure-as-code
- When adding plan-on-PR / apply-on-merge automation
- When configuring Workload Identity Federation or OIDC for GitHub Actions
- When securing existing Terraform CI/CD workflows
- When adding drift detection, cost estimation, or security scanning to infra
  pipelines

**Do NOT use when:**

- Writing Terraform/HCL itself (use `terraform-style-guide` skill instead)
- Writing Terraform tests (use `terraform-test` skill instead)
- Building app CI/CD that doesn't involve Terraform (use
  `github-actions-templates` skill)

## Workflow

### 1. Assess current state

Before writing workflows, understand what exists:

- Check `.github/workflows/` for existing Terraform workflows
- Check `infrastructure/` for Terragrunt vs plain Terraform setup
- Check how authentication to the cloud provider works today (service account
  keys, ADC, WIF)
- Check for existing state backend configuration (GCS bucket, S3 bucket, state
  locking)

### 2. Set up keyless authentication

**This is non-negotiable.** Never use static service account keys or access keys
in GitHub Actions.

#### GCP: Workload Identity Federation

The workflow needs `id-token: write` permission to request an OIDC token from
GitHub, which GCP's Workload Identity Pool validates and exchanges for a
short-lived credential.

```yaml
permissions:
  contents: read
  id-token: write # Required for OIDC token

steps:
  - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

  - id: auth
    uses: google-github-actions/auth@62cf5bd3e4211a0a0b51f2c6d6a37129d828611d # v2.1.7
    with:
      workload_identity_provider: ${{ vars.WIF_PROVIDER }}
      service_account: ${{ vars.TERRAFORM_SA }}
```

If WIF infrastructure doesn't exist yet, create it first. See
[references/wif-setup.md](references/wif-setup.md).

#### AWS: OIDC

```yaml
- uses: aws-actions/configure-aws-credentials@e3dd6a429d7300a6a4c196c26e071d42e0343502 # v4.0.2
  with:
    role-to-assume: ${{ vars.AWS_ROLE_ARN }}
    aws-region: ${{ vars.AWS_REGION }}
```

### 3. Create the plan workflow (PR trigger)

This runs on pull requests that touch infrastructure files. It produces a plan
and posts it as a PR comment.

Key requirements:

- Trigger only on relevant path changes (`paths: ['infrastructure/**']`)
- Use `concurrency` to cancel stale plans (safe because plans are read-only)
- Post plan output as a PR comment (update existing comment, don't create
  duplicates)
- Fail the check if the plan fails
- Always use `-input=false` and `-no-color`

See [references/workflow-templates.md](references/workflow-templates.md) for
complete templates.

### 4. Create the apply workflow (push to main trigger)

This runs when PRs merge to main. It re-plans and applies.

Key requirements:

- **Never `cancel-in-progress`** — cancelling a running apply corrupts state
- Use GitHub Environment protection rules (required reviewers for prod)
- Re-plan before apply (don't apply a stale plan from the PR)
- Chain environments: dev -> staging -> prod with `needs:` dependencies
- Store plan as artifact if applying a saved plan

### 5. Add security scanning

Add at least one IaC security scanner as a required status check on PRs:

- **tfsec** (Aqua Security) — Terraform-specific, fast
- **checkov** (Bridgecrew) — multi-framework, policy-as-code
- **trivy** (Aqua Security) — broader scope, also scans configs

### 6. Add operational workflows (optional but recommended)

- **Drift detection** — scheduled `terraform plan -detailed-exitcode` that opens
  issues on drift
- **Cost estimation** — Infracost integration that comments cost impact on PRs
- **Dependabot** — keep action SHA pins updated

## Checklist

- [ ] Authentication uses OIDC/WIF (zero static credentials)
- [ ] `id-token: write` permission is set
- [ ] Every single `uses:` line is pinned by full 40-char commit SHA (not tags,
      not branches — including setup, cache, scanner, and utility actions)
- [ ] `permissions` block restricts GITHUB_TOKEN to minimum required scope
- [ ] Plan workflow triggers on PR with path filter
- [ ] Apply workflow triggers on push to main with path filter
- [ ] Apply workflow uses `concurrency` with `cancel-in-progress: false`
- [ ] Plan workflow uses `concurrency` with `cancel-in-progress: true`
- [ ] `-input=false` flag on all terraform/terragrunt commands
- [ ] `-no-color` flag on plan output used in PR comments
- [ ] Plan output posted as PR comment (updated, not duplicated)
- [ ] PR metadata (title, branch name) never interpolated directly in `run:`
      blocks
- [ ] Environment protection rules configured for production
- [ ] At least one IaC security scanner runs on PRs
- [ ] `.github/dependabot.yml` configured for `github-actions` ecosystem

## Example: Complete GCP + Terragrunt setup

**Plan workflow (`.github/workflows/terraform-plan.yml`):**

```yaml
name: Terraform Plan

on:
  pull_request:
    branches: [main]
    paths:
      - "infrastructure/**"

permissions:
  contents: read
  id-token: write
  pull-requests: write

concurrency:
  group: terraform-plan-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  plan:
    name: Terraform Plan
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - id: auth
        uses: google-github-actions/auth@62cf5bd3e4211a0a0b51f2c6d6a37129d828611d # v2.1.7
        with:
          workload_identity_provider: ${{ vars.WIF_PROVIDER }}
          service_account: ${{ vars.TERRAFORM_SA }}

      - uses: hashicorp/setup-terraform@b9cd54a3c349d3f38e8881555d616ced269862dd # v3.1.2
        with:
          terraform_wrapper: false

      - name: Terraform Init
        run: terraform init -input=false
        working-directory: infrastructure/

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -input=false -out=tfplan 2>&1 | tee plan.txt
        working-directory: infrastructure/
        continue-on-error: true

      - name: Comment Plan on PR
        uses: actions/github-script@60a0d83039c74a4aee543508d2ffcb1c3799cdea # v7.0.1
        env:
          PLAN: ${{ steps.plan.outputs.stdout }}
          PLAN_OUTCOME: ${{ steps.plan.outcome }}
        with:
          script: |
            const output = `#### Terraform Plan: \`${process.env.PLAN_OUTCOME}\`
            <details><summary>Show Plan</summary>

            \`\`\`terraform
            ${process.env.PLAN.substring(0, 60000)}
            \`\`\`
            </details>

            *Triggered by @${{ github.actor }} on \`${{ github.event.pull_request.head.ref }}\`*`;

            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            const botComment = comments.find(c =>
              c.user.type === 'Bot' && c.body.includes('Terraform Plan:')
            );
            if (botComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body: output,
              });
            } else {
              await github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: output,
              });
            }

      - name: Fail if plan failed
        if: steps.plan.outcome == 'failure'
        run: exit 1
```

**Apply workflow (`.github/workflows/terraform-apply.yml`):**

```yaml
name: Terraform Apply

on:
  push:
    branches: [main]
    paths:
      - "infrastructure/**"

permissions:
  contents: read
  id-token: write

concurrency:
  group: terraform-apply
  cancel-in-progress: false # NEVER cancel running applies

jobs:
  apply:
    name: Apply
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - id: auth
        uses: google-github-actions/auth@62cf5bd3e4211a0a0b51f2c6d6a37129d828611d # v2.1.7
        with:
          workload_identity_provider: ${{ vars.WIF_PROVIDER }}
          service_account: ${{ vars.TERRAFORM_SA }}

      - uses: hashicorp/setup-terraform@b9cd54a3c349d3f38e8881555d616ced269862dd # v3.1.2
        with:
          terraform_wrapper: false

      - name: Terraform Init
        run: terraform init -input=false
        working-directory: infrastructure/

      - name: Terraform Plan
        run: terraform plan -no-color -input=false -out=tfplan
        working-directory: infrastructure/

      - name: Terraform Apply
        run: terraform apply -input=false tfplan
        working-directory: infrastructure/
```

## Common mistakes

| Mistake                                              | Fix                                                                                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Using service account key JSON in GitHub Secrets     | Use Workload Identity Federation (GCP) or OIDC (AWS). Zero static credentials.                                                                                                 |
| Pinning actions by tag (`@v4`) or branch (`@master`) | Pin ALL actions by full 40-char commit SHA: `@abc123def456... # v4.2.2`. This includes EVERY `uses:` line — checkout, auth, setup, cache, scanners, script, upload-sarif, etc. |
| `cancel-in-progress: true` on apply workflows        | Set to `false`. Cancelling a running apply corrupts Terraform state.                                                                                                           |
| Interpolating PR title/branch in `run:` blocks       | Use intermediate `env:` variables to prevent shell injection.                                                                                                                  |
| Missing `-input=false` on terraform commands         | CI hangs waiting for interactive input. Always pass `-input=false`.                                                                                                            |
| Overly broad `permissions`                           | Set `contents: read` at workflow level. Add `id-token: write` and `pull-requests: write` only where needed.                                                                    |
| Applying a stale plan from PR                        | Re-plan before apply on the merge commit. PR plan may be outdated.                                                                                                             |
| No concurrency controls                              | Add `concurrency.group` per environment. Parallel applies corrupt state.                                                                                                       |
| Single service account for all environments          | Use per-environment SAs with least-privilege roles. Restrict WIF by branch for prod.                                                                                           |
| Not running security scans on PRs                    | Add tfsec, checkov, or trivy as required status checks.                                                                                                                        |

## Quick reference

| Operation              | Pattern                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------- |
| GCP auth (WIF)         | `google-github-actions/auth@v2` with `workload_identity_provider` + `service_account` |
| AWS auth (OIDC)        | `aws-actions/configure-aws-credentials@v4` with `role-to-assume`                      |
| Setup Terraform        | `hashicorp/setup-terraform@v3` with `terraform_wrapper: false` for raw output         |
| Concurrency (plan)     | `group: tf-plan-${{ github.event.pull_request.number }}`, `cancel-in-progress: true`  |
| Concurrency (apply)    | `group: tf-apply-${{ inputs.environment }}`, `cancel-in-progress: false`              |
| Post PR comment        | `actions/github-script` with plan output via `env:` (not direct interpolation)        |
| Drift detection        | Scheduled `plan -detailed-exitcode`, exit code 2 = drift, open GitHub issue           |
| Cost estimation        | `infracost/actions/setup@v3` + `infracost/actions/comment@v1`                         |
| Dependabot for actions | `.github/dependabot.yml` with `package-ecosystem: github-actions`                     |
| Terragrunt caching     | Cache `~/.terraform.d/plugin-cache` and `~/.terragrunt-cache` with `actions/cache@v4` |

## Key principles

1. **Zero static credentials** — Always use OIDC/WIF. Service account keys in
   GitHub Secrets are a security incident waiting to happen. Short-lived tokens
   from OIDC are scoped to single workflow runs.

2. **Never cancel a running apply** — `cancel-in-progress: false` on apply
   workflows is non-negotiable. A cancelled `terraform apply` leaves state
   partially written and resources in an unknown state. Plans are safe to
   cancel.

3. **Pin EVERY action by SHA — no exceptions** — Tags are mutable references
   that can be reassigned. SHA pins are immutable. This applies to ALL `uses:`
   references in the workflow — not just `actions/checkout` and
   `google-github-actions/auth`, but also setup actions
   (`hashicorp/setup-terraform`, `gruntwork-io/setup-terragrunt`), security
   scanners (`aquasecurity/tfsec-action`, `bridgecrewio/checkov-action`),
   utility actions (`actions/cache`, `actions/github-script`), and upload
   actions (`github/codeql-action`). Format:
   `uses: org/action@<full-40-char-sha> # v1.2.3`. Use Dependabot to keep them
   updated.

4. **Defense in depth** — Layer protections: branch protection, environment
   protection rules, required reviewers, CODEOWNERS, security scanning,
   concurrency controls. No single layer is sufficient.

5. **Least privilege everywhere** — Restrict GITHUB_TOKEN permissions at
   workflow level. Use per-environment service accounts. Scope WIF attribute
   conditions to specific repos and branches.
