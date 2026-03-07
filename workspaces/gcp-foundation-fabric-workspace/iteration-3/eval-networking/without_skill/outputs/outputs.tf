/**
 * Outputs
 *
 * Expose key resource attributes for downstream consumption — e.g. by
 * workload Terraform configs that need to place VMs into the correct
 * subnets or reference VPC self-links.
 */

# ---------- Hub VPC ----------

output "hub_vpc_self_link" {
  description = "Self-link of the hub VPC."
  value       = module.hub_vpc.self_link
}

output "hub_vpc_name" {
  description = "Name of the hub VPC."
  value       = module.hub_vpc.name
}

output "hub_vpc_subnets" {
  description = "Map of hub VPC subnet names to their self-links."
  value       = module.hub_vpc.subnet_self_links
}

output "hub_vpc_subnet_ips" {
  description = "Map of hub VPC subnet names to their primary IP CIDR ranges."
  value       = module.hub_vpc.subnet_ips
}

# ---------- Dev Spoke VPC ----------

output "spoke_dev_vpc_self_link" {
  description = "Self-link of the dev spoke VPC."
  value       = module.spoke_dev_vpc.self_link
}

output "spoke_dev_vpc_name" {
  description = "Name of the dev spoke VPC."
  value       = module.spoke_dev_vpc.name
}

output "spoke_dev_vpc_subnets" {
  description = "Map of dev spoke VPC subnet names to their self-links."
  value       = module.spoke_dev_vpc.subnet_self_links
}

# ---------- Prod Spoke VPC ----------

output "spoke_prod_vpc_self_link" {
  description = "Self-link of the prod spoke VPC."
  value       = module.spoke_prod_vpc.self_link
}

output "spoke_prod_vpc_name" {
  description = "Name of the prod spoke VPC."
  value       = module.spoke_prod_vpc.name
}

output "spoke_prod_vpc_subnets" {
  description = "Map of prod spoke VPC subnet names to their self-links."
  value       = module.spoke_prod_vpc.subnet_self_links
}

# ---------- Peering ----------

output "peering_hub_dev_state" {
  description = "State of the hub-to-dev VPC peering."
  value       = module.peering_hub_dev.local_network_peering
}

output "peering_hub_prod_state" {
  description = "State of the hub-to-prod VPC peering."
  value       = module.peering_hub_prod.local_network_peering
}

# ---------- Cloud NAT ----------

output "cloud_nat_ips" {
  description = "Map of region to Cloud NAT external IP addresses."
  value = {
    for region, nat in module.hub_cloud_router : region => nat.name
  }
}

# ---------- Hierarchical Firewall ----------

output "hierarchical_firewall_policy_id" {
  description = "ID of the organization-level hierarchical firewall policy."
  value       = module.hierarchical_firewall_policy.id
}
