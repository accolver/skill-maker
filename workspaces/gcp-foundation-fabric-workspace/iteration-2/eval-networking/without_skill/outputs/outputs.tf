/**
 * Outputs for hub-and-spoke networking topology
 */

output "hub_vpc_id" {
  description = "Hub VPC self link."
  value       = module.hub_vpc.self_link
}

output "hub_vpc_name" {
  description = "Hub VPC name."
  value       = module.hub_vpc.name
}

output "hub_subnet_ids" {
  description = "Hub subnet self links keyed by name."
  value       = module.hub_vpc.subnet_self_links
}

output "spoke_dev_vpc_id" {
  description = "Dev spoke VPC self link."
  value       = module.spoke_dev_vpc.self_link
}

output "spoke_dev_vpc_name" {
  description = "Dev spoke VPC name."
  value       = module.spoke_dev_vpc.name
}

output "spoke_prod_vpc_id" {
  description = "Prod spoke VPC self link."
  value       = module.spoke_prod_vpc.self_link
}

output "spoke_prod_vpc_name" {
  description = "Prod spoke VPC name."
  value       = module.spoke_prod_vpc.name
}

output "nat_name" {
  description = "Cloud NAT name."
  value       = module.hub_nat.name
}

output "firewall_policy_id" {
  description = "Hierarchical firewall policy ID."
  value       = module.firewall_policy.id
}
