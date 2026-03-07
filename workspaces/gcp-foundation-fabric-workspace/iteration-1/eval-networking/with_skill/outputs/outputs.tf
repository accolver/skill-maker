/**
 * Copyright 2024 Google LLC
 *
 * Outputs for hub-and-spoke networking topology.
 */

# -----------------------------------------------------------------------------
# Project outputs
# -----------------------------------------------------------------------------

output "project_ids" {
  description = "Project IDs for hub and spoke projects."
  value = {
    hub        = module.project-hub.project_id
    spoke-dev  = module.project-spoke-dev.project_id
    spoke-prod = module.project-spoke-prod.project_id
  }
}

# -----------------------------------------------------------------------------
# VPC outputs
# -----------------------------------------------------------------------------

output "vpc_self_links" {
  description = "Self links for all VPCs."
  value = {
    hub        = module.vpc-hub.self_link
    spoke-dev  = module.vpc-spoke-dev.self_link
    spoke-prod = module.vpc-spoke-prod.self_link
  }
}

output "subnet_self_links" {
  description = "Subnet self links grouped by VPC."
  value = {
    hub        = module.vpc-hub.subnet_self_links
    spoke-dev  = module.vpc-spoke-dev.subnet_self_links
    spoke-prod = module.vpc-spoke-prod.subnet_self_links
  }
}

# -----------------------------------------------------------------------------
# Peering outputs
# -----------------------------------------------------------------------------

output "peering_ids" {
  description = "VPC peering resource IDs."
  value = {
    hub-to-spoke-dev  = module.peering-hub-to-spoke-dev.local_network_peering
    hub-to-spoke-prod = module.peering-hub-to-spoke-prod.local_network_peering
  }
}

# -----------------------------------------------------------------------------
# Cloud NAT outputs
# -----------------------------------------------------------------------------

output "nat_router_names" {
  description = "Cloud Router names used by Cloud NAT."
  value = {
    ew1  = module.nat-hub-ew1.name
    uc1  = module.nat-hub-uc1.name
    ase1 = module.nat-hub-ase1.name
  }
}

# -----------------------------------------------------------------------------
# Firewall policy outputs
# -----------------------------------------------------------------------------

output "firewall_policy_id" {
  description = "Hierarchical firewall policy ID."
  value       = module.firewall-policy-iap.id
}
