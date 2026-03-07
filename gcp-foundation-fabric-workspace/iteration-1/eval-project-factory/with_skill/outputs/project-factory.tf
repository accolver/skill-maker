# Project Factory — Terraform Configuration
#
# Creates 50+ GCP projects from YAML definitions using the CFF project-factory
# module. Each YAML file in data/projects/ defines one project. Org policies
# are applied via a separate factory directory (data/org-policies/).
#
# Usage:
#   1. Place one YAML file per project in data/projects/
#   2. (Optional) Place org-policy YAML files in data/org-policies/
#   3. terraform init && terraform plan && terraform apply

locals {
  # Shared billing account — override per-project in YAML if needed
  billing_account = "012345-ABCDEF-012345"

  # Default parent folder for all projects
  parent = "folders/1234567890"

  # Shared VPC host project (set to null if not using Shared VPC)
  shared_vpc_host_project = "myco-prod-net-host-0"
}

module "project-factory" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/project-factory?ref=v34.1.0"

  # ---------------------------------------------------------------------------
  # Factory configuration — points to directories of YAML definitions
  # ---------------------------------------------------------------------------
  factories_config = {
    projects = "data/projects" # one YAML per project
  }

  # ---------------------------------------------------------------------------
  # Defaults — applied to every project unless overridden in its YAML file
  # ---------------------------------------------------------------------------
  data_defaults = {
    billing_account = local.billing_account
    parent          = local.parent
    prefix          = "myco"

    # Labels applied to every project (YAML labels are merged on top)
    labels = {
      managed-by = "terraform"
      org        = "myco"
    }

    # APIs enabled on every project by default
    services = [
      "logging.googleapis.com",
      "monitoring.googleapis.com",
      "cloudresourcemanager.googleapis.com",
      "iam.googleapis.com",
      "serviceusage.googleapis.com",
      "billingbudgets.googleapis.com",
    ]

    # Shared VPC attachment defaults (set to null to disable)
    shared_vpc_service_config = {
      host_project = local.shared_vpc_host_project
      service_identity_iam = {
        "roles/compute.networkUser" = [
          "cloudservices",
        ]
      }
    }
  }

  # ---------------------------------------------------------------------------
  # Data merges — additional context passed to the factory
  # ---------------------------------------------------------------------------
  data_merges = {
    # Labels merged into every project (additive, YAML wins on conflict)
    labels = {
      environment = "prod"
    }

    # Services merged into every project (additive)
    services = [
      "stackdriver.googleapis.com",
    ]
  }
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "projects" {
  description = "Created projects and their attributes."
  value       = module.project-factory.projects
}

output "project_ids" {
  description = "Map of project name to project ID."
  value = {
    for k, v in module.project-factory.projects : k => v.project_id
  }
}
