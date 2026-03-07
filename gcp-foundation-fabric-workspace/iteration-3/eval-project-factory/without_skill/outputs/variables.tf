variable "billing_account" {
  description = "Billing account ID for all projects."
  type        = string
}

variable "folder_id" {
  description = "Parent folder ID where projects will be created (e.g. folders/123456789)."
  type        = string
}

variable "shared_vpc_host_project" {
  description = "Shared VPC host project ID."
  type        = string
  default     = ""
}

variable "cost_center" {
  description = "Cost center label applied to all projects via data_merges."
  type        = string
  default     = "engineering"
}
