/**
 * Copyright 2024 Google LLC
 *
 * Hub and spoke VPCs using CFF `net-vpc` module.
 * Hub VPC: 3 subnets across europe-west1, us-central1, asia-southeast1.
 * Spoke VPCs: 1 subnet each (dev in europe-west1, prod in us-central1).
 */

# -----------------------------------------------------------------------------
# Hub VPC
# -----------------------------------------------------------------------------

module "vpc-hub" {
  source     = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc?ref=v34.1.0"
  project_id = module.project-hub.project_id
  name       = "hub-vpc"
  subnets = [
    {
      name          = "hub-subnet-ew1"
      ip_cidr_range = "10.0.0.0/24"
      region        = var.region_primary
      secondary_ip_ranges = {
        pods     = "172.16.0.0/20"
        services = "192.168.0.0/24"
      }
    },
    {
      name          = "hub-subnet-uc1"
      ip_cidr_range = "10.0.1.0/24"
      region        = var.region_secondary
      secondary_ip_ranges = {
        pods     = "172.16.16.0/20"
        services = "192.168.1.0/24"
      }
    },
    {
      name          = "hub-subnet-ase1"
      ip_cidr_range = "10.0.2.0/24"
      region        = var.region_tertiary
      secondary_ip_ranges = {
        pods     = "172.16.32.0/20"
        services = "192.168.2.0/24"
      }
    },
  ]
}

# -----------------------------------------------------------------------------
# Spoke VPC — Dev
# -----------------------------------------------------------------------------

module "vpc-spoke-dev" {
  source     = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc?ref=v34.1.0"
  project_id = module.project-spoke-dev.project_id
  name       = "spoke-dev-vpc"
  subnets = [
    {
      name          = "spoke-dev-subnet-ew1"
      ip_cidr_range = "10.1.0.0/24"
      region        = var.region_primary
      secondary_ip_ranges = {
        pods     = "172.17.0.0/20"
        services = "192.168.10.0/24"
      }
    },
  ]
}

# -----------------------------------------------------------------------------
# Spoke VPC — Prod
# -----------------------------------------------------------------------------

module "vpc-spoke-prod" {
  source     = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc?ref=v34.1.0"
  project_id = module.project-spoke-prod.project_id
  name       = "spoke-prod-vpc"
  subnets = [
    {
      name          = "spoke-prod-subnet-uc1"
      ip_cidr_range = "10.2.0.0/24"
      region        = var.region_secondary
      secondary_ip_ranges = {
        pods     = "172.18.0.0/20"
        services = "192.168.20.0/24"
      }
    },
  ]
}
