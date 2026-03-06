# Infrastructure as Code

> **Status: Planned** — This skill is queued for construction with skill-maker.

A skill for infrastructure as code: writing Terraform/OpenTofu modules,
CloudFormation templates, and Pulumi programs, plus managing state and detecting
drift. Covers the full IaC lifecycle from authoring to operations.

## When built, this skill will...

- Author Terraform/OpenTofu modules with proper variable, output, and state
  design
- Write CloudFormation templates with parameter validation and stack policies
- Build Pulumi programs in TypeScript/Python for cloud infrastructure
- Manage remote state backends (S3, GCS, Azure Blob) with locking
- Detect and reconcile infrastructure drift between code and live resources
- Structure IaC repositories with environments, modules, and CI/CD integration

## Tools & Dependencies

- `terraform` / `opentofu` — HCL-based infrastructure provisioning
- `aws cloudformation` — AWS-native template engine
- `pulumi` — general-purpose IaC with real programming languages

## Getting Started

To build this skill, run skill-maker:

```
Create a skill for infrastructure as code: Terraform/OpenTofu modules, CloudFormation templates, Pulumi programs, state management, and drift detection
```
