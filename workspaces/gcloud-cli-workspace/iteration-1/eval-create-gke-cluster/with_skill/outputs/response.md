# Create GKE Cluster: `staging-cluster` in `us-east1`

Following the gcloud-cli skill workflow step by step.

---

## Step 1: Verify Context

Before anything else, I would run these read-only commands immediately (no
confirmation needed) to verify auth and project context:

```bash
gcloud auth list
gcloud config get-value project
gcloud config get-value account
```

**Why:** Wrong project is the #1 cause of gcloud disasters. I need to confirm
the active account and project before proceeding. If the project looks wrong or
the user is not authenticated, I would stop and resolve that first.

**What I'd check:**

- Is there an active account listed?
- Is the active project the one where the user wants the GKE cluster?

> If the project shown is not the intended target, I would ask: "The active
> project is `<shown-project>`. Is that where you want to create
> `staging-cluster`, or should I switch to a different project?"

---

## Step 2: Classify Operations

The user's request involves two operations:

| Operation                             | Category     | Reason                                                         |
| ------------------------------------- | ------------ | -------------------------------------------------------------- |
| Enable `container.googleapis.com` API | **Mutating** | `gcloud services enable` changes state                         |
| Create GKE cluster `staging-cluster`  | **Mutating** | `gcloud container clusters create` creates a billable resource |

Both require explicit user confirmation before execution.

---

## Step 3: Discover and Verify Commands

I would verify the exact flags using the built-in help system (read-only, run
immediately):

```bash
gcloud services enable --help
gcloud container clusters create --help
```

**Why:** Flags change across gcloud versions. The skill mandates discovering
commands via `--help` rather than guessing. This confirms that
`--enable-autoscaling`, `--min-nodes`, `--max-nodes`, `--machine-type`, and
`--location` are all valid flags for the current gcloud version.

---

## Step 4: Read Current State (read-only, run immediately)

Before proposing mutations, I would gather context with these read commands:

### 4a. Check if the API is already enabled

```bash
gcloud services list --enabled --filter="name:container.googleapis.com" --format="table(name,title)"
```

**Why:** The user said "enable if not already enabled." This read command tells
us whether we can skip the enable step entirely.

### 4b. Check for existing clusters in the region

```bash
gcloud container clusters list --format="table(name,location,currentMasterVersion,currentNodeCount,status)"
```

**Why:** Confirms there's no naming conflict with an existing `staging-cluster`
and gives us visibility into what already exists.

---

## Step 5: Confirm Before Mutating

Based on the read results, I would present the mutations for approval.

### 5a. Enable the Kubernetes Engine API (if not already enabled)

> **If the Step 4a check shows `container.googleapis.com` is NOT in the enabled
> list:**
>
> I'm going to enable the Kubernetes Engine API in project `<active-project>`:
>
> ```bash
> gcloud services enable container.googleapis.com
> ```
>
> This enables the GKE API, which is required before creating clusters. There is
> no direct billing impact from enabling the API itself, but it allows creation
> of billable GKE resources. **Shall I proceed?**

> **If the Step 4a check shows it IS already enabled:**
>
> The `container.googleapis.com` API is already enabled. No action needed --
> skipping this step.

**[PAUSE: Wait for user confirmation before running the enable command, if
needed.]**

After user confirms and the command runs, I would verify:

```bash
gcloud services list --enabled --filter="name:container.googleapis.com" --format="table(name,title)"
```

---

### 5b. Create the GKE cluster

> I'm going to create a GKE cluster in project `<active-project>`:
>
> ```bash
> gcloud container clusters create staging-cluster \
>   --location=us-east1 \
>   --machine-type=e2-standard-4 \
>   --num-nodes=3 \
>   --enable-autoscaling \
>   --min-nodes=1 \
>   --max-nodes=5
> ```
>
> **What this does:**
>
> - Creates a **regional** GKE cluster named `staging-cluster` in `us-east1`
>   (regional clusters run the control plane across 3 zones for high
>   availability)
> - Uses `e2-standard-4` machines (4 vCPUs, 16 GB RAM each)
> - Starts with 3 nodes per zone, autoscales between 1 and 5 nodes per zone
> - **Billing impact:** Regional clusters bill for the nodes across all 3 zones
>   in `us-east1`. At initial scale (3 nodes x 3 zones = 9 total nodes), this is
>   approximately 9 x e2-standard-4 instances. Autoscaling may increase this to
>   up to 15 nodes total (5 per zone x 3 zones).
> - This command typically takes 5-10 minutes to complete.
>
> **Shall I proceed?**

**[PAUSE: Wait for explicit user approval before running the create command.]**

**Note on `--location` vs `--zone`:** Using `--location=us-east1` (a region, not
a zone) creates a regional cluster. If the user wants a zonal cluster instead
(cheaper, less resilient), the flag would be `--zone=us-east1-b` (or another
specific zone). I would clarify this with the user if there's any ambiguity. The
reference patterns show `--location=LOCATION` as the standard flag for GKE
cluster creation.

**Note on `--num-nodes`:** For regional clusters, `--num-nodes` is the count
_per zone_. With 3 zones in `us-east1`, `--num-nodes=3` means 9 total nodes
initially. If the user wants 3 total nodes, I'd set `--num-nodes=1`. Similarly,
`--min-nodes` and `--max-nodes` are per-zone values. I would clarify this with
the user before proceeding.

---

## Step 6: Verify the Result

After the cluster creation command completes, I would run these read-only
verification commands immediately:

```bash
# Describe the new cluster to confirm it was created correctly
gcloud container clusters describe staging-cluster \
  --location=us-east1 \
  --format="table(name,location,currentMasterVersion,currentNodeCount,status,autoscaling)"
```

```bash
# List all clusters to see the full picture
gcloud container clusters list --format="table(name,location,currentMasterVersion,currentNodeCount,status)"
```

**What I'd verify:**

- Cluster status is `RUNNING`
- Location is `us-east1`
- Node count matches expectations
- Autoscaling is configured (min=1, max=5)

---

## Complete Command Sequence Summary

| Order | Command                                                                       | Type          | Confirmation Required |
| ----- | ----------------------------------------------------------------------------- | ------------- | --------------------- |
| 1     | `gcloud auth list`                                                            | Read          | No                    |
| 2     | `gcloud config get-value project`                                             | Read          | No                    |
| 3     | `gcloud config get-value account`                                             | Read          | No                    |
| 4     | `gcloud services enable --help`                                               | Read          | No                    |
| 5     | `gcloud container clusters create --help`                                     | Read          | No                    |
| 6     | `gcloud services list --enabled --filter="name:container.googleapis.com" ...` | Read          | No                    |
| 7     | `gcloud container clusters list ...`                                          | Read          | No                    |
| 8     | `gcloud services enable container.googleapis.com` (if needed)                 | **Mutating**  | **YES**               |
| 9     | `gcloud services list --enabled --filter="name:container.googleapis.com" ...` | Read (verify) | No                    |
| 10    | `gcloud container clusters create staging-cluster ...`                        | **Mutating**  | **YES**               |
| 11    | `gcloud container clusters describe staging-cluster --location=us-east1 ...`  | Read (verify) | No                    |
| 12    | `gcloud container clusters list ...`                                          | Read (verify) | No                    |

---

## Checklist Completion

- [x] Verified current auth and project context (Step 1)
- [x] Classified operation as read-only or mutating (Step 2)
- [x] Used `--help` to discover unfamiliar commands/flags (Step 3)
- [x] Executed read-only commands without blocking on confirmation (Steps 1,
      3, 4)
- [x] Showed exact command and impact before any mutating operation (Step 5a,
      5b)
- [x] Got explicit user approval before mutating (pauses at Step 5a and 5b)
- [x] Did NOT use `--quiet` on any commands
- [x] Verified result with a read command after mutation (Step 6)
- [x] Used appropriate `--format` flag for output readability (throughout)
