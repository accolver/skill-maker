/**
 * Copyright 2024 Google LLC
 *
 * Networking projects — one for hub, one each for dev/prod spokes.
 * Uses CFF `project` module with prefix-based naming.
 */

module "project-hub" {
  source          = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/project?ref=v34.1.0"
  billing_account = var.billing_account
  name            = "net-hub-0"
  parent          = var.parent
  prefix          = var.prefix
  labels          = var.labels
  services = [
    "compute.googleapis.com",
    "dns.googleapis.com",
    "iap.googleapis.com",
    "networkmanagement.googleapis.com",
    "stackdriver.googleapis.com",
  ]
}

module "project-spoke-dev" {
  source          = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/project?ref=v34.1.0"
  billing_account = var.billing_account
  name            = "net-spoke-dev-0"
  parent          = var.parent
  prefix          = var.prefix
  labels          = merge(var.labels, { environment = "dev" })
  services = [
    "compute.googleapis.com",
    "dns.googleapis.com",
    "stackdriver.googleapis.com",
  ]
}

module "project-spoke-prod" {
  source          = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/project?ref=v34.1.0"
  billing_account = var.billing_account
  name            = "net-spoke-prod-0"
  parent          = var.parent
  prefix          = var.prefix
  labels          = merge(var.labels, { environment = "prod" })
  services = [
    "compute.googleapis.com",
    "dns.googleapis.com",
    "stackdriver.googleapis.com",
  ]
}
