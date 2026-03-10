# Workflow Templates

Complete, copy-paste-ready templates for common Terraform GitHub Actions
patterns.

## Template 1: Reusable Terraform workflow

Use `workflow_call` to share plan/apply logic across environments.

```yaml
# .github/workflows/terraform-reusable.yml
name: Terraform (Reusable)

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      working_directory:
        required: true
        type: string
      apply:
        required: false
        type: boolean
        default: false
      terraform_version:
        required: false
        type: string
        default: "1.9.8"

permissions:
  contents: read
  id-token: write
  pull-requests: write

jobs:
  terraform:
    name: ${{ inputs.apply && 'Apply' || 'Plan' }} (${{ inputs.environment }})
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}

    concurrency:
      group: terraform-${{ inputs.environment }}
      cancel-in-progress: ${{ !inputs.apply }}

    env:
      TF_PLUGIN_CACHE_DIR: ~/.terraform.d/plugin-cache
      TF_INPUT: false

    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - name: Create plugin cache dir
        run: mkdir -p $TF_PLUGIN_CACHE_DIR

      - name: Cache Terraform plugins
        uses: actions/cache@1bd1e32a3bdc45362d1e726936510720a7c30a57 # v4.2.0
        with:
          path: ${{ env.TF_PLUGIN_CACHE_DIR }}
          key: terraform-plugins-${{ runner.os }}-${{ hashFiles('**/.terraform.lock.hcl') }}
          restore-keys: terraform-plugins-${{ runner.os }}-

      - id: auth
        uses: google-github-actions/auth@62cf5bd3e4211a0a0b51f2c6d6a37129d828611d # v2.1.7
        with:
          workload_identity_provider: ${{ vars.WIF_PROVIDER }}
          service_account: ${{ vars.TERRAFORM_SA }}

      - uses: hashicorp/setup-terraform@b9cd54a3c349d3f38e8881555d616ced269862dd # v3.1.2
        with:
          terraform_version: ${{ inputs.terraform_version }}
          terraform_wrapper: false

      - name: Terraform Format Check
        run: terraform fmt -check -recursive
        working-directory: ${{ inputs.working_directory }}

      - name: Terraform Init
        run: terraform init -input=false
        working-directory: ${{ inputs.working_directory }}

      - name: Terraform Validate
        run: terraform validate -no-color
        working-directory: ${{ inputs.working_directory }}

      - name: Terraform Plan
        id: plan
        run: |
          terraform plan -no-color -input=false -out=tfplan 2>&1 | tee plan.txt
          echo "exitcode=${PIPESTATUS[0]}" >> $GITHUB_OUTPUT
        working-directory: ${{ inputs.working_directory }}
        continue-on-error: true

      - name: Comment Plan on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@60a0d83039c74a4aee543508d2ffcb1c3799cdea # v7.0.1
        env:
          PLAN_FILE: ${{ inputs.working_directory }}/plan.txt
          PLAN_OUTCOME: ${{ steps.plan.outcome }}
          ENVIRONMENT: ${{ inputs.environment }}
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync(process.env.PLAN_FILE, 'utf8');
            const output = `#### Terraform Plan (${process.env.ENVIRONMENT}): \`${process.env.PLAN_OUTCOME}\`
            <details><summary>Show Plan</summary>

            \`\`\`terraform
            ${plan.substring(0, 60000)}
            \`\`\`
            </details>`;

            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            const marker = `Terraform Plan (${process.env.ENVIRONMENT})`;
            const botComment = comments.find(c =>
              c.user.type === 'Bot' && c.body.includes(marker)
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

      - name: Terraform Apply
        if: inputs.apply && steps.plan.outcome == 'success'
        run: terraform apply -input=false tfplan
        working-directory: ${{ inputs.working_directory }}
```

## Template 2: Terragrunt variant

For repos using Terragrunt instead of plain Terraform:

```yaml
# Key differences from plain Terraform:

# Setup
- name: Setup Terragrunt
  uses: gruntwork-io/setup-terragrunt@87f77d545caef8a541e1a6e1e53a4e5da0892348 # v1.0.2
  with:
    terragrunt_version: "0.72.6"

# Cache
- name: Cache Terragrunt
  uses: actions/cache@1bd1e32a3bdc45362d1e726936510720a7c30a57 # v4.2.0
  with:
    path: |
      ~/.terraform.d/plugin-cache
      ~/.terragrunt-cache
    key: terragrunt-${{ runner.os }}-${{ hashFiles('**/*.hcl', '**/.terraform.lock.hcl') }}

# Commands use terragrunt instead of terraform
- name: Terragrunt Plan
  run: terragrunt plan -no-color -input=false -out=tfplan
  working-directory: ${{ inputs.working_directory }}

- name: Terragrunt Apply
  if: inputs.apply
  run: terragrunt apply -input=false tfplan
  working-directory: ${{ inputs.working_directory }}

# For run-all across multiple modules:
- name: Terragrunt Plan All
  run: terragrunt run-all plan -no-color -input=false --terragrunt-non-interactive
  working-directory: ${{ inputs.working_directory }}
```

## Template 3: Security scanning workflow

```yaml
# .github/workflows/terraform-security.yml
name: Terraform Security

on:
  pull_request:
    paths: ["infrastructure/**"]

permissions:
  contents: read
  security-events: write

jobs:
  tfsec:
    name: tfsec
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - name: Run tfsec
        uses: aquasecurity/tfsec-action@b3208b27c5e5d4f1b645f1a91185cc64577f3e97 # v1.0.3
        with:
          working_directory: infrastructure/
          format: sarif
          out: tfsec.sarif

      - uses: github/codeql-action/upload-sarif@4dd16135b69a43b6c8efb853346f8437d92d3c93 # v3.26.6
        if: always()
        with:
          sarif_file: tfsec.sarif

  checkov:
    name: Checkov
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - uses: bridgecrewio/checkov-action@2d02e10ab26fd556e44d3e08d0ada947a1b59b88 # v12.2934.0
        with:
          directory: infrastructure/
          framework: terraform
          output_format: sarif
          output_file_path: checkov.sarif
          quiet: true
          soft_fail: true

      - uses: github/codeql-action/upload-sarif@4dd16135b69a43b6c8efb853346f8437d92d3c93 # v3.26.6
        if: always()
        with:
          sarif_file: checkov.sarif
```

## Template 4: Drift detection

```yaml
# .github/workflows/terraform-drift.yml
name: Drift Detection

on:
  schedule:
    - cron: "0 8 * * 1-5" # Weekdays 8am UTC
  workflow_dispatch:

permissions:
  contents: read
  id-token: write
  issues: write

jobs:
  drift:
    name: Check Drift
    runs-on: ubuntu-latest
    environment: dev

    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - id: auth
        uses: google-github-actions/auth@62cf5bd3e4211a0a0b51f2c6d6a37129d828611d # v2.1.7
        with:
          workload_identity_provider: ${{ vars.WIF_PROVIDER }}
          service_account: ${{ vars.TERRAFORM_SA }}

      - uses: hashicorp/setup-terraform@b9cd54a3c349d3f38e8881555d616ced269862dd # v3.1.2

      - name: Terraform Init
        run: terraform init -input=false
        working-directory: infrastructure/

      - name: Detect Drift
        id: drift
        run: |
          set +e
          terraform plan -detailed-exitcode -no-color -input=false 2>&1 | tee plan.txt
          echo "exitcode=$?" >> $GITHUB_OUTPUT
        working-directory: infrastructure/
        continue-on-error: true

      - name: Create Issue on Drift
        if: steps.drift.outputs.exitcode == '2'
        uses: actions/github-script@60a0d83039c74a4aee543508d2ffcb1c3799cdea # v7.0.1
        env:
          PLAN_FILE: infrastructure/plan.txt
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync(process.env.PLAN_FILE, 'utf8');
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Terraform drift detected',
              body: `Drift detected.\n\n<details><summary>Plan</summary>\n\n\`\`\`\n${plan.substring(0, 60000)}\n\`\`\`\n</details>`,
              labels: ['terraform', 'drift'],
            });
```

## Template 5: Dependabot for action pins

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    groups:
      actions:
        patterns:
          - "*"
```

## Template 6: Cost estimation (Infracost)

```yaml
# Add to your plan workflow as an additional job
infracost:
  name: Cost Estimation
  runs-on: ubuntu-latest
  permissions:
    contents: read
    pull-requests: write

  steps:
    - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

    - uses: infracost/actions/setup@v3
      with:
        api-key: ${{ secrets.INFRACOST_API_KEY }}

    - name: Generate cost diff
      run: |
        infracost diff \
          --path=infrastructure/ \
          --format=json \
          --out-file=/tmp/infracost.json

    - uses: infracost/actions/comment@v1
      with:
        path: /tmp/infracost.json
        behavior: update
```
