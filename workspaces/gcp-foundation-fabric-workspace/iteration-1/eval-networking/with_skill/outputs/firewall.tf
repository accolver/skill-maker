/**
 * Copyright 2024 Google LLC
 *
 * Hierarchical firewall policy using CFF `net-firewall-policy` module.
 * Applied at the organization level to allow IAP SSH access (35.235.240.0/20)
 * across all VPCs in the organization.
 */

module "firewall-policy-iap" {
  source    = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-firewall-policy?ref=v34.1.0"
  name      = "iap-ssh-policy"
  parent_id = "organizations/${var.organization_id}"
  attachments = {
    org = "organizations/${var.organization_id}"
  }
  ingress_rules = {
    allow-iap-ssh = {
      priority    = 1000
      description = "Allow SSH access from IAP ranges."
      action      = "allow"
      direction   = "INGRESS"
      match = {
        src_ip_ranges  = ["35.235.240.0/20"]
        layer4_configs = [{ protocol = "tcp", ports = ["22"] }]
      }
    }
  }
}
