/**
 * Hierarchical Firewall Policy — IAP SSH Access
 *
 * Creates an organization-level hierarchical firewall policy that allows
 * SSH (TCP/22) from Google's Identity-Aware Proxy (IAP) source range
 * (35.235.240.0/20). This policy is attached to the organization so it
 * applies to all projects and VPCs underneath.
 *
 * Uses the Cloud Foundation Fabric `net-firewall-policy` module.
 */

module "hierarchical_firewall_policy" {
  source    = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-firewall-policy?ref=v34.1.0"
  name      = "${var.prefix}-org-firewall-policy"
  parent_id = "organizations/${var.organization_id}"

  rules_factory_config = {
    egress_rules_file_path  = null
    ingress_rules_file_path = null
  }

  ingress_rules = {
    allow-iap-ssh = {
      description = "Allow SSH access from Google IAP source ranges"
      priority    = 1000
      action      = "allow"

      match = {
        source_ranges = var.iap_ssh_source_ranges
        dest_ranges   = null
        layer4_configs = [
          {
            protocol = "tcp"
            ports    = ["22"]
          }
        ]
      }

      target_resources        = null
      enable_logging          = true
      target_service_accounts = null
    }
  }
}
