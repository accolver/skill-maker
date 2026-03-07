# Org Policies via the Project Factory
#
# There are THREE ways to apply org policies with CFF factories:
#
# 1. INLINE IN YAML (recommended for per-project policies)
#    Add an `org_policies` key directly in each project YAML file.
#    See data/projects/app-frontend.yaml and data/projects/data-analytics.yaml
#    for examples. The project-factory module passes this through to the
#    underlying `project` module which creates the policies.
#
# 2. VIA data_merges (recommended for policies on ALL projects)
#    Add org_policies to data_merges so they are additively merged into every
#    project created by the factory. This ensures baseline security policies
#    are always applied regardless of what individual YAML files specify.
#
# 3. VIA data_overrides (for policies that must NEVER be overridden)
#    Add org_policies to data_overrides to force them on every project,
#    overriding any conflicting YAML values.
#
# ============================================================================
# Example: Applying baseline org policies to ALL factory projects
# ============================================================================

module "project-factory-with-org-policies" {
  source = "./modules/project-factory"

  factories_config = {
    basepath = "data"
  }

  data_defaults = {
    billing_account = var.billing_account
    parent          = var.folder_id
    prefix          = var.prefix
    services = [
      "compute.googleapis.com",
      "iam.googleapis.com",
      "logging.googleapis.com",
      "monitoring.googleapis.com",
      "stackdriver.googleapis.com",
      "cloudresourcemanager.googleapis.com",
    ]
  }

  data_merges = {
    labels = {
      managed-by = "project-factory"
    }

    # Baseline org policies merged into every project.
    # Individual YAML files can add MORE policies but cannot remove these.
    org_policies = {
      # Prevent external IPs on all VMs
      "compute.vmExternalIpAccess" = {
        rules = [{
          enforce = true
        }]
      }
      # Require uniform bucket-level access on all GCS buckets
      "storage.uniformBucketLevelAccess" = {
        rules = [{
          enforce = true
        }]
      }
      # Restrict allowed policy member domains to your org
      "iam.allowedPolicyMemberDomains" = {
        rules = [{
          allow = {
            values = ["C0xxxxxxx"]
          }
        }]
      }
    }
  }

  # Policies in data_overrides CANNOT be overridden by YAML files.
  # Use for hard security requirements.
  data_overrides = {
    org_policies = {
      # Absolutely no public Cloud SQL — cannot be overridden per-project
      "sql.restrictPublicIp" = {
        rules = [{
          enforce = true
        }]
      }
    }
  }
}

# ============================================================================
# Alternative: Org policies on a folder (applies to all child projects)
# ============================================================================
#
# If you want org policies to apply to ALL projects in a folder (not just
# factory-managed ones), use the `folder` module with its own org_policies
# factory:
#
# module "team-folder" {
#   source = "./modules/folder"
#   parent = "organizations/1234567890"
#   name   = "Team Workloads"
#
#   factories_config = {
#     org_policies = "data/org-policies"  # directory of YAML policy files
#   }
# }
#
# Each YAML file in data/org-policies/ defines one policy:
#
# # data/org-policies/compute.vmExternalIpAccess.yaml
# rules:
#   - enforce: true
#
# This approach is better when policies should apply to ALL projects under
# a folder, including ones not managed by the project factory.
