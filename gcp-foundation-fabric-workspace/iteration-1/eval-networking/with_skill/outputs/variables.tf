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

variable "billing_account" {
  description = "Billing account ID for all projects."
  type        = string
}

variable "organization_id" {
  description = "Organization numeric ID (e.g. 123456789012)."
  type        = number
}

variable "parent" {
  description = "Parent folder or organization for networking projects (e.g. 'folders/123456789' or 'organizations/123456789')."
  type        = string
}

variable "prefix" {
  description = "Prefix used for resource names."
  type        = string
  default     = null
  validation {
    condition     = var.prefix != ""
    error_message = "Prefix cannot be empty, please use null instead."
  }
}

variable "region_primary" {
  description = "Primary region for networking resources."
  type        = string
  default     = "europe-west1"
}

variable "region_secondary" {
  description = "Secondary region for networking resources."
  type        = string
  default     = "us-central1"
}

variable "region_tertiary" {
  description = "Tertiary region for networking resources."
  type        = string
  default     = "asia-southeast1"
}

variable "labels" {
  description = "Resource labels applied to all projects."
  type        = map(string)
  default = {
    environment = "networking"
    managed-by  = "terraform"
  }
}
