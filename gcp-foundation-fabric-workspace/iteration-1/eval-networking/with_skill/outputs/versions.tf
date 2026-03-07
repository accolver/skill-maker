/**
 * Copyright 2024 Google LLC
 *
 * Provider and Terraform version constraints.
 */

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.30.0, < 7.0.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = ">= 5.30.0, < 7.0.0"
    }
  }
}
