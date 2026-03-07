# =============================================================================
# Cloud Foundation Fabric - Project Factory Configuration
# =============================================================================
# This configuration uses the CFF project-factory module to create 50+ projects
# from YAML definitions with appropriate defaults, merges, and overrides.
# =============================================================================

locals {
  billing_account = var.billing_account_id
}

module "project-factory" {
  source = "./fabric/modules/project-factory"

  # ---------------------------------------------------------------------------
  # Context: external resource references used in YAML interpolation
  # ---------------------------------------------------------------------------
  context = {
    folder_ids = {
      default    = var.default_folder_id
      shared     = var.shared_folder_id
      teams      = var.teams_folder_id
      production = var.production_folder_id
      staging    = var.staging_folder_id
    }
    iam_principals = {
      gcp-admins    = "group:gcp-admins@${var.org_domain}"
      gcp-devops    = "group:gcp-devops@${var.org_domain}"
      gcp-viewers   = "group:gcp-viewers@${var.org_domain}"
      gcp-data-team = "group:gcp-data-team@${var.org_domain}"
    }
    project_ids = {
      vpc-host-prod    = var.vpc_host_prod_project_id
      vpc-host-staging = var.vpc_host_staging_project_id
    }
    tag_values = {
      "environment/production" = var.tag_value_prod
      "environment/staging"    = var.tag_value_staging
    }
    vpc_host_projects = {
      prod-spoke-0    = var.vpc_host_prod_project_id
      staging-spoke-0 = var.vpc_host_staging_project_id
    }
  }

  # ---------------------------------------------------------------------------
  # data_defaults: fallback values when YAML files omit an attribute
  # ---------------------------------------------------------------------------
  data_defaults = {
    billing_account = local.billing_account
    parent          = "folders/${var.default_folder_id}"
    prefix          = var.project_prefix
    labels = {
      managed_by = "terraform"
    }
    locations = {
      bigquery = "EU"
      logging  = "global"
      storage  = "EU"
    }
    services = [
      "stackdriver.googleapis.com",
      "logging.googleapis.com",
      "monitoring.googleapis.com",
    ]
    contacts = {
      "platform-team@${var.org_domain}" = ["ALL"]
    }
  }

  # ---------------------------------------------------------------------------
  # data_merges: values merged (additive) with YAML file data
  # ---------------------------------------------------------------------------
  data_merges = {
    labels = {
      organization = var.org_name
      cost_center  = var.default_cost_center
    }
    services = [
      "cloudresourcemanager.googleapis.com",
      "serviceusage.googleapis.com",
      "iam.googleapis.com",
    ]
  }

  # ---------------------------------------------------------------------------
  # data_overrides: values that always override YAML file data
  # ---------------------------------------------------------------------------
  data_overrides = {
    prefix = var.project_prefix
    contacts = {
      "security-team@${var.org_domain}" = ["ALL"]
    }
  }

  # ---------------------------------------------------------------------------
  # factories_config: paths to YAML data files
  # ---------------------------------------------------------------------------
  factories_config = {
    basepath = var.data_path
    budgets = {
      billing_account = local.billing_account
    }
  }
}
