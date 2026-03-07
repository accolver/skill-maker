# Factories Reference

This document provides a comprehensive reference for factory patterns in CFF.

## What are factories?

Factories consume YAML files and deploy resources from them. They reduce HCL
duplication when managing many similar resources (projects, VPCs, firewall
rules).

## factories_config Variable

Most modules that support factories expose a `factories_config` variable:

```hcl
variable "factories_config" {
  description = "Configuration for YAML-based resource factories."
  type = object({
    # Keys vary by module — see table below
  })
  default = null
}
```

## Module Factory Keys

| Module                  | Factory Key               | What It Creates             | Dependencies                         |
| :---------------------- | :------------------------ | :-------------------------- | :----------------------------------- |
| analytics-hub           | `listings`                | Analytics Hub Listings      | `project_id`, `region`               |
| billing-account         | `budgets_data_path`       | Billing Budgets             | `id` (Billing Account ID)            |
| data-catalog-policy-tag | `taxonomy`                | Policy Tags                 | `project_id`, `location`             |
| dns-response-policy     | `rules`                   | Response Policy Rules       | `project_id`                         |
| folder                  | `org_policies`            | Organization Policies       | folder ID                            |
| folder                  | `pam_entitlements`        | PAM Entitlements            | folder ID                            |
| net-firewall-policy     | `egress_rules_file_path`  | Egress Firewall Rules       | policy name                          |
| net-firewall-policy     | `ingress_rules_file_path` | Ingress Firewall Rules      | policy name                          |
| net-vpc                 | `subnets_folder`          | Subnets                     | `project_id`, `region`, network name |
| net-vpc                 | `internal_ranges_folder`  | Internal Ranges             | `project_id`, network name           |
| net-vpc-factory         | `vpcs`                    | VPCs + associated resources | `context`, `data_defaults`           |
| net-vpc-firewall        | `rules_folder`            | Firewall Rules              | `project_id`, `network`              |
| organization            | `custom_roles`            | Custom IAM Roles            | `organization_id`                    |
| organization            | `org_policies`            | Organization Policies       | `organization_id`                    |
| organization            | `tags`                    | ResourceManager Tags        | `organization_id`                    |
| project                 | `custom_roles`            | Custom IAM Roles            | `project.project_id`                 |
| project                 | `org_policies`            | Organization Policies       | `project.project_id`                 |
| project                 | `tags`                    | ResourceManager Tags        | `project.project_id`                 |
| project                 | `quotas`                  | Service Quotas              | `project.project_id`                 |
| project-factory         | `projects`                | Projects                    | `context`, `data_defaults`           |
| project-factory         | `folders`                 | Folders                     | `context`                            |
| project-factory         | `budgets`                 | Budgets                     | `billing_account`                    |
| vpc-sc                  | `access_levels`           | Access Levels               | `access_policy`, `context`           |
| vpc-sc                  | `perimeters`              | Service Perimeters          | `access_policy`, `context`           |

## FAST Stage Factory Usage

| Stage             | Factory Key                      | Implementation    | Underlying Module               |
| :---------------- | :------------------------------- | :---------------- | :------------------------------ |
| 0-org-setup       | `projects`, `folders`, `budgets` | Module-Backed     | `project-factory`               |
| 1-vpcsc           | `access_levels`, `perimeters`    | Module-Backed     | `vpc-sc`                        |
| 2-networking      | `vpcs`                           | Module-Backed     | `net-vpc-factory`               |
| 2-networking      | `dns`                            | Stage-Implemented | `dns` module                    |
| 2-networking      | `firewall_policies`              | Stage-Implemented | `net-firewall-policy`           |
| 2-networking      | `vpns`                           | Stage-Implemented | `net-vpn-ha`                    |
| 2-project-factory | `projects`, `folders`, `budgets` | Module-Backed     | `project-factory`               |
| 2-security        | `certificate_authorities`        | Stage-Implemented | `certificate-authority-service` |
| 2-security        | `keyrings`                       | Stage-Implemented | `kms`                           |

## Project Factory YAML Format

Each YAML file in the projects directory defines one project:

```yaml
# data/projects/my-app-project.yaml
billing_account: 012345-ABCDEF-012345
parent: folders/1234567890
prefix: myco-dev
labels:
  team: platform
  env: dev
services:
  - compute.googleapis.com
  - container.googleapis.com
iam:
  roles/viewer:
    - group:viewers@example.com
shared_vpc_service_config:
  host_project: my-host-project
  service_identity_iam:
    roles/compute.networkUser:
      - cloudservices
      - container-engine
```

## VPC Factory YAML Format

```yaml
# data/vpcs/hub-vpc.yaml
name: hub-vpc
subnets:
  - name: subnet-01
    region: europe-west1
    ip_cidr_range: 10.0.0.0/24
    secondary_ip_ranges:
      pods: 172.16.0.0/20
      services: 192.168.0.0/24
  - name: subnet-02
    region: us-central1
    ip_cidr_range: 10.1.0.0/24
```

## Firewall Rule Factory YAML Format

```yaml
# data/firewall-rules/allow-ssh.yaml
direction: INGRESS
action: allow
priority: 1000
match:
  src_ip_ranges:
    - 35.235.240.0/20 # IAP
  layer4_configs:
    - ip_protocol: tcp
      ports:
        - "22"
```
