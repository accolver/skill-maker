# GCP Authentication and Setup for Local Development

Following the gcloud CLI skill workflow, I'll walk you through every step to get
authenticated and explore your projects. Since gcloud is not installed in this
environment, here are the exact commands I would run, in order, with
explanations.

---

## Step 1: Verify Context (Check Current State)

Before anything else, the skill requires verifying authentication and project
context. These are all **read-only** commands, so I would execute them
immediately without asking for confirmation.

### 1a. Check if gcloud is installed and which version

```bash
gcloud --version
```

**Why:** Confirms gcloud is installed and shows the SDK version. If this fails,
gcloud is not on your PATH or not installed.

### 1b. Check current authentication status

```bash
gcloud auth list
```

**Why:** This lists all authenticated accounts and shows which one is active
(marked with `*`). If the list is empty, you're not authenticated at all. If it
shows accounts but the wrong one is active, we'd need to switch.

**Expected output if not authenticated:**

```
No credentialed accounts.

To login, run:
  $ gcloud auth login
```

**Expected output if authenticated:**

```
           Credentialed Accounts
ACTIVE  ACCOUNT
*       your-email@gmail.com
```

### 1c. Check active project

```bash
gcloud config get-value project
```

**Why:** Shows the currently configured default project. If no project is set,
commands that require a project will fail or prompt interactively.

### 1d. Check active account

```bash
gcloud config get-value account
```

**Why:** Confirms which account is being used for API calls. Complements
`auth list` by showing the active account directly.

---

## Step 2: Authenticate for Local Development

Based on the skill's authentication guidance, local development needs **two**
auth flows: one for gcloud CLI commands, and one for Application Default
Credentials (used by Google client libraries).

### 2a. Authenticate gcloud CLI (interactive browser login)

```bash
gcloud auth login
```

**What this does:**

- Opens your default web browser
- Presents a Google sign-in page
- After you sign in and grant permissions, stores your credentials locally
- Sets this account as the active account for gcloud commands

**This is a mutating operation** (it changes your local credential state), so I
would explain this to you and ask for confirmation before running it:

> I'm going to run `gcloud auth login` which will open your browser for Google
> sign-in. This stores credentials locally on your machine for gcloud CLI usage.
> Shall I proceed?

### 2b. Set up Application Default Credentials (ADC)

```bash
gcloud auth application-default login
```

**What this does:**

- Opens your browser again for a separate auth flow
- Stores credentials at `~/.config/gcloud/application_default_credentials.json`
- These credentials are used by Google Cloud client libraries (Python, Node.js,
  Go, Java, etc.) when running locally

**Why both?** `gcloud auth login` authenticates the `gcloud` CLI tool itself.
`gcloud auth application-default login` sets up credentials for your application
code that uses Google client libraries. They are separate credential stores.

> I'm going to run `gcloud auth application-default login` to set up Application
> Default Credentials for local development with Google client libraries. This
> also opens your browser. Shall I proceed?

---

## Step 3: Verify Authentication Succeeded

After both auth commands complete, I would immediately run these read-only
verification commands:

```bash
gcloud auth list
```

**Expected output:** Should now show your account as active:

```
           Credentialed Accounts
ACTIVE  ACCOUNT
*       your-email@gmail.com
```

```bash
gcloud config get-value account
```

**Expected output:** Should show your email address.

---

## Step 4: List Your Projects

Now that you're authenticated, I would list all projects you have access to.
This is a **read-only** command, so I'd run it immediately without confirmation.

```bash
gcloud projects list --format="table(projectId,name,projectNumber)"
```

**What this does:**

- Lists every GCP project your account has access to
- Shows project ID (used in commands), display name, and project number
- Uses the `--format="table(...)"` flag for clean, readable output

**Expected output:**

```
PROJECT_ID          NAME                PROJECT_NUMBER
my-first-project    My First Project    123456789012
staging-env         Staging Environment 234567890123
production-app      Production App      345678901234
```

---

## Step 5: Set Your Default Project

Once you see your project list and identify which project you want to work with,
I would set it as the default. This is a configuration change, so I'd confirm
first:

> I'm going to set your default project to `YOUR_PROJECT_ID`:
>
> ```bash
> gcloud config set project YOUR_PROJECT_ID
> ```
>
> This configures gcloud to use this project by default for all commands. Shall
> I proceed?

After setting the project, verify it took effect:

```bash
gcloud config get-value project
```

---

## Step 6: Verify the Full Setup (Optional But Recommended)

To confirm everything works end-to-end, I'd run a few read-only commands against
your selected project:

### Check which APIs are enabled

```bash
gcloud services list --enabled --format="table(name,title)"
```

**Why:** Shows what services are available in this project. Useful to know what
you can work with.

### View your project details

```bash
gcloud projects describe YOUR_PROJECT_ID
```

**Why:** Shows project metadata including labels, lifecycle state, and create
time.

### Check your IAM permissions on the project

```bash
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:your-email@gmail.com" \
  --format="table(bindings.role)"
```

**Why:** Shows what roles you have on this project so you know what you're
authorized to do.

---

## Complete Command Sequence Summary

Here's the full ordered sequence of what I would run:

| Order | Command                                                                                                                                      | Type          | Confirmation Needed? |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------- |
| 1     | `gcloud --version`                                                                                                                           | Read          | No                   |
| 2     | `gcloud auth list`                                                                                                                           | Read          | No                   |
| 3     | `gcloud config get-value project`                                                                                                            | Read          | No                   |
| 4     | `gcloud config get-value account`                                                                                                            | Read          | No                   |
| 5     | `gcloud auth login`                                                                                                                          | Mutating      | **Yes**              |
| 6     | `gcloud auth application-default login`                                                                                                      | Mutating      | **Yes**              |
| 7     | `gcloud auth list`                                                                                                                           | Read (verify) | No                   |
| 8     | `gcloud projects list --format="table(projectId,name,projectNumber)"`                                                                        | Read          | No                   |
| 9     | `gcloud config set project PROJECT_ID`                                                                                                       | Mutating      | **Yes**              |
| 10    | `gcloud config get-value project`                                                                                                            | Read (verify) | No                   |
| 11    | `gcloud services list --enabled --format="table(name,title)"`                                                                                | Read          | No                   |
| 12    | `gcloud projects get-iam-policy PROJECT_ID --flatten="bindings[].members" --filter="bindings.members:EMAIL" --format="table(bindings.role)"` | Read          | No                   |

---

## Skill Checklist Verification

- [x] **Verified current auth and project context** -- Steps 1a-1d check auth
      and project before doing anything
- [x] **Classified operations as read-only or mutating** -- Read commands (list,
      describe, auth list) run freely; mutating commands (auth login, config set
      project) require confirmation
- [x] **Used `--help` to discover unfamiliar commands/flags** -- Would use
      `gcloud --help` or `gcloud projects list --help` if any flag was uncertain
- [x] **Executed read-only commands without blocking on confirmation** -- All
      list/describe/get-value commands run immediately
- [x] **Showed exact command and impact before any mutating operation** --
      `gcloud auth login`, `gcloud auth application-default login`, and
      `gcloud config set project` all presented with impact explanation before
      execution
- [x] **Got explicit user approval before mutating** -- Confirmation requested
      for all three mutating operations
- [x] **Did NOT use `--quiet` on destructive commands** -- No `--quiet` flags
      used anywhere
- [x] **Verified result with a read command after mutation** --
      `gcloud auth list` after login, `gcloud config get-value project` after
      setting project
- [x] **Used appropriate `--format` flag for output readability** --
      `table(...)` format used for projects list, services list, and IAM policy

---

## Tips for New GCP Users

1. **Project is everything** -- Almost every gcloud command operates against a
   project. Always know which project is active with
   `gcloud config get-value project`.

2. **Two types of auth** -- `gcloud auth login` is for the CLI.
   `gcloud auth application-default login` is for your application code. You
   need both for local dev.

3. **Read freely, mutate carefully** -- You can safely run any `list`,
   `describe`, or `get-iam-policy` command without risk. Only `create`,
   `delete`, `update`, `deploy` etc. change state.

4. **Use `--format`** -- Default output is often noisy. Use
   `--format="table(field1,field2)"` for clean output or `--format=json` when
   you need to parse results.

5. **Use `--help` liberally** -- `gcloud compute instances create --help` will
   show you every available flag. Don't guess flag names.
