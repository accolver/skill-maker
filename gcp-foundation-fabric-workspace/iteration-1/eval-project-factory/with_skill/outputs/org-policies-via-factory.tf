# Organization Policies via Factory
#
# This file demonstrates THREE ways to apply org policies using CFF factories:
#
#   1. Inline in project YAML files (see data/projects/*.yaml — org_policies key)
#   2. Via the project module's factories_config.org_policies directory
#   3. Via the folder or organization module's factories_config.org_policies
#
# Method 1 (inline YAML) is shown in the project YAML files above.
# Methods 2 and 3 are shown below.

# ---------------------------------------------------------------------------
# Method 2: Org policies on individual projects via the project module
# ---------------------------------------------------------------------------
#
# When you need org policies on projects NOT managed by the project-factory
# (e.g., host projects, security projects), use the project module directly
# with factories_config.org_policies pointing to a YAML directory.

module "security-project" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/project?ref=v34.1.0"

  name            = "sec-core-0"
  prefix          = "myco-prod"
  billing_account = "012345-ABCDEF-012345"
  parent          = "folders/1234567890"

  services = [
    "kms.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudkms.googleapis.com",
  ]

  # Inline org policies (for project-specific policies)
  org_policies = {
    "iam.disableServiceAccountKeyCreation" = {
      rules = [{ enforce = true }]
    }
    "compute.disableSerialPortAccess" = {
      rules = [{ enforce = true }]
    }
  }

  # Factory-driven org policies (for policies shared across projects)
  # Each YAML file in this directory defines one org policy constraint.
  factories_config = {
    org_policies = "data/org-policies"
  }
}

# ---------------------------------------------------------------------------
# Method 3: Org policies at the folder level via the folder module
# ---------------------------------------------------------------------------
#
# Apply org policies to an entire folder (inherited by all child projects).
# This is the most scalable approach for policies that apply broadly.

module "prod-folder" {
  source = "github.com/GoogleCloudPlatform/cloud-foundation-fabric//modules/folder?ref=v34.1.0"

  name   = "Production"
  parent = "organizations/1234567890"

  # Inline org policies at folder level
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
    "storage.uniformBucketLevelAccess" = {
      rules = [{ enforce = true }]
    }
  }

  # Factory-driven org policies from YAML directory
  factories_config = {
    org_policies = "data/org-policies"
  }
}
