/**
 * Copyright 2024 Google LLC
 *
 * VPC Network Peering — hub to each spoke (dev and prod).
 *
 * Peering is bidirectional: each module creates both sides of the peering
 * connection. Export of custom routes from the hub allows spokes to reach
 * all hub subnets and any routes the hub learns.
 */

module "hub-to-dev-peering" {
  source = "./modules/net-vpc-peering"

  local_network = module.hub-vpc.self_link
  peer_network  = module.dev-spoke-vpc.self_link
  prefix        = "${var.prefix}-hub-dev"

  export_local_custom_routes = true
  export_peer_custom_routes  = false
}

module "hub-to-prod-peering" {
  source = "./modules/net-vpc-peering"

  local_network = module.hub-vpc.self_link
  peer_network  = module.prod-spoke-vpc.self_link
  prefix        = "${var.prefix}-hub-prod"

  export_local_custom_routes = true
  export_peer_custom_routes  = false

  depends_on = [module.hub-to-dev-peering]
}
