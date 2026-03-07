/**
 * Copyright 2024 Google LLC
 *
 * Hierarchical Firewall Policy — allows IAP SSH access (TCP/22) from
 * Google's IAP source range (35.235.240.0/20) to all VMs in the org.
 *
 * This policy is attached at the organization level so it applies to
 * the hub and all spoke VPCs uniformly.
 */

module "firewall-policy" {
  source    = "./modules/net-firewall-policy"
  name      = "${var.prefix}-org-firewall-policy"
  parent_id = var.organization_id
  rules = {
    allow-iap-ssh = {
      direction = "INGRESS"
      action    = "allow"
      priority  = 1000
      match = {
        src_ip_ranges  = ["35.235.240.0/20"]
        layer4_configs = [{ protocol = "tcp", ports = ["22"] }]
      }
    }
  }
}
