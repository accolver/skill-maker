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

variable "project_id" {
  description = "The GCP project ID where networking resources will be created."
  type        = string
}

variable "organization_id" {
  description = "The GCP organization ID (numeric) for hierarchical firewall policies."
  type        = string
}

variable "prefix" {
  description = "Prefix used for resource naming to ensure uniqueness."
  type        = string
  default     = "myorg"
}

variable "hub_subnets" {
  description = "Map of hub VPC subnets with region and CIDR configuration."
  type = map(object({
    region        = string
    ip_cidr_range = string
  }))
  default = {
    hub-europe = {
      region        = "europe-west1"
      ip_cidr_range = "10.0.0.0/24"
    }
    hub-us = {
      region        = "us-central1"
      ip_cidr_range = "10.0.1.0/24"
    }
    hub-asia = {
      region        = "asia-southeast1"
      ip_cidr_range = "10.0.2.0/24"
    }
  }
}

variable "spoke_dev_subnets" {
  description = "Map of dev spoke VPC subnets."
  type = map(object({
    region        = string
    ip_cidr_range = string
  }))
  default = {
    dev-europe = {
      region        = "europe-west1"
      ip_cidr_range = "10.1.0.0/24"
    }
  }
}

variable "spoke_prod_subnets" {
  description = "Map of prod spoke VPC subnets."
  type = map(object({
    region        = string
    ip_cidr_range = string
  }))
  default = {
    prod-europe = {
      region        = "europe-west1"
      ip_cidr_range = "10.2.0.0/24"
    }
  }
}

variable "cloud_nat_regions" {
  description = "Regions where Cloud NAT should be deployed on the hub VPC."
  type        = list(string)
  default     = ["europe-west1", "us-central1", "asia-southeast1"]
}

variable "iap_ssh_source_ranges" {
  description = "Google IAP source IP ranges for SSH access."
  type        = list(string)
  default     = ["35.235.240.0/20"]
}
