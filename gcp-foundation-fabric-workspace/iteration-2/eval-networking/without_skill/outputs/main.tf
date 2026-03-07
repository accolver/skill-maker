/**
 * Hub-and-Spoke Networking Topology
 *
 * Architecture:
 *   - Hub VPC with 3 subnets (europe-west1, us-central1, asia-southeast1)
 *   - Dev spoke VPC with 1 subnet
 *   - Prod spoke VPC with 1 subnet
 *   - VPC peering: hub <-> dev, hub <-> prod
 *   - Cloud NAT on hub VPC
 *   - Hierarchical firewall policy for IAP SSH access
 *
 * Uses Cloud Foundation Fabric modules from:
 *   github.com/GoogleCloudPlatform/cloud-foundation-fabric
 */

locals {
  hub_subnets = [
    {
      ip_cidr_range       = "10.0.0.0/24"
      name                = "${var.prefix}-hub-subnet-ew1"
      region              = var.region_hub_primary
      secondary_ip_ranges = {}
    },
    {
      ip_cidr_range       = "10.0.1.0/24"
      name                = "${var.prefix}-hub-subnet-uc1"
      region              = var.region_hub_secondary
      secondary_ip_ranges = {}
    },
    {
      ip_cidr_range       = "10.0.2.0/24"
      name                = "${var.prefix}-hub-subnet-as1"
      region              = var.region_hub_tertiary
      secondary_ip_ranges = {}
    },
  ]

  spoke_dev_subnets = [
    {
      ip_cidr_range       = "10.1.0.0/24"
      name                = "${var.prefix}-dev-subnet-ew1"
      region              = var.region_hub_primary
      secondary_ip_ranges = {}
    },
  ]

  spoke_prod_subnets = [
    {
      ip_cidr_range       = "10.2.0.0/24"
      name                = "${var.prefix}-prod-subnet-ew1"
      region              = var.region_hub_primary
      secondary_ip_ranges = {}
    },
  ]
}

###############################################################################
# Hub VPC
###############################################################################

module "hub_vpc" {
  source     = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc?ref=v34.1.0"
  project_id = var.project_id
  name       = "${var.prefix}-hub-vpc"

  subnets = [
    {
      ip_cidr_range = "10.0.0.0/24"
      name          = "${var.prefix}-hub-subnet-ew1"
      region        = "europe-west1"
    },
    {
      ip_cidr_range = "10.0.1.0/24"
      name          = "${var.prefix}-hub-subnet-uc1"
      region        = "us-central1"
    },
    {
      ip_cidr_range = "10.0.2.0/24"
      name          = "${var.prefix}-hub-subnet-as1"
      region        = "asia-southeast1"
    },
  ]
}

###############################################################################
# Spoke VPCs
###############################################################################

module "spoke_dev_vpc" {
  source     = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc?ref=v34.1.0"
  project_id = var.project_id
  name       = "${var.prefix}-dev-vpc"

  subnets = [
    {
      ip_cidr_range = "10.1.0.0/24"
      name          = "${var.prefix}-dev-subnet-ew1"
      region        = "europe-west1"
    },
  ]
}

module "spoke_prod_vpc" {
  source     = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc?ref=v34.1.0"
  project_id = var.project_id
  name       = "${var.prefix}-prod-vpc"

  subnets = [
    {
      ip_cidr_range = "10.2.0.0/24"
      name          = "${var.prefix}-prod-subnet-ew1"
      region        = "europe-west1"
    },
  ]
}

###############################################################################
# VPC Peering: Hub <-> Dev
###############################################################################

module "peering_hub_dev" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc-peering?ref=v34.1.0"

  local_network = module.hub_vpc.self_link
  peer_network  = module.spoke_dev_vpc.self_link

  export_local_custom_routes = true
  export_peer_custom_routes  = false
}

###############################################################################
# VPC Peering: Hub <-> Prod
###############################################################################

module "peering_hub_prod" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc-peering?ref=v34.1.0"

  local_network = module.hub_vpc.self_link
  peer_network  = module.spoke_prod_vpc.self_link

  export_local_custom_routes = true
  export_peer_custom_routes  = false

  depends_on = [module.peering_hub_dev]
}

###############################################################################
# Cloud NAT on Hub VPC
###############################################################################

module "hub_nat" {
  source         = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-cloudnat?ref=v34.1.0"
  project_id     = var.project_id
  region         = var.region_hub_primary
  name           = "${var.prefix}-hub-nat"
  router_network = module.hub_vpc.self_link
}

###############################################################################
# Hierarchical Firewall Policy — IAP SSH Access
###############################################################################

module "firewall_policy" {
  source    = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-firewall-policy?ref=v34.1.0"
  name      = "${var.prefix}-iap-ssh-policy"
  parent_id = var.organization_id

  rules = {
    allow-iap-ssh = {
      description = "Allow SSH access from IAP"
      direction   = "INGRESS"
      action      = "allow"
      priority    = 1000
      match = {
        src_ip_ranges  = ["35.235.240.0/20"]
        layer4_configs = [{ protocol = "tcp", ports = ["22"] }]
      }
    }
  }
}
