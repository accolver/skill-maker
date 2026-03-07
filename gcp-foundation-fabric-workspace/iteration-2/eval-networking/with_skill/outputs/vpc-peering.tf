/**
 * VPC Peering — hub to each spoke using CFF net-vpc-peering module.
 * Creates bidirectional peering between hub and dev/prod spokes.
 */

module "peering-hub-dev" {
  source = "./modules/net-vpc-peering"

  local_network = module.vpc-hub.self_link
  peer_network  = module.vpc-spoke-dev.self_link
  prefix        = var.prefix

  routes_config = {
    local = {
      export = true
      import = true
    }
    peer = {
      export = true
      import = true
    }
  }
}

module "peering-hub-prod" {
  source = "./modules/net-vpc-peering"

  local_network = module.vpc-hub.self_link
  peer_network  = module.vpc-spoke-prod.self_link
  prefix        = var.prefix

  routes_config = {
    local = {
      export = true
      import = true
    }
    peer = {
      export = true
      import = true
    }
  }

  depends_on = [module.peering-hub-dev]
}
