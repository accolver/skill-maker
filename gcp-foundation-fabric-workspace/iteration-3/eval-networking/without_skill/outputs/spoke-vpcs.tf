/**
 * Spoke VPCs — Dev and Prod
 *
 * Each spoke VPC has a single subnet and is peered back to the hub VPC.
 * Spoke VPCs do NOT peer with each other; all inter-spoke traffic must
 * transit through the hub (enforced by the peering topology).
 *
 * Uses the Cloud Foundation Fabric `net-vpc` module.
 */

# ---------- Dev Spoke VPC ----------

module "spoke_dev_vpc" {
  source     = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc?ref=v34.1.0"
  project_id = var.project_id
  name       = "${var.prefix}-spoke-dev-vpc"

  subnets = [
    for name, cfg in var.spoke_dev_subnets : {
      name          = "${var.prefix}-${name}"
      region        = cfg.region
      ip_cidr_range = cfg.ip_cidr_range
    }
  ]
}

# ---------- Prod Spoke VPC ----------

module "spoke_prod_vpc" {
  source     = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-vpc?ref=v34.1.0"
  project_id = var.project_id
  name       = "${var.prefix}-spoke-prod-vpc"

  subnets = [
    for name, cfg in var.spoke_prod_subnets : {
      name          = "${var.prefix}-${name}"
      region        = cfg.region
      ip_cidr_range = cfg.ip_cidr_range
    }
  ]
}
