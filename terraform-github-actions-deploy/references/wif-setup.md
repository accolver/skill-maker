# Workload Identity Federation Setup

## GCP Setup

### Option A: Terraform (recommended)

```hcl
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github"
  display_name              = "GitHub Actions Pool"
}

resource "google_iam_workload_identity_pool_provider" "repo" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = var.provider_id
  display_name                       = "${var.github_repo} repo"

  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.actor"            = "assertion.actor"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
    "attribute.ref"              = "assertion.ref"
  }

  # CRITICAL: Always restrict by repository_owner at minimum
  attribute_condition = "assertion.repository_owner == '${var.github_org}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account" "terraform_ci" {
  project      = var.project_id
  account_id   = "terraform-ci"
  display_name = "Terraform CI/CD"
}

resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = google_service_account.terraform_ci.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_org}/${var.github_repo}"
}
```

### Option B: gcloud CLI

```bash
# 1. Create pool
gcloud iam workload-identity-pools create "github" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# 2. Create OIDC provider
gcloud iam workload-identity-pools providers create-oidc "my-repo" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="my-repo" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository_owner == 'my-org'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# 3. Create service account
gcloud iam service-accounts create "terraform-ci" \
  --project="${PROJECT_ID}" \
  --display-name="Terraform CI/CD"

# 4. Bind WIF to SA
gcloud iam service-accounts add-iam-policy-binding \
  "terraform-ci@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/my-org/my-repo"
```

## Per-environment service accounts

For production, restrict the WIF provider's attribute condition by branch:

```hcl
resource "google_iam_workload_identity_pool_provider" "repo_prod" {
  # ... same as above, but with stricter condition:
  attribute_condition = "assertion.repository_owner == '${var.github_org}' && assertion.ref == 'refs/heads/main'"
}
```

This ensures only the `main` branch can authenticate to the production service
account.

## Required IAM roles for Terraform CI SA

The SA needs these roles on the projects it manages:

| Role                                    | Purpose                              |
| --------------------------------------- | ------------------------------------ |
| `roles/editor`                          | Broad resource management (dev only) |
| `roles/iam.securityAdmin`               | Manage IAM policies                  |
| `roles/resourcemanager.projectIamAdmin` | Manage project-level IAM             |
| `roles/storage.admin`                   | Access Terraform state bucket        |

For production, prefer granular roles instead of `roles/editor`.

## GitHub Actions usage

After WIF is set up, reference it in workflows:

```yaml
permissions:
  id-token: write # REQUIRED

steps:
  - id: auth
    uses: google-github-actions/auth@62cf5bd3e4211a0a0b51f2c6d6a37129d828611d # v2.1.7
    with:
      workload_identity_provider: "projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/PROVIDER_ID"
      service_account: "terraform-ci@PROJECT_ID.iam.gserviceaccount.com"
```

Store `workload_identity_provider` and `service_account` as GitHub Actions
**variables** (not secrets — they're not sensitive).

## AWS OIDC equivalent

```hcl
# AWS IAM OIDC Provider
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# IAM Role trusting GitHub OIDC
resource "aws_iam_role" "terraform_ci" {
  name = "terraform-ci"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:my-org/my-repo:*"
        }
      }
    }]
  })
}
```
