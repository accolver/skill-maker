---
name: gcp-foundation-fabric
description: Guide selection and customization of Google Cloud Foundation Fabric or FAST Terraform modules when the task explicitly targets cloud-foundation-fabric patterns, factories, or landing-zone stages.
---

# Google Cloud Foundation Fabric

## Overview

Guide agents through selecting, configuring, and customizing modules and FAST
stages from the
[cloud-foundation-fabric](https://github.com/GoogleCloudPlatform/cloud-foundation-fabric)
repository — Google Cloud's official Terraform modules and landing zone toolkit.

## When to use

- The task explicitly targets Google Cloud Foundation Fabric (CFF) modules, FAST stages, or factory patterns.
- The user needs help selecting, wiring, or customizing `cloud-foundation-fabric` Terraform components.
- The request references Fabric conventions such as project factory, VPC factory, stage contracts, or generated tfvars/outputs.
- The work is GCP landing-zone composition using CFF, not generic Terraform authoring.

**Do NOT use when:**

- The task is plain Terraform with no CFF or FAST dependency.
- The request is primarily Terragrunt orchestration with no underlying CFF module question.
- The user is working on Cloud Foundation Toolkit or another Google IaC project that is not CFF.


## Response format

Always structure the final response with these top-level sections, in this order:

1. **Summary** — state the task, scope, and main conclusion in 1-3 sentences.
2. **Decision / Approach** — state the key classification, assumptions, or chosen path.
3. **Artifacts** — provide the primary deliverable(s) for this skill. Use clear subheadings for multiple files, commands, JSON payloads, queries, or documents.
4. **Validation** — state checks performed, important risks, caveats, or unresolved questions.
5. **Next steps** — list concrete follow-up actions, or write `None` if nothing remains.

Rules:
- Do not omit a section; write `None` when a section does not apply.
- If files are produced, list each file path under **Artifacts** before its contents.
- If commands, JSON, SQL, YAML, or code are produced, put each artifact in fenced code blocks with the correct language tag when possible.
- Keep section names exactly as written above so output stays predictable across skills.

## Workflow

### 1. Identify the right module

Match the user's GCP resource needs to CFF modules:

- Check the [module categories table](#module-categories) above
- Each module has a README with examples — reference them at
  `modules/<name>/README.md`
- Modules are designed for **composition**: combine multiple modules for
  complete solutions (e.g., `project` + `net-vpc` + `net-vpc-firewall`)

### 2. Configure using CFF patterns

CFF modules follow consistent interface patterns. Apply these when writing
module blocks:

**IAM pattern** — every module supports both role-based and group-based IAM.
Always use `group_iam` when granting multiple roles to one principal (CFF
convention):

```hcl
module "project" {
  source = "./modules/project"
  name   = "my-project"
  # Role-based IAM — one role maps to many principals
  iam = {
    "roles/viewer" = ["group:viewers@example.com"]
  }
  # group_iam — one principal maps to many roles (preferred for groups)
  group_iam = {
    "group:editors@example.com" = ["roles/editor", "roles/iam.serviceAccountUser"]
  }
}
```

**Naming pattern** — use `prefix` variable, never random suffixes:

```hcl
module "project" {
  source = "./modules/project"
  name   = "net-hub-0"
  prefix = "myco-gcp-prod"  # Results in: myco-gcp-prod-net-hub-0
}
```

**Factory pattern** — use `factories_config` for scale:

```hcl
module "project-factory" {
  source = "./modules/project-factory"
  factories_config = {
    basepath = "data"  # root path for all factory data
    # paths default to: projects, folders, budgets, project-templates
  }
  data_defaults = {
    billing_account = "012345-ABCDEF-012345"
    parent          = "folders/1234567890"
    prefix          = "myco-dev"
    services        = ["compute.googleapis.com"]
  }
  data_merges = {
    labels = { managed-by = "project-factory" }
  }
}
```

The project-factory uses a three-tier precedence: `data_defaults` (lowest) →
YAML file data → `data_overrides` (highest). `data_merges` additively combines
with file data (useful for labels, services that should always be present).

**Shared VPC pattern** — host and service project configuration:

```hcl
# Host project
module "host-project" {
  source = "./modules/project"
  name   = "net-host-0"
  shared_vpc_host_config = {
    enabled          = true
    service_projects = [module.service-project.project_id]
  }
}

# Service project (attachment with service agent IAM)
module "service-project" {
  source = "./modules/project"
  name   = "svc-app-0"
  shared_vpc_service_config = {
    host_project = module.host-project.project_id
    # Grant service agents network access (key CFF pattern)
    service_agent_iam = {
      "roles/compute.networkUser" = [
        "cloudservices", "container-engine"
      ]
    }
  }
}
```

Note: CFF uses `service_agent_iam` (not `service_identity_iam`) in
`shared_vpc_service_config`. The keys are short service names like
`cloudservices`, `container-engine`, not full email addresses.

**VPC subnet pattern** — subnets are a list of objects with private access on by
default:

```hcl
module "vpc" {
  source     = "./modules/net-vpc"
  project_id = module.project.project_id
  name       = "hub-vpc"
  subnets = [
    {
      name          = "subnet-eu"
      ip_cidr_range = "10.0.0.0/24"
      region        = "europe-west1"
      # enable_private_access defaults to true in CFF
      secondary_ip_ranges = {
        pods     = { ip_cidr_range = "172.16.0.0/20" }
        services = { ip_cidr_range = "192.168.0.0/24" }
      }
    }
  ]
}
```

Note: In CFF, `secondary_ip_ranges` is a map of objects with `ip_cidr_range`
keys (not bare strings). Private Google Access is enabled by default via
`enable_private_access = true`.

**Cloud NAT pattern** — always pass `router_network` for the VPC self-link:

```hcl
module "nat" {
  source         = "./modules/net-cloudnat"
  project_id     = var.project_id
  region         = "europe-west1"
  name           = "hub-nat"
  router_network = module.vpc.self_link
}
```

**Firewall policy rules** — use `layer4_configs` for protocol/port matching:

```hcl
module "fw-policy" {
  source    = "./modules/net-firewall-policy"
  name      = "iap-ssh"
  parent_id = var.organization_id
  rules = {
    allow-iap-ssh = {
      direction = "INGRESS"
      action    = "allow"
      priority  = 1000
      match = {
        src_ip_ranges  = ["35.235.240.0/20"]
        layer4_configs = [{ protocol = "tcp", ports = ["22"] }]
      }
    }
  }
}
```

### 3. Work with FAST stages

When modifying or extending FAST stages:

1. **Understand stage contracts** — each stage consumes outputs from previous
   stages via `variable` blocks with `# tfdoc:variable:source <stage>` comments
2. **Use output files** — FAST generates provider and tfvars files in GCS for
   downstream stages; maintain this system when adding outputs
3. **Leverage factories** — FAST stages use `factories_config` to drive resource
   creation from YAML; prefer adding YAML files over modifying HCL
4. **Respect the stage DAG** — stages 0 → 1 → 2 → 3; don't create circular
   dependencies

### 4. Customize modules

When extending or modifying CFF modules:

1. **Fork the repo** — CFF is designed to be cloned and forked for production
2. **Follow the Zen of Fabric** — design by logical entity, use stable
   interfaces, prefer flat code, don't be too opinionated
3. **Update documentation** — run `tools/tfdoc.py modules/<name>` after changing
   variables or outputs
4. **Write tests** — add README examples with `# tftest modules=N resources=M`
   comments; optionally add inventory YAML files
5. **Use descriptive file names** — not `main.tf`/`variables.tf`/`outputs.tf`
   but `iam.tf`, `vpc.tf`, `factory.tf`

### 5. Test your code

```bash
# Format
terraform fmt -recursive

# Update docs
./tools/tfdoc.py modules/<module-name>

# Run tests
pytest tests/examples                              # all examples
pytest -k 'modules and <module>:' tests/examples   # specific module
pytest tests                                        # full suite
```

## Checklist

- [ ] Correct CFF module identified for the GCP resource type
- [ ] Module block uses CFF interface patterns (IAM, naming, factories)
- [ ] Variables use object types with defaults (not flat scalar variables)
- [ ] `prefix` used instead of random suffixes for naming
- [ ] Output `depends_on` includes all internal resources for safe composition
- [ ] FAST stage contracts respected (variables sourced from correct upstream
      stage)
- [ ] Factory YAML files follow the module's expected schema
- [ ] `tfdoc` regenerated after variable/output changes
- [ ] Tests pass (`pytest -k 'modules and <name>:' tests/examples`)

## Common Mistakes

| Mistake                                     | Fix                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Using random suffixes in resource names     | Use `prefix` variable: `prefix = "myco-gcp-dev"`                                                              |
| Flat scalar variables for complex config    | Use object variables with optional attributes and defaults                                                    |
| Managing IAM in a separate module           | Put IAM in the same module as the resource (CFF design principle)                                             |
| Manually editing README variable tables     | Run `./tools/tfdoc.py modules/<name>` to regenerate                                                           |
| Referencing modules by registry             | Clone the repo and reference locally or via git tag: `source = "github.com/...//modules/project?ref=v54.0.0"` |
| Creating sub-modules inside a module        | Keep modules flat — avoid nesting to reduce complexity                                                        |
| Using `main.tf` for everything              | Use descriptive filenames: `iam.tf`, `vpc.tf`, `factory.tf`                                                   |
| Ignoring `depends_on` in outputs            | Always add `depends_on = [module.X]` to outputs so consumers wait for full configuration                      |
| Breaking FAST stage contracts               | Check `# tfdoc:variable:source` comments for required upstream outputs                                        |
| Using `terraform-google-modules/*` patterns | CFF has different conventions — don't mix patterns from CFT/terraform-google-modules                          |

## Quick Reference

| Operation                | How                                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Find a module            | Browse `modules/` directory or check the [module categories table](#module-categories)                                                   |
| Reference a module       | `source = "./modules/<name>"` (local) or `"github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/<name>?ref=v54.0.0"` (remote) |
| Add IAM to any resource  | Use `iam = { "roles/X" = ["member:Y"] }` variable (standard across all modules)                                                          |
| Create projects at scale | Use `project-factory` module with `factories_config.projects` pointing to YAML dir                                                       |
| Create VPCs at scale     | Use `net-vpc-factory` module with `factories_config.vpcs` pointing to YAML dir                                                           |
| Set org policies         | Use `org_policies` factory key in `project`, `folder`, or `organization` modules                                                         |
| Configure firewall rules | Use `net-firewall-policy` module with `factories_config` for YAML-driven rules                                                           |
| Set up Shared VPC        | Use `shared_vpc_host_config` on host project, `shared_vpc_service_config` on service projects                                            |
| Run FAST stage           | `cd fast/stages/<stage> && terraform init && terraform apply`                                                                            |
| Bootstrap a new org      | Start with `fast/stages/0-org-setup`                                                                                                     |
| Update module docs       | `./tools/tfdoc.py modules/<module-name>`                                                                                                 |
| Run module tests         | `pytest -k 'modules and <name>:' tests/examples`                                                                                         |
| Generate test inventory  | `pytest -s 'tests/examples/test_plan.py::test_example[modules/<name>:...]'`                                                              |
| Check all linting        | `./tools/lint.sh`                                                                                                                        |

## Key Principles

1. **Design by logical entity** — modules encapsulate all resources for a single
   functional unit (project + IAM + services + org policies), not by product.
   This improves readability and ensures consumers get fully-configured units.

2. **Stable interfaces** — the same variable pattern (`iam`, `factories_config`,
   `prefix`, `labels`) is reused across all modules. Learn it once, apply
   everywhere.

3. **Factories for scale** — YAML-driven factories (`factories_config`) are the
   preferred pattern for managing many similar resources. Add YAML files instead
   of duplicating HCL blocks.

4. **Fork and own** — CFF is designed to be cloned and customized. Reference via
   git tags for stability, but expect to modify code for production needs.

5. **Flat and explicit** — avoid sub-modules, magic, and deep indirection. Code
   should be readable as documentation. Prefer 79-char line lengths and
   alphabetical ordering of variables/outputs.
