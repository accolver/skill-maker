/**
 * Hub VPC — central network with subnets across 3 regions.
 * Uses CFF net-vpc module with subnets list pattern.
 */

module "vpc-hub" {
  source     = "./modules/net-vpc"
  project_id = var.project_id
  name       = "hub-vpc"
  prefix     = var.prefix

  subnets = [
    {
      name                  = "hub-subnet-eu"
      ip_cidr_range         = var.region_config["europe-west1"].ip_cidr_range
      region                = "europe-west1"
      enable_private_access = true
    },
    {
      name                  = "hub-subnet-us"
      ip_cidr_range         = var.region_config["us-central1"].ip_cidr_range
      region                = "us-central1"
      enable_private_access = true
    },
    {
      name                  = "hub-subnet-asia"
      ip_cidr_range         = var.region_config["asia-southeast1"].ip_cidr_range
      region                = "asia-southeast1"
      enable_private_access = true
    },
  ]
}
