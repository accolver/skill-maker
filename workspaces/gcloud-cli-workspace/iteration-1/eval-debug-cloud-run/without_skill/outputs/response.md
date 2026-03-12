# Debugging Cloud Run 503 Errors: `payment-api` in `us-central1`

## Overview

503 errors from Cloud Run indicate the service is unavailable. Common causes
include: container failing to start, container crashing, resource exhaustion,
traffic spike beyond scaling capacity, downstream dependency failures, or
deployment issues. Below is the full investigation workflow with exact commands.

---

## Phase 1: Confirm the Problem and Get Service Status

### Step 1: Check service details and current status

```bash
gcloud run services describe payment-api \
  --region=us-central1 \
  --format="yaml"
```

**Why:** This shows the current service configuration — the latest revision,
traffic split, resource limits (CPU/memory), concurrency settings, scaling
min/max, environment variables, and overall service conditions. Look for:

- `status.conditions` — any condition with `status: "False"` indicates a problem
- `status.latestReadyRevisionName` vs `status.latestCreatedRevisionName` — if
  these differ, the latest revision failed to become ready
- Traffic split — confirm traffic is routing to the expected revision

### Step 2: List revisions to see recent deployments

```bash
gcloud run revisions list \
  --service=payment-api \
  --region=us-central1 \
  --format="table(name, active, ready, creation_timestamp)" \
  --sort-by="~creation_timestamp" \
  --limit=10
```

**Why:** If a new revision was deployed this morning and it's not in `Ready`
state, that's likely the cause. Compare the timestamp of the latest revision
with when 503s started.

---

## Phase 2: Check Logs

### Step 3: Fetch recent error logs

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="payment-api" AND resource.labels.location="us-central1" AND severity>=ERROR' \
  --limit=50 \
  --format="table(timestamp, severity, textPayload, jsonPayload.message)" \
  --freshness="6h"
```

**Why:** This pulls all ERROR and above logs from the last 6 hours. Look for:

- Container startup failures (`Container failed to start`)
- OOM kills (`Memory limit exceeded`)
- Unhandled exceptions or crash stack traces
- Connection errors to downstream services (databases, APIs)

### Step 4: Check for container startup issues specifically

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="payment-api" AND resource.labels.location="us-central1" AND textPayload=~"Container called exit" OR textPayload=~"Failed to start"' \
  --limit=20 \
  --format="table(timestamp, textPayload)" \
  --freshness="6h"
```

**Why:** Cloud Run returns 503 when the container can't start or crashes before
responding. These specific log patterns indicate startup failures.

### Step 5: Check request logs for 503 response patterns

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="payment-api" AND httpRequest.status=503' \
  --limit=50 \
  --format="table(timestamp, httpRequest.requestUrl, httpRequest.latency, httpRequest.userAgent)" \
  --freshness="6h"
```

**Why:** This shows which specific endpoints are returning 503, whether it's all
requests or specific paths, and the latency pattern. If latency is exactly at
the request timeout, it's likely a container that hangs during startup or
processing.

---

## Phase 3: Check Metrics and Scaling

### Step 6: Check instance count and scaling behavior

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="payment-api" AND resource.labels.location="us-central1" AND (textPayload=~"Starting" OR textPayload=~"Listening")' \
  --limit=30 \
  --format="table(timestamp, textPayload)" \
  --freshness="6h"
```

**Why:** Frequent "Starting" messages with few "Listening" messages suggest
containers are repeatedly crashing (crash loop). If you see a burst of starts,
it could be a scaling event that's failing.

### Step 7: Check Cloud Monitoring metrics via gcloud (alternative: console)

```bash
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count" AND resource.labels.service_name="payment-api" AND metric.labels.response_code_class="5xx"' \
  --interval-start="$(date -u -d '6 hours ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --interval-end="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

**Why:** This gives you the 5xx error rate over time. A sudden spike at a
specific time correlates with a deployment or external event.

### Step 8: Check container instance count

```bash
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/container/instance_count" AND resource.labels.service_name="payment-api"' \
  --interval-start="$(date -u -d '6 hours ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --interval-end="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

**Why:** If instance count is at 0 and not scaling up, the container is failing
health checks. If it's at max and still returning 503s, you're hitting scaling
limits.

---

## Phase 4: Check Configuration for Common 503 Causes

### Step 9: Inspect resource limits and concurrency

```bash
gcloud run services describe payment-api \
  --region=us-central1 \
  --format="value(spec.template.spec.containers[0].resources.limits, spec.template.metadata.annotations['autoscaling.knative.dev/maxScale'], spec.template.spec.containerConcurrency)"
```

**Why:** Common misconfigurations:

- **Memory too low** — container OOMs on startup or under load
- **CPU too low** — container can't start within the timeout
- **maxScale too low** — can't handle traffic volume
- **concurrency too high** — single instance gets overloaded

### Step 10: Check the startup probe and timeout settings

```bash
gcloud run services describe payment-api \
  --region=us-central1 \
  --format="yaml(spec.template.spec.containers[0].startupProbe, spec.template.metadata.annotations['run.googleapis.com/startup-cpu-boost'])"
```

**Why:** If the container takes a long time to start (e.g., loading ML models,
connecting to databases) and the startup probe timeout is too short, Cloud Run
will kill the container before it's ready.

---

## Phase 5: Check External Dependencies

### Step 11: Check if a VPC connector is involved and healthy

```bash
gcloud run services describe payment-api \
  --region=us-central1 \
  --format="value(spec.template.metadata.annotations['run.googleapis.com/vpc-access-connector'], spec.template.metadata.annotations['run.googleapis.com/vpc-access-egress'])"
```

**Why:** If the service uses a VPC connector to reach a private database or API,
and that connector is unhealthy or its subnet is exhausted, all outbound
connections fail, causing 503s.

If a VPC connector is configured:

```bash
gcloud compute networks vpc-access connectors describe <CONNECTOR_NAME> \
  --region=us-central1 \
  --format="yaml(state, connectedProjects, subnet, machineType, minInstances, maxInstances)"
```

### Step 12: Check if Cloud SQL or other dependencies are up

```bash
gcloud sql instances describe <INSTANCE_NAME> \
  --format="table(state, settings.ipConfiguration, connectionName)"
```

**Why:** For a payment API, database connectivity is critical. If Cloud SQL is
in `MAINTENANCE` or `SUSPENDED` state, or if connection limits are exhausted,
the app will fail.

### Step 13: Check Secret Manager access (if secrets are mounted)

```bash
gcloud run services describe payment-api \
  --region=us-central1 \
  --format="yaml(spec.template.spec.containers[0].env)" | grep -A2 "secretKeyRef"
```

**Why:** If the service references secrets that were deleted or whose
permissions changed, the container will fail to start.

---

## Phase 6: Investigate Recent Changes

### Step 14: Check deployment history via audit logs

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND protoPayload.methodName="google.cloud.run.v2.Services.UpdateService" AND resource.labels.service_name="payment-api"' \
  --limit=5 \
  --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.request.service.template.containers[0].image)" \
  --freshness="24h"
```

**Why:** Shows who deployed what and when. If a deployment happened right before
503s started, the new image is likely the culprit.

### Step 15: Check IAM changes

```bash
gcloud logging read \
  'protoPayload.methodName="SetIamPolicy" AND protoPayload.resourceName=~"payment-api"' \
  --limit=10 \
  --format="table(timestamp, protoPayload.authenticationInfo.principalEmail)" \
  --freshness="24h"
```

**Why:** If someone changed IAM permissions on the service or its service
account, the container may lose access to resources it needs.

---

## Phase 7: Immediate Mitigation

### Option A: Roll back to the previous revision (if a bad deployment is the cause)

```bash
# List revisions to find the last known good one
gcloud run revisions list \
  --service=payment-api \
  --region=us-central1 \
  --format="table(name, active, ready)" \
  --limit=5

# Route 100% traffic to the last known good revision
gcloud run services update-traffic payment-api \
  --region=us-central1 \
  --to-revisions=<LAST_GOOD_REVISION>=100
```

### Option B: Increase resources (if OOM or CPU starvation)

```bash
gcloud run services update payment-api \
  --region=us-central1 \
  --memory=1Gi \
  --cpu=2
```

### Option C: Increase max instances (if hitting scaling limits)

```bash
gcloud run services update payment-api \
  --region=us-central1 \
  --max-instances=100
```

### Option D: Reduce concurrency (if instances are overloaded)

```bash
gcloud run services update payment-api \
  --region=us-central1 \
  --concurrency=50
```

---

## Decision Tree Summary

```
503 errors on payment-api
│
├─ Latest revision NOT ready?
│  ├─ Yes → Check logs for startup failure → Roll back (Option A)
│  └─ No → Continue
│
├─ Containers crashing (repeated "exit" in logs)?
│  ├─ OOM → Increase memory (Option B)
│  ├─ Unhandled exception → Fix code, redeploy
│  └─ Dependency connection failure → Check Step 11-13
│
├─ Containers running but returning 503?
│  ├─ At max instances → Increase max (Option C)
│  ├─ High latency per request → Reduce concurrency (Option D)
│  └─ Downstream timeout → Check external dependencies
│
├─ No containers starting at all?
│  ├─ Secret/permission error → Check Step 13, 15
│  ├─ Image pull failure → Check image exists in registry
│  └─ VPC connector issue → Check Step 11
│
└─ Intermittent 503s (not all requests)?
   ├─ Cold start timeouts → Enable startup CPU boost, min instances
   └─ Traffic spike → Increase max instances, review concurrency
```

---

## Recommended Investigation Order

| Step       | Command Focus                | Time Estimate |
| ---------- | ---------------------------- | ------------- |
| 1-2        | Service status and revisions | 1 min         |
| 3-5        | Error logs                   | 2 min         |
| 6-8        | Scaling and metrics          | 2 min         |
| 9-10       | Configuration review         | 1 min         |
| 11-13      | External dependencies        | 2 min         |
| 14-15      | Recent changes audit         | 1 min         |
| Mitigation | Apply appropriate fix        | 1 min         |

**Total estimated triage time: ~10 minutes**

Start with Steps 1-5 — in most cases, the service description and error logs
will immediately point you to the root cause.
