# GCP Operations Plan for `web-app-prod`

This plan covers three operations in the `web-app-prod` project:

1. Delete Cloud SQL instance `db-legacy`
2. Resize GKE cluster `main-cluster` from 5 to 3 nodes
3. Check recent error logs from Cloud Run service `frontend`

---

## Pre-flight: Set the active project

```bash
gcloud config set project web-app-prod
```

This ensures all subsequent commands target the correct project.

---

## Operation 1: Delete Cloud SQL instance `db-legacy`

### ⚠️ CONFIRMATION REQUIRED — This is a destructive, irreversible operation.

Deleting a Cloud SQL instance permanently removes the instance and all its data
(databases, users, backups). This cannot be undone.

**Before proceeding, confirm:**

- All data has been migrated or backed up
- No applications are still connecting to this instance
- Any read replicas have been removed first

### Step 1a: Check the current state of the instance

```bash
gcloud sql instances describe db-legacy --format="yaml(state,databaseVersion,settings.tier,ipAddresses)"
```

This verifies the instance exists and shows its current configuration for a
final sanity check.

### Step 1b: List any replicas that depend on this instance

```bash
gcloud sql instances list --filter="masterInstanceName=db-legacy"
```

If replicas exist, they must be deleted first — Cloud SQL will not allow
deleting a primary instance that still has replicas.

### Step 1c: (If replicas exist) Delete replicas first

```bash
# For each replica found:
gcloud sql instances delete <REPLICA_NAME> --quiet
```

### Step 1d: Delete the instance

```bash
gcloud sql instances delete db-legacy
```

This will prompt for confirmation interactively. If running in a script or
automation context, add `--quiet` to skip the prompt (only after manual
confirmation has been obtained):

```bash
gcloud sql instances delete db-legacy --quiet
```

### Step 1e: Verify deletion

```bash
gcloud sql instances list --filter="name=db-legacy"
```

This should return no results, confirming the instance is deleted.

---

## Operation 2: Resize GKE cluster `main-cluster` from 5 to 3 nodes

### ⚠️ CONFIRMATION RECOMMENDED — This reduces cluster capacity.

Scaling down from 5 to 3 nodes will reduce available compute resources.
Kubernetes will attempt to reschedule pods from drained nodes, but if there's
insufficient capacity, some pods may become unschedulable.

**Before proceeding, confirm:**

- Current workload can fit on 3 nodes
- Pod Disruption Budgets (PDBs) are in place for critical services
- This won't violate any autoscaler minimum settings

### Step 2a: Check current cluster and node pool status

```bash
gcloud container clusters describe main-cluster \
  --zone=us-central1 \
  --format="yaml(currentNodeCount,nodePools[].name,nodePools[].initialNodeCount,nodePools[].autoscaling)"
```

> **Note:** GKE clusters can be zonal (e.g., `us-central1-a`) or regional
> (`us-central1`). If the cluster is regional, use `--region=us-central1`. If
> zonal, you need the specific zone (e.g., `--zone=us-central1-a`). The command
> below assumes regional; adjust if needed.

### Step 2b: Identify the node pool to resize

GKE clusters can have multiple node pools. You need to resize the specific node
pool. Typically the default pool is called `default-pool`:

```bash
gcloud container node-pools list \
  --cluster=main-cluster \
  --region=us-central1
```

### Step 2c: Resize the node pool

```bash
gcloud container clusters resize main-cluster \
  --region=us-central1 \
  --node-pool=default-pool \
  --num-nodes=3 \
  --quiet
```

> **Important:** If the cluster is **regional**, `--num-nodes=3` means 3 nodes
> **per zone**. For a 3-zone regional cluster, that would be 9 total nodes,
> not 3. If you want 3 total nodes in a regional cluster, you'd set
> `--num-nodes=1` (1 per zone × 3 zones = 3 total). Verify the cluster type
> first.
>
> If the cluster is **zonal**, `--num-nodes=3` means 3 total nodes.

### Step 2d: If autoscaling is enabled, update the autoscaler minimum

If the node pool has autoscaling enabled with a minimum above 3, the resize may
be overridden. Update the autoscaler:

```bash
gcloud container clusters update main-cluster \
  --region=us-central1 \
  --node-pool=default-pool \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=5
```

### Step 2e: Verify the new node count

```bash
gcloud container clusters describe main-cluster \
  --region=us-central1 \
  --format="yaml(currentNodeCount,nodePools[].instanceGroupUrls)"
```

Also check that all pods are healthy after the resize:

```bash
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed
```

---

## Operation 3: Check recent error logs from Cloud Run service `frontend`

This is a **read-only** operation — no confirmation needed.

### Step 3a: Read recent error logs

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="frontend" AND severity>=ERROR' \
  --project=web-app-prod \
  --limit=50 \
  --format="table(timestamp,severity,textPayload)" \
  --freshness=1d
```

This fetches up to 50 error-level (and above) log entries from the last 24
hours.

### Step 3b: If you need more detail (structured JSON logs)

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="frontend" AND severity>=ERROR' \
  --project=web-app-prod \
  --limit=50 \
  --format=json \
  --freshness=1d
```

### Step 3c: Check for specific HTTP errors (e.g., 5xx)

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="frontend" AND httpRequest.status>=500' \
  --project=web-app-prod \
  --limit=50 \
  --format="table(timestamp,httpRequest.status,httpRequest.requestUrl,httpRequest.latency)" \
  --freshness=1d
```

### Step 3d: Check current service status

```bash
gcloud run services describe frontend \
  --region=us-central1 \
  --format="yaml(status.conditions,status.traffic)"
```

---

## Recommended Execution Order

1. **Operation 3 first** (read logs) — This is read-only and risk-free. It may
   also reveal errors related to the other components, which is useful context.
2. **Operation 2 second** (resize GKE) — This is a scaling change that is
   reversible (you can scale back up). Perform this before the destructive
   operation.
3. **Operation 1 last** (delete Cloud SQL) — This is destructive and
   irreversible. Do it last, after confirming everything else is stable.

---

## Summary

| # | Operation                            | Risk Level | Reversible          | Confirmation Needed    |
| - | ------------------------------------ | ---------- | ------------------- | ---------------------- |
| 1 | Delete Cloud SQL `db-legacy`         | **High**   | No                  | **Yes — must confirm** |
| 2 | Resize GKE `main-cluster` 5→3 nodes  | Medium     | Yes (scale back up) | Recommended            |
| 3 | Read Cloud Run `frontend` error logs | None       | N/A (read-only)     | No                     |
