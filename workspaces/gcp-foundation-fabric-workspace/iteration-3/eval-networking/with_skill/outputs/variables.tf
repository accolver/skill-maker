/**
 * Copyright 2024 Google LLC
 *
 * Variables for hub-and-spoke networking topology.
 */

variable "project_id" {
  description = "The GCP project ID for networking resources."
  type        = string
}

variable "organization_id" {
  description = "The GCP organization ID for hierarchical firewall policies."
  type        = string
}

variable "prefix" {
  description = "Naming prefix for all resources."
  type        = string
  default     = "myorg"
}

variable "hub_subnets" {
  description = "Hub VPC subnet configurations."
  type = list(object({
    name                  = string
    ip_cidr_range         = string
    region                = string
    enable_private_access = optional(bool, true)
    secondary_ip_ranges   = optional(map(object({ ip_cidr_range = string })), {})
  }))
  default = [
    {
      name                  = "hub-subnet-eu"
      ip_cidr_range         = "10.0.0.0/24"
      region                = "europe-west1"
      enable_private_access = true
    },
    {
      name                  = "hub-subnet-us"
      ip_cidr_range         = "10.0.1.0/24"
      region                = "us-central1"
      enable_private_access = true
    },
    {
      name                  = "hub-subnet-asia"
      ip_cidr_range         = "10.0.2.0/24"
      region                = "asia-southeast1"
      enable_private_access = true
    },
  ]
}
