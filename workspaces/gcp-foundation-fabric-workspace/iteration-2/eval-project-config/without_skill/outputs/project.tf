# =============================================================================
# GCP Project Configuration using Cloud Foundation Fabric Modules
# =============================================================================
#
# This configuration provisions a GCP project for a containerized application
# with the following capabilities:
#   - GKE and Cloud SQL APIs enabled
#   - IAM bindings for a dev team group and CI/CD service account
#   - Shared VPC attachment to an existing host project
#   - CMEK encryption for compute and storage
#   - Org policies: disable serial port access and external IPs on VMs
# =============================================================================

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------

variable "billing_account_id" {
  description = "Billing account ID to associate with the project."
  type        = string
}

variable "folder_id" {
  description = "Folder ID under which the project will be created (e.g. folders/123456789)."
  type        = string
}

variable "prefix" {
  description = "Prefix for project naming (e.g. 'myorg')."
  type        = string
}

variable "project_name" {
  description = "Short name for the project (combined with prefix to form project ID)."
  type        = string
  default     = "app-project"
}

variable "region" {
  description = "Default GCP region for resources."
  type        = string
  default     = "us-central1"
}

variable "host_project_id" {
  description = "Project ID of the existing Shared VPC host project."
  type        = string
}

variable "dev_team_group" {
  description = "Google Group email for the dev team (e.g. dev-team@example.com)."
  type        = string
}

variable "cicd_service_account" {
  description = "CI/CD service account email (e.g. cicd-sa@other-project.iam.gserviceaccount.com)."
  type        = string
}

# -----------------------------------------------------------------------------
# Project Module — Cloud Foundation Fabric
# -----------------------------------------------------------------------------

module "project" {
  source          = "./fabric/modules/project"
  billing_account = var.billing_account_id
  name            = var.project_name
  parent          = var.folder_id
  prefix          = var.prefix

  # ---------------------------------------------------------------------------
  # APIs / Services
  # ---------------------------------------------------------------------------
  services = [
    "cloudkms.googleapis.com",
    "compute.googleapis.com",
    "container.googleapis.com",
    "iam.googleapis.com",
    "orgpolicy.googleapis.com",
    "servicenetworking.googleapis.com",
    "sqladmin.googleapis.com",
    "storage.googleapis.com",
  ]

  # ---------------------------------------------------------------------------
  # IAM — principal-centric bindings
  # ---------------------------------------------------------------------------
  iam_by_principals = {
    "group:${var.dev_team_group}" = [
      "roles/container.developer",
      "roles/cloudsql.client",
      "roles/logging.viewer",
      "roles/monitoring.viewer",
    ]
    "serviceAccount:${var.cicd_service_account}" = [
      "roles/container.admin",
      "roles/cloudsql.admin",
      "roles/iam.serviceAccountUser",
      "roles/storage.admin",
    ]
  }

  # ---------------------------------------------------------------------------
  # Shared VPC — attach as service project to existing host
  # ---------------------------------------------------------------------------
  shared_vpc_service_config = {
    host_project       = var.host_project_id
    service_iam_grants = module.project.services
    service_agent_iam = {
      "roles/compute.networkUser" = [
        "cloudservices",
        "container-engine",
      ]
      "roles/container.hostServiceAgentUser" = [
        "container-engine",
      ]
    }
  }

  # ---------------------------------------------------------------------------
  # CMEK — encrypt compute and storage with customer-managed keys
  # ---------------------------------------------------------------------------
  service_encryption_key_ids = {
    "compute.googleapis.com" = [module.kms.keys.app-key.id]
    "storage.googleapis.com" = [module.kms.keys.app-key.id]
  }

  # ---------------------------------------------------------------------------
  # Organization Policies
  # ---------------------------------------------------------------------------
  org_policies = {
    # Disable serial port access on VMs
    "compute.disableSerialPortAccess" = {
      rules = [{ enforce = true }]
    }
    # Deny all external IPs on VM instances
    "compute.vmExternalIpAccess" = {
      rules = [{ deny = { all = true } }]
    }
    # Best practice: skip default network creation
    "compute.skipDefaultNetworkCreation" = {
      rules = [{ enforce = true }]
    }
  }
}

# -----------------------------------------------------------------------------
# KMS — Customer-Managed Encryption Keys
# -----------------------------------------------------------------------------

module "kms" {
  source     = "./fabric/modules/kms"
  project_id = module.project.project_id

  keyring = {
    location = var.region
    name     = "${var.prefix}-app-keyring"
  }

  keys = {
    "app-key" = {
      rotation_period = "7776000s" # 90 days
    }
  }

  iam = {
    "roles/cloudkms.cryptoKeyEncrypterDecrypter" = [
      module.project.service_agents["compute"].iam_email,
      module.project.service_agents["container-engine"].iam_email,
      module.project.service_agents["cloud-sql"].iam_email,
      module.project.service_agents["storage"].iam_email,
    ]
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "project_id" {
  description = "The ID of the created project."
  value       = module.project.project_id
}

output "project_number" {
  description = "The numeric identifier of the created project."
  value       = module.project.number
}

output "project_name" {
  description = "The name of the created project."
  value       = module.project.name
}

output "enabled_services" {
  description = "List of enabled APIs/services."
  value       = module.project.services
}

output "kms_keyring_id" {
  description = "The KMS keyring ID used for CMEK."
  value       = module.kms.keyring.id
}

output "kms_key_ids" {
  description = "Map of KMS key names to their IDs."
  value       = { for k, v in module.kms.keys : k => v.id }
}
