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

variable "prefix" {
  description = "Prefix applied to resource names."
  type        = string
  default     = "myco-gcp-prod"
}

variable "billing_account_id" {
  description = "Billing account ID for the project."
  type        = string
}

variable "parent_folder_id" {
  description = "Folder ID under which the project is created (e.g. folders/123456789)."
  type        = string
}

variable "host_project_id" {
  description = "Project ID of the existing Shared VPC host project."
  type        = string
}

variable "kms_keys" {
  description = "KMS crypto key self-links for CMEK encryption."
  type = object({
    compute = string
    storage = string
  })
}

variable "dev_team_group" {
  description = "Google Group email for the dev team."
  type        = string
  default     = "dev-team@example.com"
}

variable "cicd_service_account" {
  description = "Email of the CI/CD service account."
  type        = string
  default     = "cicd-sa@cicd-project.iam.gserviceaccount.com"
}

###############################################################################
# Project — containerized application workload
###############################################################################

module "project" {
  source          = "./modules/project"
  name            = "app-container-0"
  prefix          = var.prefix
  parent          = var.parent_folder_id
  billing_account = var.billing_account_id

  # --------------------------------------------------------------------------
  # APIs
  # --------------------------------------------------------------------------
  services = [
    "container.googleapis.com",
    "sqladmin.googleapis.com",
    "compute.googleapis.com",
    "storage.googleapis.com",
    "cloudkms.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "servicenetworking.googleapis.com",
  ]

  # --------------------------------------------------------------------------
  # IAM — role-based bindings
  # --------------------------------------------------------------------------
  iam = {
    "roles/viewer" = [
      "group:${var.dev_team_group}",
    ]
    "roles/container.developer" = [
      "group:${var.dev_team_group}",
    ]
    "roles/cloudsql.client" = [
      "group:${var.dev_team_group}",
      "serviceAccount:${var.cicd_service_account}",
    ]
  }

  # --------------------------------------------------------------------------
  # IAM — group-based bindings (multiple roles to one principal)
  # --------------------------------------------------------------------------
  group_iam = {
    "group:${var.dev_team_group}" = [
      "roles/container.viewer",
      "roles/monitoring.viewer",
      "roles/logging.viewer",
    ]
  }

  iam_bindings_additive = {
    cicd_deployer = {
      member = "serviceAccount:${var.cicd_service_account}"
      role   = "roles/container.admin"
    }
    cicd_storage = {
      member = "serviceAccount:${var.cicd_service_account}"
      role   = "roles/storage.admin"
    }
    cicd_sa_user = {
      member = "serviceAccount:${var.cicd_service_account}"
      role   = "roles/iam.serviceAccountUser"
    }
  }

  # --------------------------------------------------------------------------
  # Shared VPC — attach as service project to existing host
  # --------------------------------------------------------------------------
  shared_vpc_service_config = {
    host_project = var.host_project_id
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

  # --------------------------------------------------------------------------
  # CMEK — customer-managed encryption keys for compute and storage
  # --------------------------------------------------------------------------
  service_encryption_key_ids = {
    "compute.googleapis.com" = [var.kms_keys.compute]
    "storage.googleapis.com" = [var.kms_keys.storage]
  }

  # --------------------------------------------------------------------------
  # Org policies — security hardening
  # --------------------------------------------------------------------------
  org_policies = {
    # Disable serial port access on all VMs
    "compute.disableSerialPortAccess" = {
      rules = [{ enforce = true }]
    }
    # Deny external IPs on all VMs
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
  depends_on  = [module.project]
}

output "project_number" {
  description = "The project number."
  value       = module.project.number
  depends_on  = [module.project]
}

output "project_name" {
  description = "The project name."
  value       = module.project.name
  depends_on  = [module.project]
}
