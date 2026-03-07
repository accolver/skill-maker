/**
 * Copyright 2024 Google LLC
 *
 * Spoke VPCs — dev and prod, each with a single subnet.
 */

module "dev-spoke-vpc" {
  source     = "./modules/net-vpc"
  project_id = var.project_id
  name       = "${var.prefix}-dev-spoke-vpc"
  subnets = [
    {
      name                  = "${var.prefix}-dev-subnet-eu"
      ip_cidr_range         = "10.1.0.0/24"
      region                = "europe-west1"
      enable_private_access = true
    },
  ]
}

module "prod-spoke-vpc" {
  source     = "./modules/net-vpc"
  project_id = var.project_id
  name       = "${var.prefix}-prod-spoke-vpc"
  subnets = [
    {
      name                  = "${var.prefix}-prod-subnet-eu"
      ip_cidr_range         = "10.2.0.0/24"
      region                = "europe-west1"
      enable_private_access = true
    },
  ]
}
