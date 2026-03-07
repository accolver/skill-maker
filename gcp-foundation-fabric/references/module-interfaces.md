# Module Interface Patterns

CFF modules share standardized interfaces. Learn these once, apply everywhere.

## IAM Interface

Available in every module that manages a GCP resource with IAM support.

### Role-based (authoritative per role)

```hcl
iam = {
  "roles/viewer" = [
    "group:viewers@example.com",
    "user:admin@example.com"
  ]
  "roles/editor" = [
    "serviceAccount:sa@project.iam.gserviceaccount.com"
  ]
}
```

### Group-based (authoritative per group, less verbose)

```hcl
group_iam = {
  "group:platform@example.com" = [
    "roles/editor",
    "roles/iam.serviceAccountUser"
  ]
}
```

### Additive (non-authoritative, adds without removing)

```hcl
iam_additive = {
  "roles/viewer" = ["user:external@partner.com"]
}
```

### Additive by member

```hcl
iam_additive_members = {
  "user:external@partner.com" = ["roles/viewer", "roles/browser"]
}
```

## Naming Interface

```hcl
variable "prefix" {
  description = "Optional prefix used for resource names."
  type        = string
  default     = null
  validation {
    condition     = var.prefix != ""
    error_message = "Prefix cannot be empty, please use null instead."
  }
}

# In locals:
locals {
  prefix = var.prefix == null ? "" : "${var.prefix}-"
}
```

Usage: `prefix = "myco-gcp-prod"` → resource names become `myco-gcp-prod-<name>`

## Labels Interface

```hcl
variable "labels" {
  description = "Resource labels."
  type        = map(string)
  default     = {}
}
```

## Services Interface (project module)

```hcl
services = [
  "compute.googleapis.com",
  "container.googleapis.com",
  "logging.googleapis.com",
]
```

## Service Encryption Keys (CMEK)

```hcl
service_encryption_key_ids = {
  "compute.googleapis.com" = [var.kms_keys.compute]
  "storage.googleapis.com" = [var.kms_keys.gcs]
}
```

## Logging Sinks

```hcl
logging_sinks = {
  audit-logs = {
    destination = module.log-bucket.id
    filter      = "logName:\"/logs/cloudaudit.googleapis.com\""
    type        = "logging"
  }
}
```

## Organization Policies

```hcl
org_policies = {
  "compute.disableSerialPortAccess" = {
    rules = [{ enforce = true }]
  }
  "iam.allowedPolicyMemberDomains" = {
    rules = [{
      allow = { values = ["C0xxxxxxx"] }
    }]
  }
}
```

## Tags

```hcl
tags = {
  environment = {
    description = "Environment tag."
    values = {
      dev  = {}
      prod = { iam = { "roles/resourcemanager.tagUser" = ["group:prod@example.com"] } }
    }
  }
}
```

## Variable Design Patterns

### Object variables with optional attributes

CFF uses `optional()` in variable type definitions to allow partial
specification:

```hcl
variable "shared_vpc_service_config" {
  type = object({
    attach               = optional(bool, false)
    host_project         = optional(string)
    service_identity_iam = optional(map(list(string)), {})
  })
  default = null
}
```

### Defaults pattern

For repeated resources, CFF uses a defaults variable:

```hcl
variable "attached_disk_defaults" {
  type = object({
    auto_delete  = optional(bool, false)
    mode         = optional(string, "READ_WRITE")
    replica_zone = optional(string)
    type         = optional(string, "pd-balanced")
  })
  default = {}
}
```

Individual items can then set `options = null` to use the defaults.
