/**
 * Hierarchical Firewall Policy — allows IAP SSH access.
 * Uses CFF net-firewall-policy module at the organization level.
 */

module "firewall-policy-iap" {
  source    = "./modules/net-firewall-policy"
  name      = "iap-ssh-policy"
  parent_id = var.organization_id

  rules_factory_config = null

  ingress_rules = {
    allow-iap-ssh = {
      description = "Allow SSH access from IAP source ranges."
      priority    = 1000
      action      = "allow"

      match = {
        source_ranges      = var.iap_ssh_source_ranges
        destination_ranges = null
        layer4_configs = [
          {
            protocol = "tcp"
            ports    = ["22"]
          }
        ]
      }

      target_resources = [
        module.vpc-hub.self_link,
        module.vpc-spoke-dev.self_link,
        module.vpc-spoke-prod.self_link,
      ]

      enable_logging = true
    }
  }
}
