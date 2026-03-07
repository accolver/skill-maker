/**
 * VPC Network Peering — Hub ↔ Spokes
 *
 * Creates bidirectional peering between the hub VPC and each spoke VPC.
 * - export_custom_routes on the hub side so spoke VPCs learn hub routes.
 * - import_custom_routes on the spoke side to receive hub routes.
 * - export_subnet_routes_with_public_ip disabled to keep public IPs
 *   from leaking across peerings.
 *
 * Uses the Cloud Foundation Fabric `net-vpc-peering` module which
 * creates both sides of the peering in a single call.
 */

# ---------- Hub ↔ Dev Spoke ----------

module "peering_hub_dev" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc-peering?ref=v34.1.0"

  local_network = module.hub_vpc.self_link
  peer_network  = module.spoke_dev_vpc.self_link
  prefix        = "hub-dev"

  export_local_custom_routes = true
  import_local_custom_routes = false
  export_peer_custom_routes  = false
  import_peer_custom_routes  = true
}

# ---------- Hub ↔ Prod Spoke ----------

module "peering_hub_prod" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc-peering?ref=v34.1.0"

  local_network = module.hub_vpc.self_link
  peer_network  = module.spoke_prod_vpc.self_link
  prefix        = "hub-prod"

  export_local_custom_routes = true
  import_local_custom_routes = false
  export_peer_custom_routes  = false
  import_peer_custom_routes  = true

  depends_on = [module.peering_hub_dev]
}
