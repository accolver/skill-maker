/**
 * Cloud Foundation Fabric - Project Factory
 *
 * This configuration uses the CFF project-factory module to create
 * 50+ projects from YAML definitions stored in a data directory.
 *
 * Each YAML file in `data/projects/` defines one project with its
 * configuration (billing, APIs, IAM, networking, org policies, etc.).
 */

locals {
  # Defaults applied to every project unless overridden in YAML
  defaults = {
    billing_account = var.billing_account
    parent          = var.folder_id

    # Contacts for essential notifications
    contacts = {
      "cloud-admins@example.com" = ["ALL"]
    }

    # Default labels applied to all projects
    labels = {
      environment = "production"
      managed_by  = "terraform"
      team        = "platform"
    }

    # Default set of APIs enabled on every project
    services = [
      "cloudresourcemanager.googleapis.com",
      "iam.googleapis.com",
      "compute.googleapis.com",
      "logging.googleapis.com",
      "monitoring.googleapis.com",
      "billingbudgets.googleapis.com",
      "serviceusage.googleapis.com",
    ]

    # Shared VPC configuration (optional)
    shared_vpc_service_config = {
      host_project = var.shared_vpc_host_project
    }

    # Default org policies applied to all projects
    org_policies = {}

    # Default metric scopes
    metric_scopes = []

    # Tag bindings
    tag_bindings = {}
  }
}

module "project-factory" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/project-factory?ref=v34.1.0"

  # Path to the directory containing per-project YAML definitions
  data_defaults = local.defaults
  data_merges   = {}
  data_overrides = {
    # Force these values regardless of what YAML says
    parent = var.folder_id
  }

  # Factory data path — each .yaml file = one project
  factory_data_path = var.projects_data_path
}

# ---------------------------------------------------------------------------
# Variables
# ---------------------------------------------------------------------------

variable "billing_account" {
  description = "Billing account ID for all projects."
  type        = string
}

variable "folder_id" {
  description = "Folder ID under which projects are created (e.g. folders/123456789)."
  type        = string
}

variable "shared_vpc_host_project" {
  description = "Shared VPC host project ID (optional)."
  type        = string
  default     = null
}

variable "projects_data_path" {
  description = "Path to the directory containing project YAML definitions."
  type        = string
  default     = "data/projects"
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "projects" {
  description = "Map of created project resources."
  value       = module.project-factory.projects
}

output "service_accounts" {
  description = "Map of service accounts created by the factory."
  value       = module.project-factory.service_accounts
}
