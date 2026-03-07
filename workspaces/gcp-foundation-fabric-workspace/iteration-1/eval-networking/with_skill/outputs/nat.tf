/**
 * Copyright 2024 Google LLC
 *
 * Cloud NAT on the hub VPC using CFF `net-cloudnat` module.
 * One Cloud Router + NAT per region where the hub has subnets.
 */

# -----------------------------------------------------------------------------
# Cloud NAT — europe-west1
# -----------------------------------------------------------------------------

module "nat-hub-ew1" {
  source         = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-cloudnat?ref=v34.1.0"
  project_id     = module.project-hub.project_id
  region         = var.region_primary
  name           = "hub-nat-ew1"
  router_network = module.vpc-hub.name
  config_source_subnetworks = {
    all = false
    subnetworks = [
      {
        self_link        = module.vpc-hub.subnet_self_links["${var.region_primary}/hub-subnet-ew1"]
        all_ranges       = true
        secondary_ranges = null
      }
    ]
  }
  logging_filter = "ERRORS_ONLY"
}

# -----------------------------------------------------------------------------
# Cloud NAT — us-central1
# -----------------------------------------------------------------------------

module "nat-hub-uc1" {
  source         = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-cloudnat?ref=v34.1.0"
  project_id     = module.project-hub.project_id
  region         = var.region_secondary
  name           = "hub-nat-uc1"
  router_network = module.vpc-hub.name
  config_source_subnetworks = {
    all = false
    subnetworks = [
      {
        self_link        = module.vpc-hub.subnet_self_links["${var.region_secondary}/hub-subnet-uc1"]
        all_ranges       = true
        secondary_ranges = null
      }
    ]
  }
  logging_filter = "ERRORS_ONLY"
}

# -----------------------------------------------------------------------------
# Cloud NAT — asia-southeast1
# -----------------------------------------------------------------------------

module "nat-hub-ase1" {
  source         = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-cloudnat?ref=v34.1.0"
  project_id     = module.project-hub.project_id
  region         = var.region_tertiary
  name           = "hub-nat-ase1"
  router_network = module.vpc-hub.name
  config_source_subnetworks = {
    all = false
    subnetworks = [
      {
        self_link        = module.vpc-hub.subnet_self_links["${var.region_tertiary}/hub-subnet-ase1"]
        all_ranges       = true
        secondary_ranges = null
      }
    ]
  }
  logging_filter = "ERRORS_ONLY"
}
