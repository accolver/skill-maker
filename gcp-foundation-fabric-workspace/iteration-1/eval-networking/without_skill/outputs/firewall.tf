/**
 * Hierarchical Firewall Policy
 * Allows IAP SSH access (TCP 22) from Google's IAP CIDR range.
 * Applied at the organization level.
 */

module "hierarchical_firewall_policy" {
  source    = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/net-firewall-policy?ref=v34.1.0"
  name      = "${var.prefix}-iap-ssh-policy"
  parent_id = var.organization_id

  rules = {
    allow-iap-ssh = {
      description = "Allow SSH access from IAP"
      direction   = "INGRESS"
      action      = "allow"
      priority    = 1000
      match = {
        layer4_configs = [
          {
            protocol = "tcp"
            ports    = ["22"]
          }
        ]
        src_ip_ranges = [var.iap_cidr_range]
      }
      target_resources = null
    }
  }

  attachments = {
    org = {
      target = "organizations/${var.organization_id}"
    }
  }
}
