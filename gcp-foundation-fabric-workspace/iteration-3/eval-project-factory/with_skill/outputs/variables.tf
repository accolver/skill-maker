# Variables for project factory configuration
# These allow environment-specific overrides without modifying the main config.

variable "billing_account" {
  description = "Billing account ID for all projects."
  type        = string
  default     = "012345-ABCDEF-012345"
}

variable "parent_folder" {
  description = "Parent folder ID where projects are created."
  type        = string
  default     = "folders/1234567890"
}

variable "prefix" {
  description = "Prefix applied to all project names."
  type        = string
  default     = "myco-dev"
}

variable "shared_vpc_host_project" {
  description = "Host project ID for Shared VPC attachment."
  type        = string
  default     = "myco-dev-shared-vpc-0"
}
