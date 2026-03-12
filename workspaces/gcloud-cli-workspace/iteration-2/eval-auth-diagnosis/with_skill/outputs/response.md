# Diagnosing and Fixing gcloud Authentication / Wrong-Account Error

## The Problem

You're seeing:

```
ERROR: (gcloud.compute.instances.list) Your current active account
[ci-bot@old-project.iam.gserviceaccount.com] does not have any valid credentials.
Please run: gcloud auth login to obtain new credentials.
```

This tells us two things immediately:

1. **Wrong account** -- the active account is
   `ci-bot@old-project.iam.gserviceaccount.com`, a service account from a
   different project (`old-project`). You need to be authenticated as
   `alice@company.com`.
2. **Expired/invalid credentials** -- even if this were the right account, its
   stored credentials are no longer valid.

We also need to confirm the active project is `payments-prod`, since running
commands against the wrong project is the #1 cause of gcloud disasters.

---

## Step 1: Verify Current Context (Read-Only -- Safe to Run Immediately)

Per the skill workflow, before doing anything else, inspect the current auth and
project state. These are all read-only commands and can be run immediately
without confirmation.

### 1a. List all authenticated accounts

```bash
gcloud auth list
```

**What to look for:** This shows every account that has been authenticated on
this machine, and marks the active one with `*`. You'll likely see output like:

```
           Credentialed Accounts
ACTIVE  ACCOUNT
*       ci-bot@old-project.iam.gserviceaccount.com
        alice@company.com
```

If `alice@company.com` already appears in the list (just not active), the fix is
simpler -- we just switch. If she's not listed at all, we need to authenticate
from scratch.

### 1b. Check the active account explicitly

```bash
gcloud config get-value account
```

**Expected output:** `ci-bot@old-project.iam.gserviceaccount.com` (confirming
the error message).

### 1c. Check the active project

```bash
gcloud config get-value project
```

**What to look for:** This should return `payments-prod`. If it returns
something else (like `old-project`), that's another thing we need to fix.
Running commands against the wrong project can cause real damage.

### 1d. Check for any active configuration overrides

```bash
gcloud config configurations list
```

**What to look for:** gcloud supports named configurations. It's possible a CI
configuration is active that sets both the account and project to wrong values.
Output looks like:

```
NAME     IS_ACTIVE  ACCOUNT                                          PROJECT
default  True       ci-bot@old-project.iam.gserviceaccount.com       old-project
my-dev   False      alice@company.com                                payments-prod
```

If there's already a named configuration for your user/project, we can just
activate it.

---

## Step 2: Diagnose the Root Cause

Based on the Step 1 output, one of these scenarios applies:

### Scenario A: alice@company.com is already authenticated but not active

If `gcloud auth list` shows `alice@company.com` in the list, we just need to
switch the active account and set the correct project.

### Scenario B: alice@company.com is not authenticated at all

If `gcloud auth list` does NOT show `alice@company.com`, we need to do a fresh
login.

### Scenario C: A named configuration exists for the right setup

If `gcloud config configurations list` shows a configuration with
`alice@company.com` and `payments-prod`, we just activate it.

### Scenario D: The environment variable `CLOUDSDK_ACTIVE_CONFIG_NAME` or `GCLOUD_PROJECT` is overriding

If something external (a shell profile, CI pipeline env var) is setting the
active config or project, that could be overriding your local config. Check
with:

```bash
env | grep -i gcloud
env | grep -i cloudsdk
env | grep -i GOOGLE_APPLICATION_CREDENTIALS
```

If `GOOGLE_APPLICATION_CREDENTIALS` is set to a service account key file for
`ci-bot@old-project.iam.gserviceaccount.com`, that's the root cause.

---

## Step 3: Apply the Fix

### Fix for Scenario A (alice is listed, just not active)

These are **mutating configuration commands** -- they change your local gcloud
state.

**I would set the active account to alice@company.com:**

```bash
gcloud config set account alice@company.com
```

**Then confirm the project is correct:**

```bash
gcloud config set project payments-prod
```

### Fix for Scenario B (alice is not authenticated)

**I would run the interactive login flow:**

```bash
gcloud auth login alice@company.com
```

This opens a browser for OAuth. After completing the flow, gcloud stores the
credentials and sets `alice@company.com` as the active account.

**Then set the project:**

```bash
gcloud config set project payments-prod
```

If you also use Google Cloud client libraries locally (e.g., Python/Node SDKs),
you should additionally run:

```bash
gcloud auth application-default login
```

This sets Application Default Credentials (ADC) so client libraries also
authenticate as your user.

### Fix for Scenario C (named configuration exists)

**Activate the existing configuration:**

```bash
gcloud config configurations activate my-dev
```

(Replace `my-dev` with whatever the configuration name is.)

### Fix for Scenario D (environment variable override)

If `GOOGLE_APPLICATION_CREDENTIALS` is set to the old service account key, unset
it:

```bash
unset GOOGLE_APPLICATION_CREDENTIALS
```

If `CLOUDSDK_ACTIVE_CONFIG_NAME` is forcing a CI config:

```bash
unset CLOUDSDK_ACTIVE_CONFIG_NAME
```

Then proceed with Scenario A or B above.

For a permanent fix, remove or update these variables from your shell profile
(`.bashrc`, `.zshrc`, etc.) or CI pipeline configuration.

---

## Step 4: Verify the Fix (Read-Only -- Safe to Run Immediately)

After applying any of the fixes above, verify that everything is correct:

### 4a. Confirm active account

```bash
gcloud auth list
```

**Expected:** `alice@company.com` should now be marked with `*`.

### 4b. Confirm active project

```bash
gcloud config get-value project
```

**Expected output:** `payments-prod`

### 4c. Test the original command that failed

```bash
gcloud compute instances list --format="table(name,zone,machineType.basename(),status,networkInterfaces[0].accessConfigs[0].natIP)"
```

This is the read-only `list` command -- safe to run immediately. It should now
succeed and display your VMs in `payments-prod`.

### 4d. Verify IAM permissions (if the list command returns empty or errors with permission denied)

If after fixing auth you get a permissions error instead of a credentials error,
the account may not have the right role on `payments-prod`:

```bash
gcloud projects get-iam-policy payments-prod \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:alice@company.com" \
  --format="table(bindings.role)"
```

**What to look for:** You need at least `roles/compute.viewer` to list
instances. If no roles are shown, you'll need a project admin to grant access.

---

## Step 5: Prevent This From Happening Again

### Option A: Create a named configuration for payments-prod work

```bash
gcloud config configurations create payments-prod-config
gcloud config set account alice@company.com
gcloud config set project payments-prod
gcloud config set compute/region us-central1   # set your default region
gcloud config set compute/zone us-central1-a   # set your default zone
```

Then switch between contexts cleanly:

```bash
gcloud config configurations activate payments-prod-config   # for prod work
gcloud config configurations activate default                 # for other work
```

### Option B: Always use explicit `--project` flags

For critical projects, bypass the default config entirely:

```bash
gcloud compute instances list --project=payments-prod
```

This ensures you always hit the right project regardless of what gcloud's active
config says.

---

## Complete Command Sequence Summary

Here's the full sequence of commands I would run, in order:

```bash
# --- STEP 1: Diagnose (all read-only, run immediately) ---
gcloud auth list
gcloud config get-value account
gcloud config get-value project
gcloud config configurations list

# Check for environment overrides
env | grep -i gcloud
env | grep -i cloudsdk
env | grep -i GOOGLE_APPLICATION_CREDENTIALS

# --- STEP 2: Fix (based on diagnosis) ---
# If alice@company.com is already listed:
gcloud config set account alice@company.com

# If alice@company.com is NOT listed:
gcloud auth login alice@company.com

# Ensure project is correct:
gcloud config set project payments-prod

# If environment variables are overriding:
unset GOOGLE_APPLICATION_CREDENTIALS    # if set to old SA key
unset CLOUDSDK_ACTIVE_CONFIG_NAME       # if forcing wrong config

# --- STEP 3: Verify (all read-only, run immediately) ---
gcloud auth list                          # confirm alice@company.com is active
gcloud config get-value project           # confirm payments-prod
gcloud compute instances list \
  --format="table(name,zone,machineType.basename(),status,networkInterfaces[0].accessConfigs[0].natIP)"

# --- STEP 4: Optional - check permissions if still failing ---
gcloud projects get-iam-policy payments-prod \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:alice@company.com" \
  --format="table(bindings.role)"

# --- STEP 5: Prevent recurrence ---
gcloud config configurations create payments-prod-config
gcloud config set account alice@company.com
gcloud config set project payments-prod
```

---

## Key Skill Principles Applied

| Principle                         | How Applied                                                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Verify context first**          | Checked `auth list`, `config get-value project`, and `config get-value account` before anything else                                                   |
| **Classify operations**           | All diagnostic commands are read-only (run immediately). Config-changing commands (`config set`, `auth login`) are called out as modifying local state |
| **Read freely, write cautiously** | All verification steps run without asking. Auth/config changes are explained before execution                                                          |
| **Discover, don't guess**         | Checked for named configurations, environment variable overrides, and multiple possible root causes rather than jumping to `gcloud auth login`         |
| **Verify after mutation**         | After fixing auth, re-ran `auth list`, `config get-value project`, and the original failing command to confirm the fix                                 |
