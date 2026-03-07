/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

###############################################################################
# Variables
###############################################################################

variable "billing_account" {
  description = "Billing account ID for the project."
  type        = string
}

variable "folder_id" {
  description = "Folder ID where the project will be created (e.g. folders/1234567890)."
  type        = string
}

variable "host_project_id" {
  description = "Project ID of the existing Shared VPC host project."
  type        = string
}

variable "kms_key_compute" {
  description = "KMS crypto key self-link for Compute Engine CMEK."
  type        = string
}

variable "kms_key_storage" {
  description = "KMS crypto key self-link for Cloud Storage CMEK."
  type        = string
}

variable "prefix" {
  description = "Optional prefix used for resource names."
  type        = string
  default     = null
  validation {
    condition     = var.prefix != ""
    error_message = "Prefix cannot be empty, please use null instead."
  }
}

variable "project_name" {
  description = "Short name for the project (combined with prefix for the full ID)."
  type        = string
  default     = "app-container-0"
}

variable "dev_team_group" {
  description = "Google Group email for the dev team."
  type        = string
  default     = "group:dev-team@example.com"
}

variable "cicd_service_account" {
  description = "CI/CD service account email."
  type        = string
  default     = "serviceAccount:cicd-sa@cicd-project.iam.gserviceaccount.com"
}

variable "labels" {
  description = "Resource labels applied to the project."
  type        = map(string)
  default = {
    environment = "dev"
    team        = "platform"
    workload    = "containers"
  }
}

###############################################################################
# Project — CFF modules/project
#
# Single module block encapsulates: project creation, API enablement,
# IAM bindings, Shared VPC attachment, CMEK, and org policies.
# This follows the CFF "design by logical entity" principle.
###############################################################################

module "project" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/project?ref=v54.0.0"

  name            = var.project_name
  prefix          = var.prefix
  parent          = var.folder_id
  billing_account = var.billing_account
  labels          = var.labels

  #############################################################################
  # API Services
  #############################################################################

  services = [
    "cloudsql.googleapis.com",
    "compute.googleapis.com",
    "container.googleapis.com",
    "iam.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "servicenetworking.googleapis.com",
    "sqladmin.googleapis.com",
    "storage.googleapis.com",
    "cloudkms.googleapis.com",
    "orgpolicy.googleapis.com",
  ]

  #############################################################################
  # IAM — role-based bindings
  #
  # Dev team group gets editor + container.developer for GKE workloads.
  # CI/CD SA gets deployer-level roles for automated pipelines.
  #############################################################################

  iam = {
    "roles/editor" = [
      var.dev_team_group,
    ]
    "roles/container.developer" = [
      var.dev_team_group,
    ]
    "roles/cloudsql.client" = [
      var.dev_team_group,
      var.cicd_service_account,
    ]
    "roles/container.admin" = [
      var.cicd_service_account,
    ]
    "roles/iam.serviceAccountUser" = [
      var.cicd_service_account,
    ]
    "roles/storage.admin" = [
      var.cicd_service_account,
    ]
  }

  #############################################################################
  # Shared VPC — attach as service project to existing host
  #############################################################################

  shared_vpc_service_config = {
    attach       = true
    host_project = var.host_project_id

    # Grant Shared VPC roles to GCP-managed service identities so that
    # GKE and Cloud SQL can provision resources in the host VPC.
    service_identity_iam = {
      "roles/compute.networkUser" = [
        "cloudservices",
        "container-engine",
      ]
      "roles/compute.securityAdmin" = [
        "container-engine",
      ]
      "roles/servicenetworking.serviceAgent" = [
        "servicenetworking",
      ]
    }
  }

  #############################################################################
  # CMEK — Customer-Managed Encryption Keys
  #
  # Maps GCP service APIs to KMS crypto key self-links.
  # The KMS keys must already exist and the project's service agents
  # must be granted roles/cloudkms.cryptoKeyEncrypterDecrypter on them.
  #############################################################################

  service_encryption_key_ids = {
    "compute.googleapis.com" = [var.kms_key_compute]
    "storage.googleapis.com" = [var.kms_key_storage]
  }

  #############################################################################
  # Organization Policies
  #
  # Enforced at the project level using the CFF org_policies interface.
  #############################################################################

  org_policies = {
    # Disable serial port access on all VMs in this project
    "compute.disableSerialPortAccess" = {
      rules = [{ enforce = true }]
    }

    # Disable external IPs on VM instances
    "compute.vmExternalIpAccess" = {
      rules = [{ deny = { all = true } }]
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

output "service_accounts" {
  description = "Map of default service accounts for the project."
  value       = module.project.service_accounts
}
