/**
 * Variables for Hub-and-Spoke Networking Topology
 * Using GCP Cloud Foundation Fabric modules
 */

variable "project_id" {
  description = "The GCP project ID for networking resources."
  type        = string
}

variable "organization_id" {
  description = "The GCP organization ID (numeric)."
  type        = string
}

variable "billing_account" {
  description = "The billing account ID."
  type        = string
  default     = ""
}

variable "prefix" {
  description = "Prefix for resource naming."
  type        = string
  default     = "myorg"
}

variable "hub_subnets" {
  description = "Hub VPC subnet definitions."
  type = list(object({
    name          = string
    ip_cidr_range = string
    region        = string
  }))
  default = [
    {
      name          = "hub-subnet-europe"
      ip_cidr_range = "10.0.0.0/24"
      region        = "europe-west1"
    },
    {
      name          = "hub-subnet-us"
      ip_cidr_range = "10.0.1.0/24"
      region        = "us-central1"
    },
    {
      name          = "hub-subnet-asia"
      ip_cidr_range = "10.0.2.0/24"
      region        = "asia-southeast1"
    },
  ]
}

variable "spoke_dev_subnets" {
  description = "Dev spoke VPC subnet definitions."
  type = list(object({
    name          = string
    ip_cidr_range = string
    region        = string
  }))
  default = [
    {
      name          = "dev-subnet"
      ip_cidr_range = "10.1.0.0/24"
      region        = "europe-west1"
    },
  ]
}

variable "spoke_prod_subnets" {
  description = "Prod spoke VPC subnet definitions."
  type = list(object({
    name          = string
    ip_cidr_range = string
    region        = string
  }))
  default = [
    {
      name          = "prod-subnet"
      ip_cidr_range = "10.2.0.0/24"
      region        = "europe-west1"
    },
  ]
}

variable "iap_cidr_range" {
  description = "Google IAP CIDR range for SSH access."
  type        = string
  default     = "35.235.240.0/20"
}
