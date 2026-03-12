# GCP Authentication & Local Development Setup Guide

## Step 1: Verify gcloud Installation

First, confirm that `gcloud` is installed and accessible:

```bash
gcloud version
```

This prints the installed version of the Google Cloud SDK and all its
components. If you see version output (e.g., `Google Cloud SDK 467.0.0`), the
installation is good. If you get "command not found", the SDK isn't on your PATH
and you need to source the completion/path scripts or reinstall.

## Step 2: Check Current Authentication Status

Before authenticating, check if you already have any active credentials:

```bash
gcloud auth list
```

This shows all credentialed accounts. If no accounts are listed, you need to
authenticate. If accounts are listed, the active one is marked with an asterisk
(`*`).

## Step 3: Authenticate Your User Account

Run the primary login command:

```bash
gcloud auth login
```

**What happens:**

- This opens a browser window where you sign in with your Google account
- After signing in, you grant the Google Cloud SDK permission to access your GCP
  resources
- The credentials are stored locally (typically in `~/.config/gcloud/`)
- This is your **user account authentication** — used for `gcloud` CLI commands

## Step 4: Set Up Application Default Credentials (ADC)

For local development (running code that uses Google Cloud client libraries),
you also need Application Default Credentials:

```bash
gcloud auth application-default login
```

**What happens:**

- Opens another browser authentication flow
- Stores a separate set of credentials used by client libraries (Python, Go,
  Node.js, Java, etc.)
- These credentials are saved to
  `~/.config/gcloud/application_default_credentials.json`
- Any code using `google-auth` or similar libraries will automatically pick
  these up

**Why both?** `gcloud auth login` authenticates the `gcloud` CLI tool itself.
`gcloud auth application-default login` provides credentials for your
application code. They serve different purposes.

## Step 5: List Your Projects

Now check what GCP projects you have access to:

```bash
gcloud projects list
```

This returns a table with columns:

- `PROJECT_ID` — the unique identifier you use in commands
- `NAME` — the human-readable display name
- `PROJECT_NUMBER` — the numeric ID

If the list is empty, either your account doesn't have access to any projects or
you need to create one.

## Step 6: Set a Default Project

Pick a project from the list and set it as your default so you don't have to
specify `--project` on every command:

```bash
gcloud config set project PROJECT_ID
```

Replace `PROJECT_ID` with the actual project ID from the previous step.

## Step 7: Set a Default Region and Zone (Optional but Recommended)

Most GCP services require a region or zone. Setting defaults saves you from
specifying them repeatedly:

```bash
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a
```

Choose the region closest to you or your users. Common choices:

- `us-central1` (Iowa)
- `us-east1` (South Carolina)
- `us-west1` (Oregon)
- `europe-west1` (Belgium)
- `asia-east1` (Taiwan)

## Step 8: Verify Your Configuration

Confirm everything is set correctly:

```bash
gcloud config list
```

This displays your active configuration including account, project, and compute
defaults. The output looks like:

```
[core]
account = your-email@gmail.com
project = your-project-id

[compute]
region = us-central1
zone = us-central1-a
```

## Step 9: Quick Connectivity Test

To verify everything works end-to-end, run a simple API call:

```bash
gcloud services list --enabled
```

This lists all APIs enabled in your default project. If this returns results
without errors, your authentication and project configuration are working
correctly.

---

## Summary of Commands in Order

```bash
# 1. Verify installation
gcloud version

# 2. Check existing auth
gcloud auth list

# 3. Authenticate CLI
gcloud auth login

# 4. Set up Application Default Credentials for local dev
gcloud auth application-default login

# 5. List available projects
gcloud projects list

# 6. Set default project
gcloud config set project PROJECT_ID

# 7. Set default region/zone
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a

# 8. Verify configuration
gcloud config list

# 9. Test connectivity
gcloud services list --enabled
```

## Troubleshooting

- **"command not found"**: Run `source ~/google-cloud-sdk/path.bash.inc` or add
  the SDK to your shell profile.
- **Browser doesn't open**: Use `gcloud auth login --no-launch-browser` and
  manually copy/paste the URL.
- **No projects listed**: You may need to be invited to a project or create one
  at https://console.cloud.google.com.
- **Permission denied errors**: Your account may lack IAM roles on the project.
  Ask the project owner to grant you at least `roles/viewer`.
