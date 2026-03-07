# Project Factory - creates 50+ projects from YAML definitions
# Uses three-tier precedence: data_defaults → YAML → data_overrides

module "project-factory" {
  source = "./modules/project-factory"

  # Root path for all factory YAML data files
  factories_config = {
    basepath = "data/projects"
  }

  # Lowest precedence — sensible org-wide defaults.
  # Individual YAML files can override any of these values.
  data_defaults = {
    billing_account = "012345-ABCDEF-012345"
    parent          = "folders/1234567890"
    prefix          = "myco-dev"

    # Baseline APIs enabled on every project
    services = [
      "compute.googleapis.com",
      "iam.googleapis.com",
      "logging.googleapis.com",
      "monitoring.googleapis.com",
      "cloudresourcemanager.googleapis.com",
      "serviceusage.googleapis.com",
    ]

    # Default labels applied unless overridden in YAML
    labels = {
      environment = "dev"
      cost-center = "shared"
    }

    # Default shared VPC settings (projects attach to host by default)
    shared_vpc_service_config = {
      host_project = "myco-dev-shared-vpc-0"
    }
  }

  # Additively combined with YAML values — never overrides.
  # Use for labels, services, and org policies that MUST always be present.
  data_merges = {
    # These labels are added to every project regardless of YAML content
    labels = {
      managed-by = "project-factory"
      terraform  = "true"
    }

    # These services are always enabled, even if YAML defines its own list
    services = [
      "logging.googleapis.com",
      "monitoring.googleapis.com",
    ]

    # Org policies enforced on every project via additive merge
    org_policies = {
      # Restrict VM external IPs — merged into every project
      "compute.vmExternalIpAccess" = {
        rules = [
          {
            deny = { all = true }
          }
        ]
      }

      # Enforce uniform bucket-level access
      "storage.uniformBucketLevelAccess" = {
        rules = [
          {
            enforce = true
          }
        ]
      }

      # Restrict resource locations to allowed regions
      "gcp.resourceLocations" = {
        rules = [
          {
            allow = {
              values = [
                "in:us-locations",
                "in:eu-locations",
              ]
            }
          }
        ]
      }

      # Disable default service account creation
      "iam.automaticIamGrantsForDefaultServiceAccounts" = {
        rules = [
          {
            enforce = true
          }
        ]
      }

      # Disable service account key creation
      "iam.disableServiceAccountKeyCreation" = {
        rules = [
          {
            enforce = true
          }
        ]
      }
    }
  }

  # Highest precedence — overrides YAML values. Use sparingly.
  # Only for values that must NEVER be changed by individual projects.
  data_overrides = {
    # Force all projects into the same billing account (cannot be overridden)
    billing_account = "012345-ABCDEF-012345"
  }
}
