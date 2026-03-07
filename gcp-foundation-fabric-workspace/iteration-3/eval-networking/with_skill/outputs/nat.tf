/**
 * Copyright 2024 Google LLC
 *
 * Cloud NAT — provides outbound internet access for hub VPC instances
 * without external IP addresses. Deployed in each hub region.
 */

module "hub-nat-eu" {
  source         = "./modules/net-cloudnat"
  project_id     = var.project_id
  region         = "europe-west1"
  name           = "${var.prefix}-hub-nat-eu"
  router_network = module.hub-vpc.self_link
}

module "hub-nat-us" {
  source         = "./modules/net-cloudnat"
  project_id     = var.project_id
  region         = "us-central1"
  name           = "${var.prefix}-hub-nat-us"
  router_network = module.hub-vpc.self_link
}

module "hub-nat-asia" {
  source         = "./modules/net-cloudnat"
  project_id     = var.project_id
  region         = "asia-southeast1"
  name           = "${var.prefix}-hub-nat-asia"
  router_network = module.hub-vpc.self_link
}
