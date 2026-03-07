/**
 * Hub-and-Spoke Networking Topology
 * Using GCP Cloud Foundation Fabric (CFF) modules
 *
 * Architecture:
 *   - Hub VPC with 3 subnets (europe-west1, us-central1, asia-southeast1)
 *   - Dev spoke VPC with 1 subnet
 *   - Prod spoke VPC with 1 subnet
 *   - VPC peering: hub <-> dev, hub <-> prod
 *   - Cloud NAT on hub VPC (all 3 regions)
 *   - Hierarchical firewall policy for IAP SSH access
 */

locals {
  hub_regions = distinct([for s in var.hub_subnets : s.region])
}

# ==============================================================================
# Hub VPC
# ==============================================================================

module "hub_vpc" {
  source     = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc?ref=v34.1.0"
  project_id = var.project_id
  name       = "${var.prefix}-hub-vpc"

  subnets = [
    for s in var.hub_subnets : {
      name          = s.name
      ip_cidr_range = s.ip_cidr_range
      region        = s.region
    }
  ]
}

# ==============================================================================
# Dev Spoke VPC
# ==============================================================================

module "dev_vpc" {
  source     = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc?ref=v34.1.0"
  project_id = var.project_id
  name       = "${var.prefix}-dev-vpc"

  subnets = [
    for s in var.spoke_dev_subnets : {
      name          = s.name
      ip_cidr_range = s.ip_cidr_range
      region        = s.region
    }
  ]
}

# ==============================================================================
# Prod Spoke VPC
# ==============================================================================

module "prod_vpc" {
  source     = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc?ref=v34.1.0"
  project_id = var.project_id
  name       = "${var.prefix}-prod-vpc"

  subnets = [
    for s in var.spoke_prod_subnets : {
      name          = s.name
      ip_cidr_range = s.ip_cidr_range
      region        = s.region
    }
  ]
}

# ==============================================================================
# VPC Peering: Hub <-> Dev
# ==============================================================================

module "peering_hub_dev" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc-peering?ref=v34.1.0"

  local_network = module.hub_vpc.self_link
  peer_network  = module.dev_vpc.self_link

  export_local_custom_routes = true
  import_local_custom_routes = false
  export_peer_custom_routes  = false
  import_peer_custom_routes  = true
}

# ==============================================================================
# VPC Peering: Hub <-> Prod
# ==============================================================================

module "peering_hub_prod" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc-peering?ref=v34.1.0"

  local_network = module.hub_vpc.self_link
  peer_network  = module.prod_vpc.self_link

  export_local_custom_routes = true
  import_local_custom_routes = false
  export_peer_custom_routes  = false
  import_peer_custom_routes  = true

  depends_on = [module.peering_hub_dev]
}

# ==============================================================================
# Cloud NAT on Hub VPC (one per region)
# ==============================================================================

module "hub_nat_europe" {
  source         = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-cloudnat?ref=v34.1.0"
  project_id     = var.project_id
  region         = "europe-west1"
  name           = "${var.prefix}-hub-nat-europe"
  router_network = module.hub_vpc.name
  router_create  = true
}

module "hub_nat_us" {
  source         = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-cloudnat?ref=v34.1.0"
  project_id     = var.project_id
  region         = "us-central1"
  name           = "${var.prefix}-hub-nat-us"
  router_network = module.hub_vpc.name
  router_create  = true
}

module "hub_nat_asia" {
  source         = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-cloudnat?ref=v34.1.0"
  project_id     = var.project_id
  region         = "asia-southeast1"
  name           = "${var.prefix}-hub-nat-asia"
  router_network = module.hub_vpc.name
  router_create  = true
}
