/**
 * Cloud NAT — on the hub VPC for each region with subnets.
 * Uses CFF net-cloudnat module.
 */

module "nat-hub-eu" {
  source         = "./modules/net-cloudnat"
  project_id     = var.project_id
  region         = "europe-west1"
  name           = "hub-nat-eu"
  prefix         = var.prefix
  router_network = module.vpc-hub.self_link

  config_source_subnetworks = {
    all = false
    subnetworks = [
      {
        self_link        = module.vpc-hub.subnet_self_links["europe-west1/hub-subnet-eu"]
        all_ranges       = true
        secondary_ranges = null
      }
    ]
  }

  logging_filter = "ERRORS_ONLY"
}

module "nat-hub-us" {
  source         = "./modules/net-cloudnat"
  project_id     = var.project_id
  region         = "us-central1"
  name           = "hub-nat-us"
  prefix         = var.prefix
  router_network = module.vpc-hub.self_link

  config_source_subnetworks = {
    all = false
    subnetworks = [
      {
        self_link        = module.vpc-hub.subnet_self_links["us-central1/hub-subnet-us"]
        all_ranges       = true
        secondary_ranges = null
      }
    ]
  }

  logging_filter = "ERRORS_ONLY"
}

module "nat-hub-asia" {
  source         = "./modules/net-cloudnat"
  project_id     = var.project_id
  region         = "asia-southeast1"
  name           = "hub-nat-asia"
  prefix         = var.prefix
  router_network = module.vpc-hub.self_link

  config_source_subnetworks = {
    all = false
    subnetworks = [
      {
        self_link        = module.vpc-hub.subnet_self_links["asia-southeast1/hub-subnet-asia"]
        all_ranges       = true
        secondary_ranges = null
      }
    ]
  }

  logging_filter = "ERRORS_ONLY"
}
