/**
 * Copyright 2024 Google LLC
 *
 * Outputs for hub-and-spoke networking topology.
 */

# --- Hub VPC outputs ---

output "hub_vpc_self_link" {
  description = "Self-link of the hub VPC."
  value       = module.hub-vpc.self_link
  depends_on  = [module.hub-vpc]
}

output "hub_vpc_subnets" {
  description = "Map of hub VPC subnets."
  value       = module.hub-vpc.subnets
  depends_on  = [module.hub-vpc]
}

# --- Spoke VPC outputs ---

output "dev_spoke_vpc_self_link" {
  description = "Self-link of the dev spoke VPC."
  value       = module.dev-spoke-vpc.self_link
  depends_on  = [module.dev-spoke-vpc]
}

output "dev_spoke_vpc_subnets" {
  description = "Map of dev spoke VPC subnets."
  value       = module.dev-spoke-vpc.subnets
  depends_on  = [module.dev-spoke-vpc]
}

output "prod_spoke_vpc_self_link" {
  description = "Self-link of the prod spoke VPC."
  value       = module.prod-spoke-vpc.self_link
  depends_on  = [module.prod-spoke-vpc]
}

output "prod_spoke_vpc_subnets" {
  description = "Map of prod spoke VPC subnets."
  value       = module.prod-spoke-vpc.subnets
  depends_on  = [module.prod-spoke-vpc]
}

# --- Peering outputs ---

output "hub_to_dev_peering" {
  description = "Hub-to-dev VPC peering resource."
  value       = module.hub-to-dev-peering
  depends_on  = [module.hub-to-dev-peering]
}

output "hub_to_prod_peering" {
  description = "Hub-to-prod VPC peering resource."
  value       = module.hub-to-prod-peering
  depends_on  = [module.hub-to-prod-peering]
}

# --- Cloud NAT outputs ---

output "hub_nat_eu" {
  description = "Cloud NAT resource in europe-west1."
  value       = module.hub-nat-eu
  depends_on  = [module.hub-nat-eu]
}

output "hub_nat_us" {
  description = "Cloud NAT resource in us-central1."
  value       = module.hub-nat-us
  depends_on  = [module.hub-nat-us]
}

output "hub_nat_asia" {
  description = "Cloud NAT resource in asia-southeast1."
  value       = module.hub-nat-asia
  depends_on  = [module.hub-nat-asia]
}

# --- Firewall policy outputs ---

output "firewall_policy_id" {
  description = "ID of the hierarchical firewall policy."
  value       = module.firewall-policy
  depends_on  = [module.firewall-policy]
}
