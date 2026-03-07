/**
 * Copyright 2024 Google LLC
 *
 * Hub VPC — central network with subnets in three regions.
 */

module "hub-vpc" {
  source     = "./modules/net-vpc"
  project_id = var.project_id
  name       = "${var.prefix}-hub-vpc"
  subnets = [
    {
      name                  = "${var.prefix}-hub-subnet-eu"
      ip_cidr_range         = "10.0.0.0/24"
      region                = "europe-west1"
      enable_private_access = true
    },
    {
      name                  = "${var.prefix}-hub-subnet-us"
      ip_cidr_range         = "10.0.1.0/24"
      region                = "us-central1"
      enable_private_access = true
    },
    {
      name                  = "${var.prefix}-hub-subnet-asia"
      ip_cidr_range         = "10.0.2.0/24"
      region                = "asia-southeast1"
      enable_private_access = true
    },
  ]
}
