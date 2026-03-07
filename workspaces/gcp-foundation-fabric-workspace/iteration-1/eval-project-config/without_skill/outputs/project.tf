###############################################################################
# GCP Project Configuration using Cloud Foundation Fabric Modules
#
# Features:
#   - GKE and Cloud SQL API enablement
#   - IAM bindings for dev team group and CI/CD service account
#   - Shared VPC attachment to existing host project
#   - CMEK encryption for compute and storage
#   - Org policies: disable serial port access and external IPs on VMs
###############################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = ">= 5.0.0"
    }
  }
}

###############################################################################
# Variables
###############################################################################

variable "billing_account_id" {
  description = "Billing account ID to associate with the project."
  type        = string
}

variable "org_id" {
  description = "GCP organization ID (numeric)."
  type        = number
}

variable "folder_id" {
  description = "Folder ID where the project will be created."
  type        = string
  default     = null
}

variable "project_id" {
  description = "Project ID for the new GCP project."
  type        = string
}

variable "project_name" {
  description = "Human-readable project name."
  type        = string
  default     = "Container App Project"
}

variable "shared_vpc_host_project" {
  description = "Project ID of the existing Shared VPC host project."
  type        = string
}

variable "dev_team_group" {
  description = "Google group email for the dev team."
  type        = string
}

variable "cicd_service_account" {
  description = "Email of the CI/CD service account."
  type        = string
}

variable "kms_project_id" {
  description = "Project ID where KMS keys reside. Defaults to the created project."
  type        = string
  default     = null
}

variable "region" {
  description = "Default region for resources."
  type        = string
  default     = "us-central1"
}

###############################################################################
# Locals
###############################################################################

locals {
  kms_project_id = coalesce(var.kms_project_id, var.project_id)
  parent = (
    var.folder_id != null
    ? "folders/${var.folder_id}"
    : "organizations/${var.org_id}"
  )
}

###############################################################################
# Project (Cloud Foundation Fabric module)
###############################################################################

module "project" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/project?ref=v34.1.0"

  name            = var.project_name
  project_create  = true
  billing_account = var.billing_account_id
  parent          = local.parent
  prefix          = null

  # --- API Services ---
  services = [
    "container.googleapis.com",
    "sqladmin.googleapis.com",
    "compute.googleapis.com",
    "cloudkms.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "servicenetworking.googleapis.com",
    "vpcaccess.googleapis.com",
  ]

  # --- Shared VPC ---
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
  }

  # --- IAM Bindings ---
  iam = {
    "roles/editor" = [
      "group:${var.dev_team_group}",
    ]
    "roles/container.developer" = [
      "group:${var.dev_team_group}",
    ]
    "roles/cloudsql.client" = [
      "group:${var.dev_team_group}",
      "serviceAccount:${var.cicd_service_account}",
    ]
    "roles/container.admin" = [
      "serviceAccount:${var.cicd_service_account}",
    ]
    "roles/storage.admin" = [
      "serviceAccount:${var.cicd_service_account}",
    ]
    "roles/iam.serviceAccountUser" = [
      "serviceAccount:${var.cicd_service_account}",
    ]
  }

  # --- Org Policies ---
  org_policies = {
    "compute.disableSerialPortAccess" = {
      rules = [{ enforce = true }]
    }
    "compute.vmExternalIpAccess" = {
      rules = [{ allow = { values = [] } }]
    }
  }
}

###############################################################################
# KMS Key Ring & Keys for CMEK (Cloud Foundation Fabric module)
###############################################################################

module "kms" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/kms?ref=v34.1.0"

  project_id = module.project.project_id
  keyring = {
    location = var.region
    name     = "${var.project_id}-keyring"
  }

  keys = {
    compute-key = {
      rotation_period = "7776000s" # 90 days
      purpose         = "ENCRYPT_DECRYPT"
    }
    storage-key = {
      rotation_period = "7776000s" # 90 days
      purpose         = "ENCRYPT_DECRYPT"
    }
    gke-key = {
      rotation_period = "7776000s" # 90 days
      purpose         = "ENCRYPT_DECRYPT"
    }
    cloudsql-key = {
      rotation_period = "7776000s" # 90 days
      purpose         = "ENCRYPT_DECRYPT"
    }
  }

  iam = {
    "roles/cloudkms.cryptoKeyEncrypterDecrypter" = {
      compute-key = [
        "serviceAccount:service-${module.project.number}@compute-system.iam.gserviceaccount.com",
      ]
      storage-key = [
        "serviceAccount:service-${module.project.number}@gs-project-accounts.iam.gserviceaccount.com",
      ]
      gke-key = [
        "serviceAccount:service-${module.project.number}@container-engine-robot.iam.gserviceaccount.com",
        "serviceAccount:service-${module.project.number}@compute-system.iam.gserviceaccount.com",
      ]
      cloudsql-key = [
        "serviceAccount:service-${module.project.number}@gcp-sa-cloud-sql.iam.gserviceaccount.com",
      ]
    }
  }
}

###############################################################################
# Outputs
###############################################################################

output "project_id" {
  description = "The created project ID."
  value       = module.project.project_id
}

output "project_number" {
  description = "The created project number."
  value       = module.project.number
}

output "enabled_services" {
  description = "List of enabled APIs."
  value       = module.project.services
}

output "kms_key_ids" {
  description = "Map of KMS crypto key IDs for CMEK."
  value       = module.kms.key_ids
}

output "shared_vpc_host_project" {
  description = "The Shared VPC host project this service project is attached to."
  value       = var.shared_vpc_host_project
}
