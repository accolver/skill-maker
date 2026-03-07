/**
 * CFF Project Factory Configuration
 *
 * Uses the Cloud Foundation Fabric project-factory module to create
 * 50+ projects from YAML definitions with sensible defaults,
 * per-project overrides, and data_merges for org policies.
 */

module "project-factory" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/project-factory?ref=v34.1.0"

  # ---------------------------------------------------------------------------
  # Factory data path – each .yaml file under data/projects/ becomes a project
  # ---------------------------------------------------------------------------
  factory_data_path = "data/projects"

  # ---------------------------------------------------------------------------
  # data_defaults – applied to EVERY project unless overridden in the YAML
  # ---------------------------------------------------------------------------
  data_defaults = {
    billing_account = var.billing_account
    parent          = var.folder_id

    # Default labels applied to all projects
    labels = {
      environment = "dev"
      managed_by  = "terraform"
      team        = "platform"
    }

    # Default services enabled on every project
    services = [
      "compute.googleapis.com",
      "iam.googleapis.com",
      "logging.googleapis.com",
      "monitoring.googleapis.com",
      "cloudresourcemanager.googleapis.com",
      "serviceusage.googleapis.com",
    ]

    # Shared VPC service project configuration
    shared_vpc_service_config = {
      host_project = var.shared_vpc_host_project
    }

    # Default IAM bindings
    iam = {
      "roles/viewer" = [
        "group:security-reviewers@example.com",
      ]
    }

    # Default org policy overrides (boolean policies)
    org_policies = {
      "compute.disableSerialPortAccess" = {
        rules = [{ enforce = true }]
      }
      "compute.requireShieldedVm" = {
        rules = [{ enforce = true }]
      }
      "iam.disableServiceAccountKeyCreation" = {
        rules = [{ enforce = true }]
      }
    }
  }

  # ---------------------------------------------------------------------------
  # data_overrides – force these values regardless of YAML definitions
  # ---------------------------------------------------------------------------
  data_overrides = {
    # Always attach to the specified billing account (cannot be overridden)
    billing_account = var.billing_account

    # Force the parent folder (projects cannot escape the hierarchy)
    parent = var.folder_id
  }

  # ---------------------------------------------------------------------------
  # data_merges – merged INTO each project's YAML definition (additive)
  # Used here to enforce org policies across all projects while still
  # allowing individual projects to add their own.
  # ---------------------------------------------------------------------------
  data_merges = {
    # Labels that are always added (merged with per-project labels)
    labels = {
      cost_center = var.cost_center
      org         = "myorg"
    }

    # Services always enabled in addition to per-project services
    services = [
      "cloudasset.googleapis.com",
      "accesscontextmanager.googleapis.com",
    ]

    # Org policies merged into every project
    org_policies = {
      # Restrict VM external IPs – enforced everywhere
      "compute.vmExternalIpAccess" = {
        rules = [{ deny = { all = true } }]
      }
      # Restrict resource locations to allowed regions
      "gcp.resourceLocations" = {
        rules = [{
          allow = {
            values = [
              "in:us-locations",
              "in:eu-locations",
            ]
          }
        }]
      }
      # Uniform bucket-level access
      "storage.uniformBucketLevelAccess" = {
        rules = [{ enforce = true }]
      }
      # Disable default network creation
      "compute.skipDefaultNetworkCreation" = {
        rules = [{ enforce = true }]
      }
    }

    # IAM bindings merged into every project
    iam = {
      "roles/browser" = [
        "group:org-admins@example.com",
      ]
    }
  }
}
