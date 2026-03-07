###############################################################################
# GCP Project Configuration — Cloud Foundation Fabric
#
# Creates a GCP project with:
#   - GKE and Cloud SQL API enablement
#   - IAM bindings for dev team group and CI/CD service account
#   - Shared VPC attachment to an existing host project
#   - CMEK encryption for compute and storage
#   - Org policies: disable serial port access & external IPs on VMs
###############################################################################

locals {
  project_id = "my-app-project-${var.environment}"
}

###############################################################################
# Variables
###############################################################################

variable "billing_account_id" {
  description = "Billing account ID to associate with the project."
  type        = string
}

variable "parent_folder_id" {
  description = "Folder ID under which the project is created (e.g. folders/123456789)."
  type        = string
}

variable "organization_id" {
  description = "GCP organization numeric ID."
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Human-readable project name."
  type        = string
  default     = "my-app-project"
}

variable "region" {
  description = "Default GCP region for resources."
  type        = string
  default     = "us-central1"
}

variable "shared_vpc_host_project" {
  description = "Project ID of the Shared VPC host project."
  type        = string
}

variable "shared_vpc_subnets" {
  description = "List of Shared VPC subnet self-links to attach to this service project."
  type        = list(string)
  default     = []
}

variable "dev_team_group" {
  description = "Google group email for the dev team (e.g. dev-team@example.com)."
  type        = string
}

variable "cicd_service_account" {
  description = "Email of the CI/CD service account (e.g. cicd-sa@other-project.iam.gserviceaccount.com)."
  type        = string
}

variable "kms_project_id" {
  description = "Project ID where the KMS keyring lives. Defaults to this project."
  type        = string
  default     = null
}

variable "kms_keyring_name" {
  description = "Name of the KMS keyring for CMEK."
  type        = string
  default     = "app-keyring"
}

variable "kms_key_name_compute" {
  description = "Name of the KMS crypto key for compute (GKE node disks, etc.)."
  type        = string
  default     = "compute-key"
}

variable "kms_key_name_storage" {
  description = "Name of the KMS crypto key for storage (Cloud SQL, GCS, etc.)."
  type        = string
  default     = "storage-key"
}

###############################################################################
# Project — Cloud Foundation Fabric module
###############################################################################

module "project" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/project?ref=v34.1.0"

  name            = var.project_name
  parent          = var.parent_folder_id
  billing_account = var.billing_account_id
  project_create  = true
  prefix          = var.environment

  services = [
    "container.googleapis.com",         # GKE
    "sqladmin.googleapis.com",          # Cloud SQL Admin
    "sql-component.googleapis.com",     # Cloud SQL
    "compute.googleapis.com",           # Compute Engine (required by GKE & Shared VPC)
    "servicenetworking.googleapis.com", # Service Networking (Cloud SQL private IP)
    "cloudkms.googleapis.com",          # Cloud KMS (CMEK)
    "iam.googleapis.com",               # IAM
    "cloudresourcemanager.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "storage.googleapis.com", # Cloud Storage
  ]

  # ---------------------------------------------------------------------------
  # Shared VPC — attach as service project to the host project
  # ---------------------------------------------------------------------------
  shared_vpc_service_config = {
    host_project = var.shared_vpc_host_project
    service_identity_iam = {
      "roles/compute.networkUser" = [
        "cloudservices",
        "container-engine",
      ]
      "roles/container.hostServiceAgentUser" = [
        "container-engine",
      ]
    }
    network_users = [
      "group:${var.dev_team_group}",
      "serviceAccount:${var.cicd_service_account}",
    ]
    service_identity_subnet_iam = {}
  }

  # ---------------------------------------------------------------------------
  # IAM bindings
  # ---------------------------------------------------------------------------
  iam = {
    # Dev team — editor-level access for development
    "roles/editor" = [
      "group:${var.dev_team_group}",
    ]
    # Dev team — container developer for GKE workloads
    "roles/container.developer" = [
      "group:${var.dev_team_group}",
    ]
    # Dev team — Cloud SQL client for database access
    "roles/cloudsql.client" = [
      "group:${var.dev_team_group}",
    ]
    # CI/CD service account — deploy containers to GKE
    "roles/container.admin" = [
      "serviceAccount:${var.cicd_service_account}",
    ]
    # CI/CD service account — manage Cloud SQL instances
    "roles/cloudsql.admin" = [
      "serviceAccount:${var.cicd_service_account}",
    ]
    # CI/CD service account — manage storage objects (artifacts, backups)
    "roles/storage.admin" = [
      "serviceAccount:${var.cicd_service_account}",
    ]
    # CI/CD service account — view project resources
    "roles/viewer" = [
      "serviceAccount:${var.cicd_service_account}",
    ]
  }

  # ---------------------------------------------------------------------------
  # Org policies — security hardening
  # ---------------------------------------------------------------------------
  org_policies = {
    # Disable serial port access on VMs
    "compute.disableSerialPortAccess" = {
      rules = [
        {
          enforce = true
        }
      ]
    }
    # Deny external IPs on VM instances
    "compute.vmExternalIpAccess" = {
      rules = [
        {
          deny = { all = true }
        }
      ]
    }
  }

  # ---------------------------------------------------------------------------
  # CMEK encryption configuration
  # ---------------------------------------------------------------------------
  encryption_key_ids = {
    compute = [module.kms.keys["${var.kms_key_name_compute}"].id]
    storage = [module.kms.keys["${var.kms_key_name_storage}"].id]
  }

  # Ensure KMS service agent can use the keys
  service_encryption_key_ids = {
    compute  = [module.kms.keys["${var.kms_key_name_compute}"].id]
    sqladmin = [module.kms.keys["${var.kms_key_name_storage}"].id]
    storage  = [module.kms.keys["${var.kms_key_name_storage}"].id]
  }
}

###############################################################################
# KMS Keyring & Keys — CMEK for compute and storage
###############################################################################

module "kms" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/kms?ref=v34.1.0"

  project_id = coalesce(var.kms_project_id, module.project.project_id)
  keyring = {
    location = var.region
    name     = var.kms_keyring_name
  }

  keys = {
    "${var.kms_key_name_compute}" = {
      rotation_period = "7776000s" # 90 days
      labels = {
        purpose     = "compute-encryption"
        environment = var.environment
      }
    }
    "${var.kms_key_name_storage}" = {
      rotation_period = "7776000s" # 90 days
      labels = {
        purpose     = "storage-encryption"
        environment = var.environment
      }
    }
  }

  iam = {
    "roles/cloudkms.cryptoKeyEncrypterDecrypter" = {
      "${var.kms_key_name_compute}" = [
        "serviceAccount:service-${module.project.number}@compute-system.iam.gserviceaccount.com",
        "serviceAccount:service-${module.project.number}@container-engine-robot.iam.gserviceaccount.com",
      ]
      "${var.kms_key_name_storage}" = [
        "serviceAccount:service-${module.project.number}@gcp-sa-cloud-sql.iam.gserviceaccount.com",
        "serviceAccount:service-${module.project.number}@gs-project-accounts.iam.gserviceaccount.com",
      ]
    }
  }
}

###############################################################################
# Outputs
###############################################################################

output "project_id" {
  description = "The project ID."
  value       = module.project.project_id
}

output "project_number" {
  description = "The project number."
  value       = module.project.number
}

output "project_name" {
  description = "The project name."
  value       = module.project.name
}

output "enabled_services" {
  description = "List of enabled APIs/services."
  value       = module.project.services
}

output "shared_vpc_host_project" {
  description = "The Shared VPC host project this service project is attached to."
  value       = var.shared_vpc_host_project
}

output "kms_keyring_id" {
  description = "The KMS keyring ID."
  value       = module.kms.keyring.id
}

output "kms_key_ids" {
  description = "Map of KMS crypto key names to their IDs."
  value = {
    compute = module.kms.keys["${var.kms_key_name_compute}"].id
    storage = module.kms.keys["${var.kms_key_name_storage}"].id
  }
}

output "org_policies" {
  description = "Org policies applied to the project."
  value = {
    serial_port_access_disabled = true
    external_ip_access_denied   = true
  }
}

output "iam_bindings_summary" {
  description = "Summary of IAM bindings applied."
  value = {
    dev_team_group = {
      email = var.dev_team_group
      roles = [
        "roles/editor",
        "roles/container.developer",
        "roles/cloudsql.client",
      ]
    }
    cicd_service_account = {
      email = var.cicd_service_account
      roles = [
        "roles/container.admin",
        "roles/cloudsql.admin",
        "roles/storage.admin",
        "roles/viewer",
      ]
    }
  }
}
