/**
 * Variables for hub-and-spoke networking topology
 */

variable "project_id" {
  description = "The GCP project ID for networking resources."
  type        = string
}

variable "organization_id" {
  description = "The GCP organization ID for hierarchical firewall policies."
  type        = string
}

variable "region_hub_primary" {
  description = "Primary region for hub VPC."
  type        = string
  default     = "europe-west1"
}

variable "region_hub_secondary" {
  description = "Secondary region for hub VPC."
  type        = string
  default     = "us-central1"
}

variable "region_hub_tertiary" {
  description = "Tertiary region for hub VPC."
  type        = string
  default     = "asia-southeast1"
}

variable "prefix" {
  description = "Prefix for resource names."
  type        = string
  default     = "myorg"
}
