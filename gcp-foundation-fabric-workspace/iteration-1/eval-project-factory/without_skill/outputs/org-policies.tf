/**
 * Org Policies via the Project Factory
 *
 * There are THREE ways to apply org policies through the CFF project factory:
 *
 * 1. In `data_defaults` — applied to ALL projects unless overridden
 * 2. In per-project YAML files — applied to individual projects
 * 3. In `data_merges` — merged into every project (additive with YAML)
 *
 * This file shows how to configure org policies at each level.
 */

# ---------------------------------------------------------------------------
# Method 1: Default org policies (applied to ALL projects)
# ---------------------------------------------------------------------------
# These are set in the `defaults` local in main.tf. To add default org
# policies, update the `org_policies` key:

locals {
  # Org policies applied to every project by default
  default_org_policies = {
    # Disable default service account creation
    "constraints/iam.automaticIamGrantsForDefaultServiceAccounts" = {
      rules = [{ enforce = true }]
    }

    # Restrict VM external IPs — no public IPs on VMs by default
    "constraints/compute.vmExternalIpAccess" = {
      rules = [{ deny = { all = true } }]
    }

    # Require OS Login on all VMs
    "constraints/compute.requireOsLogin" = {
      rules = [{ enforce = true }]
    }

    # Disable serial port access
    "constraints/compute.disableSerialPortAccess" = {
      rules = [{ enforce = true }]
    }

    # Restrict public IP on Cloud SQL instances
    "constraints/sql.restrictPublicIp" = {
      rules = [{ enforce = true }]
    }

    # Enforce uniform bucket-level access on GCS
    "constraints/storage.uniformBucketLevelAccess" = {
      rules = [{ enforce = true }]
    }

    # Restrict resource locations to approved regions
    "constraints/gcp.resourceLocations" = {
      rules = [{
        allow = {
          values = [
            "in:us-locations",
            "in:eu-locations",
          ]
        }
      }]
    }

    # Disable service account key creation
    "constraints/iam.disableServiceAccountKeyCreation" = {
      rules = [{ enforce = true }]
    }

    # Require shielded VMs
    "constraints/compute.requireShieldedVm" = {
      rules = [{ enforce = true }]
    }
  }

  # Updated defaults with org policies included
  defaults_with_org_policies = merge(local.defaults, {
    org_policies = local.default_org_policies
  })
}

# To use these defaults, update the project-factory module call in main.tf:
#
#   module "project-factory" {
#     source         = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/project-factory?ref=v34.1.0"
#     data_defaults  = local.defaults_with_org_policies
#     ...
#   }

# ---------------------------------------------------------------------------
# Method 2: Per-project org policies (in YAML)
# ---------------------------------------------------------------------------
# Add an `org_policies` block to any project YAML file. See the
# data-analytics-prod.yaml example which restricts BigQuery export
# and enforces CMEK + data residency.
#
# Example YAML snippet:
#
#   org_policies:
#     "constraints/gcp.resourceLocations":
#       rules:
#         - allow:
#             values:
#               - in:us-locations
#     "constraints/gcp.restrictNonCmekServices":
#       rules:
#         - deny:
#             values:
#               - bigquery.googleapis.com
#               - storage.googleapis.com

# ---------------------------------------------------------------------------
# Method 3: Merged org policies (additive across all projects)
# ---------------------------------------------------------------------------
# Use `data_merges` to ADD org policies to every project without replacing
# what's in the YAML or defaults. This is useful for security baselines
# that must always be present.
#
# In main.tf, update the module call:
#
#   module "project-factory" {
#     source         = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/project-factory?ref=v34.1.0"
#     data_defaults  = local.defaults_with_org_policies
#     data_merges = {
#       org_policies = {
#         "constraints/iam.disableServiceAccountKeyCreation" = {
#           rules = [{ enforce = true }]
#         }
#       }
#     }
#     ...
#   }
#
# The merge ensures this policy is present on EVERY project, even if the
# project YAML defines its own org_policies block.

# ---------------------------------------------------------------------------
# Reference: Common org policy constraints for GCP projects
# ---------------------------------------------------------------------------
#
# | Constraint                                              | Purpose                              |
# |---------------------------------------------------------|--------------------------------------|
# | constraints/iam.automaticIamGrantsForDefaultServiceAccounts | Disable default SA grants       |
# | constraints/iam.disableServiceAccountKeyCreation        | Block SA key creation                |
# | constraints/compute.vmExternalIpAccess                  | Restrict VM public IPs               |
# | constraints/compute.requireOsLogin                      | Enforce OS Login                     |
# | constraints/compute.disableSerialPortAccess             | Disable serial port                  |
# | constraints/compute.requireShieldedVm                   | Require Shielded VMs                 |
# | constraints/sql.restrictPublicIp                        | Block public Cloud SQL               |
# | constraints/storage.uniformBucketLevelAccess            | Enforce uniform bucket access        |
# | constraints/gcp.resourceLocations                       | Restrict resource regions            |
# | constraints/gcp.restrictNonCmekServices                 | Require CMEK for services            |
# | constraints/bigquery.restrictExportConfig               | Restrict BQ data export              |
# | constraints/compute.disableNestedVirtualization         | Disable nested virtualization        |
# | constraints/iam.allowedPolicyMemberDomains              | Restrict IAM to approved domains     |
