# Adding Org Policies via the CFF Project Factory

There are **three ways** to apply organization policies through the project
factory:

---

## Method 1: Inline `org_policies` in Project YAML

Define org policies directly in any project YAML file under the `org_policies`
key. These apply only to that specific project.

```yaml
# file: data/projects/prod-data-analytics-0.yaml
org_policies:
  compute.requireOsLogin:
    rules:
      - enforce: true
  compute.vmExternalIpAccess:
    rules:
      - deny:
          all: true
```

## Method 2: Lower-Level Factory via `factories_config.org_policies`

Create a directory of YAML files (one per service/domain), then reference it
from a project or folder YAML using `factories_config.org_policies`.

### Step 1: Create org policy YAML files

```yaml
# file: data/factories/org-policies/compute.yaml
compute.disableSerialPortAccess:
  rules:
    - enforce: true
compute.requireShieldedVm:
  rules:
    - enforce: true
compute.vmExternalIpAccess:
  rules:
    - deny:
        all: true
```

```yaml
# file: data/factories/org-policies/iam.yaml
iam.disableServiceAccountKeyCreation:
  rules:
    - enforce: true
iam.disableServiceAccountKeyUpload:
  rules:
    - enforce: true
```

```yaml
# file: data/factories/org-policies/storage.yaml
storage.uniformBucketLevelAccess:
  rules:
    - enforce: true
storage.publicAccessPrevention:
  rules:
    - enforce: true
```

### Step 2: Reference from project or folder YAML

```yaml
# file: data/projects/my-project.yaml  (or data/folders/team-a/.config.yaml)
factories_config:
  org_policies: factories/org-policies
```

This loads ALL policy files from the referenced directory and applies them.

## Method 3: Combine Both Approaches

You can use both inline `org_policies` and `factories_config.org_policies` in
the same YAML file. The inline policies and factory-loaded policies are merged.

```yaml
# file: data/projects/prod-secure-app.yaml
billing_account: 012345-67890A-BCDEF0
parent: $folder_ids:production

# Load shared baseline policies from factory
factories_config:
  org_policies: factories/org-policies

# Add project-specific policies inline (merged with factory policies)
org_policies:
  gcp.restrictCmekCryptoKeyProjects:
    rules:
      - allow:
          values:
            - under:folders/1234567890
```

## Org Policy Rule Syntax

The YAML schema for org policies mirrors the Terraform resource:

```yaml
constraint.name:
  rules:
    - enforce: true # Boolean constraint (true/false)

    - allow:
        all: true # Allow all values
    - allow:
        values: # Allow specific values
          - "value1"
          - "value2"

    - deny:
        all: true # Deny all values
    - deny:
        values: # Deny specific values
          - "value1"

    - condition: # Conditional rules
        expression: "resource.matchTag('env', 'dev')"
        title: "Dev only"
      allow:
        all: true
```
