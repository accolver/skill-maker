/**
 * Spoke VPCs — dev and prod, each with a single subnet.
 * Uses CFF net-vpc module with subnets list pattern.
 */

module "vpc-spoke-dev" {
  source     = "./modules/net-vpc"
  project_id = var.project_id
  name       = "dev-spoke-vpc"
  prefix     = var.prefix

  subnets = [
    {
      name                  = "dev-subnet-0"
      ip_cidr_range         = var.spoke_config["dev"].ip_cidr_range
      region                = var.spoke_config["dev"].region
      enable_private_access = true
    },
  ]
}

module "vpc-spoke-prod" {
  source     = "./modules/net-vpc"
  project_id = var.project_id
  name       = "prod-spoke-vpc"
  prefix     = var.prefix

  subnets = [
    {
      name                  = "prod-subnet-0"
      ip_cidr_range         = var.spoke_config["prod"].ip_cidr_range
      region                = var.spoke_config["prod"].region
      enable_private_access = true
    },
  ]
}
