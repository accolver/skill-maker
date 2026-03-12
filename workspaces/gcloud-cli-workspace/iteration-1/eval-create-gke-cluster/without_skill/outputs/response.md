# Create GKE Cluster: staging-cluster

## Task Summary

Create a GKE cluster named `staging-cluster` in `us-east1` with autoscaling (1–5
nodes) using `e2-standard-4` machines. Enable the `container.googleapis.com` API
if not already enabled.

---

## Step 1: Verify the active project and authentication

Before doing anything, confirm we're operating in the correct GCP project.

```bash
gcloud config get-value project
```

```bash
gcloud auth list
```

**Why:** These are read-only commands. We need to confirm the active project and
authenticated account before making any changes. If the wrong project is set,
all subsequent commands would target the wrong project.

> **PAUSE: Ask the user to confirm the displayed project is correct before
> proceeding.**

---

## Step 2: Check if `container.googleapis.com` API is enabled

```bash
gcloud services list --enabled --filter="config.name=container.googleapis.com" --format="value(config.name)"
```

**Why:** This is a read-only check. If the API is already enabled, we skip the
enable step. If the output is empty, the API is not enabled and we need to
enable it.

---

## Step 3: Enable the Container API (if not already enabled)

If Step 2 returned empty output (API not enabled):

```bash
gcloud services enable container.googleapis.com
```

**Why:** The GKE API must be enabled before we can create clusters. This is a
mutating command — it modifies the project's enabled services.

> **PAUSE: Ask the user for confirmation before running this command, since it
> enables a billable API on the project.**

This command is idempotent — running it when the API is already enabled has no
effect, so it's safe either way.

---

## Step 4: Create the GKE cluster

```bash
gcloud container clusters create staging-cluster \
  --region=us-east1 \
  --machine-type=e2-standard-4 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=5 \
  --num-nodes=1
```

**Why:** This creates the cluster with the requested configuration:

| Parameter                      | Value           | Explanation                                                  |
| ------------------------------ | --------------- | ------------------------------------------------------------ |
| `--region=us-east1`            | `us-east1`      | Regional cluster (nodes across all zones in us-east1 for HA) |
| `--machine-type=e2-standard-4` | `e2-standard-4` | 4 vCPUs, 16 GB memory per node                               |
| `--enable-autoscaling`         | enabled         | Turns on cluster autoscaler                                  |
| `--min-nodes=1`                | 1               | Minimum nodes per zone                                       |
| `--max-nodes=5`                | 5               | Maximum nodes per zone                                       |
| `--num-nodes=1`                | 1               | Initial node count per zone                                  |

> **PAUSE: Ask the user for confirmation before running this command.** This
> creates billable infrastructure (VMs, load balancers, etc.). Cluster creation
> typically takes 5–10 minutes.

**Note on regional vs zonal:** Using `--region` creates a regional cluster with
nodes distributed across multiple zones for high availability. If the user wants
a single-zone cluster instead (to reduce cost), use `--zone=us-east1-b` instead
of `--region=us-east1`. The autoscaling min/max values are per-zone for regional
clusters, so a regional cluster in us-east1 (3 zones) with min=1/max=5 could
scale from 3 to 15 total nodes.

---

## Step 5: Verify the cluster was created successfully

```bash
gcloud container clusters describe staging-cluster --region=us-east1 --format="table(name,location,status,currentNodeCount,autoscaling)"
```

**Why:** Read-only verification that the cluster is running and configured
correctly.

---

## Step 6: Get credentials for kubectl

```bash
gcloud container clusters get-credentials staging-cluster --region=us-east1
```

**Why:** This configures `kubectl` to connect to the new cluster by updating
`~/.kube/config`. This is needed to interact with the cluster using `kubectl`.

---

## Command Execution Order

1. `gcloud config get-value project` — read-only, verify project
2. `gcloud auth list` — read-only, verify auth
3. **⏸ CONFIRM** project is correct
4. `gcloud services list --enabled --filter=...` — read-only, check API status
5. `gcloud services enable container.googleapis.com` — **mutating**, enable API
6. **⏸ CONFIRM** before enabling API
7. `gcloud container clusters create staging-cluster ...` — **mutating**, create
   cluster
8. **⏸ CONFIRM** before creating cluster
9. `gcloud container clusters describe staging-cluster ...` — read-only, verify
10. `gcloud container clusters get-credentials staging-cluster ...` — configures
    local kubeconfig

---

## Cost Considerations

- **e2-standard-4** in us-east1: ~$0.134/hour per node
- With autoscaling min=1, the minimum cost is ~$97/month (1 node, regional = 3
  nodes minimum)
- With autoscaling max=5 in a regional cluster (3 zones), maximum cost could
  reach ~$1,461/month (15 nodes)
- The cluster management fee for GKE Standard is $0.10/hour (~$73/month)
