# Diagnosing and Fixing gcloud Authentication Issue

## Problem Summary

You're seeing:

```
ERROR: (gcloud.compute.instances.list) Your current active account [ci-bot@old-project.iam.gserviceaccount.com] does not have any valid credentials.
```

This tells us two things:

1. **Wrong account**: You're authenticated as
   `ci-bot@old-project.iam.gserviceaccount.com` (a service account), but you
   want to use `alice@company.com`.
2. **Invalid credentials**: Even the service account's credentials have expired
   or been revoked.

You also want to target the `payments-prod` project, but may not have that
configured.

---

## Step 1: Diagnose — Check Current State

### 1a. List all authenticated accounts

```bash
gcloud auth list
```

**What this shows:** All accounts that have been authenticated on this machine,
and which one is currently active (marked with `*`). You'll likely see
`ci-bot@old-project.iam.gserviceaccount.com` marked as active.

### 1b. Check the current project and configuration

```bash
gcloud config list
```

**What this shows:** The active configuration including `account`, `project`,
and other defaults. This will confirm whether `payments-prod` is set as the
project or if it's pointing to `old-project`.

### 1c. Check which configurations exist

```bash
gcloud config configurations list
```

**What this shows:** All named configurations. You may have multiple configs
(e.g., one for CI, one for personal use). This helps you understand if there's
already a configuration set up for your personal account.

---

## Step 2: Fix — Authenticate as the Correct Account

### 2a. Log in as alice@company.com

```bash
gcloud auth login alice@company.com
```

**What this does:** Opens a browser-based OAuth flow to authenticate as
`alice@company.com`. After completing the flow, this account will be added to
the list of authenticated accounts and set as the active account.

If you're in a headless/SSH environment where a browser isn't available, use:

```bash
gcloud auth login alice@company.com --no-launch-browser
```

This prints a URL you can open on another machine, then paste the authorization
code back into the terminal.

### 2b. Set the active project to payments-prod

```bash
gcloud config set project payments-prod
```

**What this does:** Sets the default project for all subsequent `gcloud`
commands to `payments-prod`.

### 2c. (Optional) Also set application default credentials

```bash
gcloud auth application-default login
```

**What this does:** Sets up Application Default Credentials (ADC) for client
libraries. This is separate from the CLI credentials and is needed if you're
also running code locally that uses Google Cloud client libraries (e.g., Python,
Go, Node.js SDKs). If you're only using the `gcloud` CLI, you can skip this.

---

## Step 3: Verify — Confirm Everything Works

### 3a. Confirm the active account

```bash
gcloud auth list
```

**Expected output:** `alice@company.com` should now be marked with `*` as the
active account.

### 3b. Confirm the active project

```bash
gcloud config get-value project
```

**Expected output:** `payments-prod`

### 3c. Re-run the original failing command

```bash
gcloud compute instances list
```

**Expected output:** A table listing all Compute Engine VMs in the
`payments-prod` project (or an empty table if there are no VMs).

---

## Step 4: (Optional) Clean Up the Old Service Account

If you no longer need `ci-bot@old-project.iam.gserviceaccount.com` authenticated
on this machine, you can revoke its credentials:

```bash
gcloud auth revoke ci-bot@old-project.iam.gserviceaccount.com
```

**What this does:** Removes the stored credentials for that service account from
your local machine. This doesn't delete the service account itself — it just
removes it from your local `gcloud` auth list.

---

## Step 5: (Optional) Set Up a Named Configuration for Future Use

To avoid this problem in the future, create a named configuration for your
personal work on `payments-prod`:

```bash
gcloud config configurations create payments-prod-config
gcloud config set account alice@company.com
gcloud config set project payments-prod
gcloud config set compute/region us-central1   # adjust to your region
gcloud config set compute/zone us-central1-a   # adjust to your zone
```

Then you can switch between configurations easily:

```bash
# Switch to your payments-prod config
gcloud config configurations activate payments-prod-config

# Switch back to another config (e.g., for CI work)
gcloud config configurations activate default
```

---

## Troubleshooting

### If `gcloud auth login` succeeds but `compute instances list` still fails

This means `alice@company.com` may not have the required IAM permissions on the
`payments-prod` project. You need at least `compute.instances.list` permission,
typically granted via the `roles/compute.viewer` role or higher. Ask your
project admin to verify:

```bash
gcloud projects get-iam-policy payments-prod --flatten="bindings[].members" --filter="bindings.members:alice@company.com"
```

### If you get "project not found"

Verify the exact project ID (not the display name):

```bash
gcloud projects list --filter="name:payments"
```

Project IDs are case-sensitive and may differ from the display name (e.g.,
`payments-prod-123456` vs `payments-prod`).

### If the service account keeps becoming active

Something may be setting the `GOOGLE_APPLICATION_CREDENTIALS` or
`CLOUDSDK_CORE_ACCOUNT` environment variable. Check:

```bash
echo $GOOGLE_APPLICATION_CREDENTIALS
echo $CLOUDSDK_CORE_ACCOUNT
env | grep -i gcloud
env | grep -i google
```

If either is set, unset it:

```bash
unset GOOGLE_APPLICATION_CREDENTIALS
unset CLOUDSDK_CORE_ACCOUNT
```

And check your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) for any lines that
set these variables automatically.

---

## Complete Command Sequence (Quick Reference)

```bash
# 1. Diagnose
gcloud auth list
gcloud config list
gcloud config configurations list

# 2. Fix
gcloud auth login alice@company.com
gcloud config set project payments-prod

# 3. Verify
gcloud auth list
gcloud config get-value project
gcloud compute instances list

# 4. (Optional) Clean up old service account
gcloud auth revoke ci-bot@old-project.iam.gserviceaccount.com

# 5. (Optional) Create named configuration
gcloud config configurations create payments-prod-config
gcloud config set account alice@company.com
gcloud config set project payments-prod
```
