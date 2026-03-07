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
  description = "Optional prefix used for resource names."
  type        = string
  default     = "myco-gcp-dev"
  validation {
    condition     = var.prefix != ""
    error_message = "Prefix cannot be empty, please use null instead."
  }
}

variable "billing_account" {
  description = "Billing account ID for the project."
  type        = string
}

variable "parent" {
  description = "Parent folder or organization in 'folders/NNNNN' or 'organizations/NNNNN' format."
  type        = string
}

variable "host_project_id" {
  description = "Project ID of the existing Shared VPC host project."
  type        = string
}

variable "kms_keys" {
  description = "KMS key self-links for CMEK encryption, keyed by service."
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
  description = "CI/CD service account email."
  type        = string
  default     = "cicd-sa@cicd-project.iam.gserviceaccount.com"
}

variable "labels" {
  description = "Resource labels applied to the project."
  type        = map(string)
  default = {
    environment = "dev"
    team        = "platform"
    managed-by  = "terraform"
  }
}

###############################################################################
# Project — CFF modules/project
#
# Single module encapsulates: project creation, API enablement, IAM bindings,
# Shared VPC attachment, CMEK encryption, and org policies.
# This follows the CFF "design by logical entity" principle.
###############################################################################

module "project" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/project?ref=v54.0.0"

  name            = "app-container-0"
  prefix          = var.prefix
  parent          = var.parent
  billing_account = var.billing_account
  labels          = var.labels

  # ---------------------------------------------------------------------------
  # API services
  # ---------------------------------------------------------------------------
  services = [
    "container.googleapis.com",
    "sqladmin.googleapis.com",
    "compute.googleapis.com",
    "iam.googleapis.com",
    "cloudkms.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "stackdriver.googleapis.com",
    "servicenetworking.googleapis.com",
  ]

  # ---------------------------------------------------------------------------
  # IAM — role-based (authoritative per role)
  # ---------------------------------------------------------------------------
  iam = {
    "roles/container.developer" = [
      "group:${var.dev_team_group}",
    ]
    "roles/cloudsql.client" = [
      "group:${var.dev_team_group}",
    ]
    "roles/viewer" = [
      "group:${var.dev_team_group}",
    ]
    "roles/container.admin" = [
      "serviceAccount:${var.cicd_service_account}",
    ]
    "roles/cloudsql.admin" = [
      "serviceAccount:${var.cicd_service_account}",
    ]
    "roles/iam.serviceAccountUser" = [
      "serviceAccount:${var.cicd_service_account}",
    ]
    "roles/storage.admin" = [
      "serviceAccount:${var.cicd_service_account}",
    ]
  }

  # ---------------------------------------------------------------------------
  # Shared VPC — attach to existing host project
  #
  # service_agent_iam grants the service project's robot accounts
  # (cloudservices, container-engine) the specified role on the host project's
  # network resources. Keys are short service names, not full emails.
  # ---------------------------------------------------------------------------
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

  # ---------------------------------------------------------------------------
  # CMEK — service encryption key IDs
  #
  # Maps GCP service API to a list of KMS crypto key self-links.
  # The project module automatically grants encrypt/decrypt to each service's
  # robot account on the referenced keys.
  # ---------------------------------------------------------------------------
  service_encryption_key_ids = {
    "compute.googleapis.com" = [var.kms_keys.compute]
    "storage.googleapis.com" = [var.kms_keys.storage]
  }

  # ---------------------------------------------------------------------------
  # Organization policies — enforced at project level
  #
  # Uses the CFF org_policies interface: map of policy constraint names to
  # rule objects. Boolean constraints use `enforce`, list constraints use
  # `allow`/`deny` with `values`.
  # ---------------------------------------------------------------------------
  org_policies = {
    "compute.disableSerialPortAccess" = {
      rules = [{ enforce = true }]
    }
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
  description = "The project name (with prefix applied)."
  value       = module.project.name
  depends_on  = [module.project]
}

output "service_accounts" {
  description = "Service agent emails created by the project module."
  value       = module.project.service_accounts
  depends_on  = [module.project]
}
