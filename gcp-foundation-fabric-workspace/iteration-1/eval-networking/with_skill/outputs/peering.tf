/**
 * Copyright 2024 Google LLC
 *
 * VPC peering between hub and each spoke using CFF `net-vpc-peering` module.
 * Exports custom routes from hub to spokes for centralized routing.
 */

# -----------------------------------------------------------------------------
# Hub <-> Spoke Dev peering
# -----------------------------------------------------------------------------

module "peering-hub-to-spoke-dev" {
  source                     = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc-peering?ref=v34.1.0"
  local_network              = module.vpc-hub.self_link
  peer_network               = module.vpc-spoke-dev.self_link
  export_local_custom_routes = true
  export_peer_custom_routes  = false
  depends_on = [
    module.vpc-hub,
    module.vpc-spoke-dev,
  ]
}

# -----------------------------------------------------------------------------
# Hub <-> Spoke Prod peering
# -----------------------------------------------------------------------------

module "peering-hub-to-spoke-prod" {
  source                     = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc-peering?ref=v34.1.0"
  local_network              = module.vpc-hub.self_link
  peer_network               = module.vpc-spoke-prod.self_link
  export_local_custom_routes = true
  export_peer_custom_routes  = false
  depends_on = [
    module.vpc-hub,
    module.vpc-spoke-prod,
    # Serialize peering creation to avoid quota/race conditions
    module.peering-hub-to-spoke-dev,
  ]
}
