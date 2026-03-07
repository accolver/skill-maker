# =============================================================================
# Variables for the Project Factory
# =============================================================================

variable "billing_account_id" {
  description = "Billing account ID for project association."
  type        = string
}

variable "org_domain" {
  description = "Organization domain (e.g. example.org)."
  type        = string
}

variable "org_name" {
  description = "Short organization name for labels."
  type        = string
  default     = "myorg"
}

variable "project_prefix" {
  description = "Prefix applied to all project IDs."
  type        = string
  default     = "prj"
}

variable "default_folder_id" {
  description = "Default folder ID for projects that don't specify a parent."
  type        = string
}

variable "shared_folder_id" {
  description = "Folder ID for shared/infrastructure projects."
  type        = string
}

variable "teams_folder_id" {
  description = "Folder ID for team-scoped projects."
  type        = string
}

variable "production_folder_id" {
  description = "Folder ID for production projects."
  type        = string
}

variable "staging_folder_id" {
  description = "Folder ID for staging projects."
  type        = string
}

variable "vpc_host_prod_project_id" {
  description = "VPC host project ID for production."
  type        = string
}

variable "vpc_host_staging_project_id" {
  description = "VPC host project ID for staging."
  type        = string
}

variable "tag_value_prod" {
  description = "Tag value resource name for production environment."
  type        = string
  default     = ""
}

variable "tag_value_staging" {
  description = "Tag value resource name for staging environment."
  type        = string
  default     = ""
}

variable "default_cost_center" {
  description = "Default cost center label value."
  type        = string
  default     = "shared"
}

variable "data_path" {
  description = "Path to the directory containing YAML project/folder definitions."
  type        = string
  default     = "data"
}
