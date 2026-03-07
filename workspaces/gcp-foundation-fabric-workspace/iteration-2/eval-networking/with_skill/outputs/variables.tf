/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

variable "project_id" {
  description = "GCP project ID for networking resources."
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

variable "region_config" {
  description = "Region configuration for hub subnets."
  type = map(object({
    ip_cidr_range = string
  }))
  default = {
    europe-west1 = {
      ip_cidr_range = "10.0.0.0/24"
    }
    us-central1 = {
      ip_cidr_range = "10.0.1.0/24"
    }
    asia-southeast1 = {
      ip_cidr_range = "10.0.2.0/24"
    }
  }
}

variable "spoke_config" {
  description = "Spoke VPC configuration."
  type = map(object({
    region        = string
    ip_cidr_range = string
  }))
  default = {
    dev = {
      region        = "europe-west1"
      ip_cidr_range = "10.1.0.0/24"
    }
    prod = {
      region        = "europe-west1"
      ip_cidr_range = "10.2.0.0/24"
    }
  }
}

variable "iap_ssh_source_ranges" {
  description = "IAP SSH source IP ranges (Google IAP CIDR)."
  type        = list(string)
  default     = ["35.235.240.0/20"]
}

variable "organization_id" {
  description = "GCP organization ID for hierarchical firewall policy."
  type        = string
}

variable "labels" {
  description = "Resource labels."
  type        = map(string)
  default = {
    managed-by = "terraform"
    topology   = "hub-and-spoke"
  }
}
