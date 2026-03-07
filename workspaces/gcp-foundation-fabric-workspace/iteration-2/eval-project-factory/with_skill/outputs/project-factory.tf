# Project Factory — manages 50+ projects from YAML definitions
#
# Three-tier precedence:
#   data_defaults (lowest) -> YAML file data -> data_overrides (highest)
#   data_merges additively combines with YAML file data
#
# Directory layout:
#   data/
#   ├── projects/          # One YAML file per project
#   ├── project-templates/ # Reusable project templates (optional)
#   ├── folders/           # Folder definitions (optional)
#   └── budgets/           # Budget definitions (optional)

module "project-factory" {
  source = "./modules/project-factory"

  # ---------------------------------------------------------------------------
  # factories_config — points to the YAML data directory
  # ---------------------------------------------------------------------------
  factories_config = {
    basepath = "data" # root path for all factory data
    # Subdirectory defaults (override only if non-standard layout):
    #   projects           = "projects"
    #   folders            = "folders"
    #   budgets            = "budgets"
    #   project_templates  = "project-templates"
  }

  # ---------------------------------------------------------------------------
  # data_defaults — lowest precedence; YAML values override these
  # ---------------------------------------------------------------------------
  data_defaults = {
    billing_account = var.billing_account
    parent          = var.folder_id # e.g. "folders/1234567890"
    prefix          = var.prefix    # e.g. "myco-dev"

    # APIs enabled on every project unless overridden in YAML
    services = [
      "compute.googleapis.com",
      "iam.googleapis.com",
      "logging.googleapis.com",
      "monitoring.googleapis.com",
      "stackdriver.googleapis.com",
      "cloudresourcemanager.googleapis.com",
    ]

    # Shared VPC defaults — all projects attach to the same host
    shared_vpc_service_config = {
      host_project = var.shared_vpc_host_project
      service_identity_iam = {
        "roles/compute.networkUser" = [
          "cloudservices",
        ]
      }
    }
  }

  # ---------------------------------------------------------------------------
  # data_merges — additively merged with YAML data (never overrides)
  # Use for labels and services that must always be present.
  # ---------------------------------------------------------------------------
  data_merges = {
    labels = {
      managed-by = "project-factory"
      org        = "myco"
    }
    services = [
      "billingbudgets.googleapis.com",
    ]
  }

  # ---------------------------------------------------------------------------
  # data_overrides — highest precedence; overrides YAML values
  # Use sparingly — only for values that must never be changed per-project.
  # ---------------------------------------------------------------------------
  # data_overrides = {
  #   prefix = "myco-prod"  # force prefix regardless of YAML
  # }
}

# ---------------------------------------------------------------------------
# Variables
# ---------------------------------------------------------------------------

variable "billing_account" {
  description = "Billing account ID for all projects."
  type        = string
  default     = "012345-ABCDEF-012345"
}

variable "folder_id" {
  description = "Default parent folder for projects."
  type        = string
  default     = "folders/1234567890"
}

variable "prefix" {
  description = "Prefix for project names (e.g. myco-dev)."
  type        = string
  default     = "myco-dev"
}

variable "shared_vpc_host_project" {
  description = "Shared VPC host project ID."
  type        = string
  default     = "myco-prod-net-host-0"
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "projects" {
  description = "Map of project module outputs keyed by YAML filename."
  value       = module.project-factory.projects
  depends_on  = [module.project-factory]
}

output "project_ids" {
  description = "Map of project IDs keyed by YAML filename."
  value = {
    for k, v in module.project-factory.projects : k => v.project_id
  }
}
