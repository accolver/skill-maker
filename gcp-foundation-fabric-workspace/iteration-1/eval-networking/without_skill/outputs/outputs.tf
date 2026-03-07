/**
 * Outputs for Hub-and-Spoke Networking Topology
 */

# Hub VPC outputs
output "hub_vpc_id" {
  description = "Hub VPC ID."
  value       = module.hub_vpc.id
}

output "hub_vpc_self_link" {
  description = "Hub VPC self link."
  value       = module.hub_vpc.self_link
}

output "hub_vpc_name" {
  description = "Hub VPC name."
  value       = module.hub_vpc.name
}

output "hub_subnets" {
  description = "Hub VPC subnets."
  value       = module.hub_vpc.subnets
}

# Dev Spoke VPC outputs
output "dev_vpc_id" {
  description = "Dev spoke VPC ID."
  value       = module.dev_vpc.id
}

output "dev_vpc_self_link" {
  description = "Dev spoke VPC self link."
  value       = module.dev_vpc.self_link
}

output "dev_vpc_name" {
  description = "Dev spoke VPC name."
  value       = module.dev_vpc.name
}

output "dev_subnets" {
  description = "Dev spoke VPC subnets."
  value       = module.dev_vpc.subnets
}

# Prod Spoke VPC outputs
output "prod_vpc_id" {
  description = "Prod spoke VPC ID."
  value       = module.prod_vpc.id
}

output "prod_vpc_self_link" {
  description = "Prod spoke VPC self link."
  value       = module.prod_vpc.self_link
}

output "prod_vpc_name" {
  description = "Prod spoke VPC name."
  value       = module.prod_vpc.name
}

output "prod_subnets" {
  description = "Prod spoke VPC subnets."
  value       = module.prod_vpc.subnets
}

# Peering outputs
output "peering_hub_dev" {
  description = "Hub-to-Dev peering details."
  value = {
    local_network = module.peering_hub_dev.local_network_peering
    peer_network  = module.peering_hub_dev.peer_network_peering
  }
}

output "peering_hub_prod" {
  description = "Hub-to-Prod peering details."
  value = {
    local_network = module.peering_hub_prod.local_network_peering
    peer_network  = module.peering_hub_prod.peer_network_peering
  }
}

# Firewall policy output
output "firewall_policy_id" {
  description = "Hierarchical firewall policy ID."
  value       = module.hierarchical_firewall_policy.id
}
