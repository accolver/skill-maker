/**
 * Cloud NAT — Hub VPC
 *
 * Deploys a Cloud Router + Cloud NAT gateway in every region that has a
 * hub subnet. This gives workloads in the hub (and, via peering, in the
 * spokes) outbound internet access without requiring external IPs.
 *
 * Uses the Cloud Foundation Fabric `net-cloudnat` module.
 */

# One Cloud Router per region (required by Cloud NAT)
module "hub_cloud_router" {
  for_each = toset(var.cloud_nat_regions)

  source     = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-cloudnat?ref=v34.1.0"
  project_id = var.project_id
  region     = each.value
  name       = "${var.prefix}-hub-nat-${each.value}"

  router_network = module.hub_vpc.self_link
  router_create  = true

  config_source_subnetworks = {
    all = true
  }

  logging_filter = "ERRORS_ONLY"
}
