/**
 * Outputs — expose key resource attributes for downstream consumption.
 */

output "hub_vpc" {
  description = "Hub VPC resource."
  value       = module.vpc-hub
}

output "spoke_vpcs" {
  description = "Spoke VPC resources."
  value = {
    dev  = module.vpc-spoke-dev
    prod = module.vpc-spoke-prod
  }
}

output "hub_subnet_self_links" {
  description = "Hub VPC subnet self links by region/name."
  value       = module.vpc-hub.subnet_self_links
}

output "peering_hub_dev" {
  description = "Hub-to-dev peering resource."
  value       = module.peering-hub-dev
  depends_on  = [module.peering-hub-dev]
}

output "peering_hub_prod" {
  description = "Hub-to-prod peering resource."
  value       = module.peering-hub-prod
  depends_on  = [module.peering-hub-prod]
}

output "nat_gateways" {
  description = "Cloud NAT gateway resources."
  value = {
    eu   = module.nat-hub-eu
    us   = module.nat-hub-us
    asia = module.nat-hub-asia
  }
}

output "firewall_policy" {
  description = "Hierarchical firewall policy resource."
  value       = module.firewall-policy-iap
}
