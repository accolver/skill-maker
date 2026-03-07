/**
 * Hub VPC
 *
 * Central hub VPC with subnets in europe-west1, us-central1, and
 * asia-southeast1. This VPC acts as the transit network that all spoke
 * VPCs peer with. Cloud NAT is provisioned here so spoke workloads can
 * reach the internet through the hub.
 *
 * Uses the Cloud Foundation Fabric `net-vpc` module.
 */

module "hub_vpc" {
  source     = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc?ref=v34.1.0"
  project_id = var.project_id
  name       = "${var.prefix}-hub-vpc"

  subnets = [
    for name, cfg in var.hub_subnets : {
      name          = "${var.prefix}-${name}"
      region        = cfg.region
      ip_cidr_range = cfg.ip_cidr_range
    }
  ]
}
