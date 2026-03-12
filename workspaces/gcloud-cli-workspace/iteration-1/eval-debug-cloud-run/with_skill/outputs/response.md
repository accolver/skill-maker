# Debugging Cloud Run 503 Errors — `payment-api` in `us-central1`

## Investigation Plan

The service `payment-api` in `us-central1` is returning 503 errors since this
morning. 503 on Cloud Run typically means: the container is crashing, failing
health checks, exceeding resource limits, a bad revision was deployed, or a
downstream dependency is failing. All investigation steps below are
**read-only** and would execute immediately without confirmation per the skill's
safety model.

---

## Step 1: Verify Context

Before anything else, confirm we're operating in the correct project and
authenticated identity. Wrong project is the #1 cause of gcloud mistakes.

```bash
gcloud auth list
gcloud config get-value project
gcloud config get-value account
```

**Why:** We need to make sure we're looking at the right project. If the active
project isn't the one hosting `payment-api`, every subsequent command will
return misleading results or "not found" errors. I'd confirm the project with
the user if it looked wrong.

---

## Step 2: Check Service Status

Get the current state of the service to see if Cloud Run itself reports any
conditions (e.g., "RevisionFailed", "ContainerHealthCheckFailed").

```bash
gcloud run services describe payment-api \
  --region=us-central1 \
  --format=yaml
```

**What to look for:**

- `status.conditions` — any condition with `status: "False"` or `reason` fields
  like `RevisionFailed`, `ContainerHealthCheckFailed`,
  `HealthCheckContainerError`
- `status.url` — confirm the service URL is what we expect
- `status.traffic` — check which revision(s) are receiving traffic and their
  percentages
- `spec.template.spec.containers[0].image` — what image is currently configured
- `spec.template.spec.containers[0].resources` — current memory/CPU limits

**Classification:** Read-only. Execute immediately.

---

## Step 3: List Recent Revisions

Check if a new revision was deployed this morning that correlates with the start
of 503 errors.

```bash
gcloud run revisions list \
  --service=payment-api \
  --region=us-central1 \
  --format="table(name,active,createTime,status.conditions[0].status)"
```

**What to look for:**

- A new revision created around the time errors started — this is the most
  common cause of 503s (bad deployment)
- Whether the latest revision shows `True` or `False` for its ready condition
- Whether traffic is still pointed at an older, healthy revision or the new
  failing one
- Multiple revisions with `active: True` could indicate a traffic split issue

**Classification:** Read-only. Execute immediately.

---

## Step 4: Describe the Active Revision

Once we identify the revision currently receiving traffic (from Step 3), inspect
it in detail.

```bash
gcloud run revisions describe REVISION_NAME \
  --region=us-central1 \
  --format=yaml
```

_(Replace `REVISION_NAME` with the actual active revision name from Step 3.)_

**What to look for:**

- `status.conditions` — detailed failure reasons (ImagePullBackOff,
  ContainerStartupFailed, etc.)
- `spec.containers[0].image` — the exact container image URI; verify it exists
  and is valid
- `spec.containers[0].resources.limits` — memory/CPU limits; if too low, the
  container may be OOM-killed
- `spec.containers[0].env` — environment variables that may have changed
- `spec.containerConcurrency` — concurrency setting
- `spec.timeoutSeconds` — request timeout

**Classification:** Read-only. Execute immediately.

---

## Step 5: Read Error Logs

This is the most critical step. Read the recent Cloud Run logs filtered to
errors and above to find the actual failure messages.

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="payment-api" AND severity>=ERROR' \
  --limit=50 \
  --format=json
```

**What to look for:**

- **Container crash messages** — "Container called exit(1)", segfaults, panic
  traces
- **OOM kills** — "Memory limit of X exceeded" — indicates the container needs
  more memory
- **Port binding errors** — "Failed to start container" / container not
  listening on `$PORT`
- **Dependency failures** — connection timeouts to databases, APIs, or other
  services
- **Health check failures** — startup probe or liveness probe failures
- **Image pull errors** — "Failed to pull image" if the image was deleted or
  permissions changed

**Classification:** Read-only. Execute immediately.

---

## Step 6: Read Broader Logs (Including Non-Error)

Sometimes 503s are caused by issues that don't log at ERROR severity (e.g., slow
startups that time out). Read recent logs at all severity levels.

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="payment-api"' \
  --limit=100 \
  --format=json
```

**What to look for:**

- Startup timing — how long does the container take to start? Cloud Run has a
  startup timeout (default 240s for gen2, 4 minutes)
- Any application-level warnings before the crash
- Request patterns — sudden traffic spikes that exceed max instances
- Repeated restarts in quick succession (crash loop)

**Classification:** Read-only. Execute immediately.

---

## Step 7: Verify the Container Image Exists

If the revision references an image that was deleted from Artifact Registry or
Container Registry, Cloud Run can't pull it and returns 503.

```bash
# Get the image URI from the active revision
gcloud run revisions describe REVISION_NAME \
  --region=us-central1 \
  --format="value(spec.containers[0].image)"
```

Then verify the image exists:

```bash
# If using Artifact Registry (us-docker.pkg.dev/...)
gcloud artifacts docker images describe IMAGE_URI

# If using Container Registry (gcr.io/...)
gcloud container images describe IMAGE_URI
```

**Classification:** Read-only. Execute immediately.

---

## Step 8: Check for Resource/Quota Issues

If the project is hitting Cloud Run quotas or the container is hitting resource
limits:

```bash
# Check Cloud Run service configuration limits
gcloud run services describe payment-api \
  --region=us-central1 \
  --format="table(spec.template.spec.containers[0].resources.limits,spec.template.spec.containerConcurrency,spec.template.metadata.annotations.'autoscaling.knative.dev/maxScale')"
```

```bash
# Check if there were any recent quota-related errors
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="payment-api" AND textPayload=~"quota|limit|OOM|memory"' \
  --limit=20 \
  --format=json
```

**Classification:** Read-only. Execute immediately.

---

## Step 9: Check IAM and Ingress Settings

A 503 can also occur if ingress settings changed, or if the service account used
by the revision lost permissions to access downstream resources.

```bash
# Check ingress settings
gcloud run services describe payment-api \
  --region=us-central1 \
  --format="value(metadata.annotations.'run.googleapis.com/ingress')"

# Check the service account the revision runs as
gcloud run services describe payment-api \
  --region=us-central1 \
  --format="value(spec.template.spec.serviceAccountName)"
```

If a custom service account is configured, verify its permissions:

```bash
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:SA_EMAIL" \
  --format="table(bindings.role)"
```

**Classification:** Read-only. Execute immediately.

---

## Step 10: Check for Platform-Level Issues

Finally, check if there's a broader GCP incident affecting Cloud Run in
`us-central1`.

```bash
# Check if other Cloud Run services in the same region are also affected
gcloud run services list \
  --region=us-central1 \
  --format="table(name,status.conditions[0].type,status.conditions[0].status)"
```

Also recommend the user check the
[Google Cloud Status Dashboard](https://status.cloud.google.com/) for any active
incidents.

**Classification:** Read-only. Execute immediately.

---

## Decision Tree Based on Findings

After running the above commands, here's how to proceed based on what we find:

| Finding                                                                    | Likely Cause                  | Next Step                                                              |
| -------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| New revision deployed this morning, revision shows `False` ready condition | Bad deployment                | Roll back traffic to previous revision (MUTATING - needs confirmation) |
| Logs show "Memory limit exceeded"                                          | OOM kills                     | Update service memory limit (MUTATING - needs confirmation)            |
| Logs show "Failed to pull image"                                           | Deleted or inaccessible image | Fix image or redeploy (MUTATING - needs confirmation)                  |
| Logs show connection errors to database/API                                | Downstream dependency failure | Investigate the downstream service, not Cloud Run itself               |
| Logs show "Container failed to start" on PORT                              | App not binding to $PORT      | Fix application code to listen on `$PORT` env var, redeploy            |
| No new revision, no errors, other services also failing                    | Platform incident             | Check GCP Status Dashboard, wait for resolution                        |
| Startup takes >240s                                                        | Startup timeout               | Optimize startup time or increase startup timeout (MUTATING)           |
| Ingress changed to "internal"                                              | Ingress misconfiguration      | Update ingress setting (MUTATING - needs confirmation)                 |
| Service account lost permissions                                           | IAM change                    | Re-add IAM binding (MUTATING - needs confirmation)                     |

---

## Potential Remediation Commands (ALL MUTATING — Would Require Explicit Confirmation)

None of these would be executed without showing the exact command and getting a
clear "yes" from the user.

### Roll back to previous revision

> I'm going to route 100% of traffic to the previous known-good revision
> `payment-api-XXXXX` in project `PROJECT_ID`:
>
> ```bash
> gcloud run services update-traffic payment-api \
>   --region=us-central1 \
>   --to-revisions=payment-api-XXXXX=100
> ```
>
> This will immediately shift all traffic away from the failing revision. The
> failing revision will still exist but receive no traffic. Shall I proceed?

### Increase memory limit

> I'm going to update the `payment-api` service to increase memory to 1Gi in
> project `PROJECT_ID`:
>
> ```bash
> gcloud run services update payment-api \
>   --region=us-central1 \
>   --memory=1Gi
> ```
>
> This will create a new revision with the higher memory limit and route traffic
> to it. Shall I proceed?

### After any remediation — verify

```bash
gcloud run services describe payment-api \
  --region=us-central1 \
  --format="table(status.url,status.conditions.type,status.conditions.status)"
```

---

## Summary

This investigation follows a structured read-first approach:

1. **Verify context** (auth + project) — prevent investigating the wrong project
2. **Service status** — see what Cloud Run itself reports
3. **Revisions** — identify if a recent deploy caused the issue
4. **Active revision details** — inspect image, resources, config
5. **Error logs** — find the actual failure messages
6. **Broader logs** — catch non-error signals like slow startups
7. **Image verification** — rule out deleted/missing images
8. **Resource/quota check** — rule out OOM or quota exhaustion
9. **IAM/ingress** — rule out permission or network changes
10. **Platform check** — rule out GCP-wide incidents

All 10 steps are read-only and would execute immediately without asking for
confirmation. Only remediation steps (traffic rollback, resource updates,
redeployment) are mutating and would require explicit user approval before
execution.
