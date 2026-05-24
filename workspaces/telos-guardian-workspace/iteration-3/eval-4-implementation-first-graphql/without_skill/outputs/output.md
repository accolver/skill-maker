I would not start with a replacement implementation plan yet. This is an architectural decision, not just an API modernization task, and it needs a Telos fit checkpoint first.

## Telos checkpoint

**Decision type:** Architecture / contract replacement assessment.

**Current purpose pressure:** FieldOps Lite exists to help 5-25 person HVAC/plumbing teams complete work orders reliably in the field, especially with poor connectivity. The strongest success metrics are:

- technicians load today's jobs in under 2 seconds
- 95% of work orders can be completed offline and synced later
- office dispatch calls drop by 30%

The stated reason for GraphQL is that it is “more flexible for mobile clients.” That is not yet enough purpose pressure to justify replacing the REST API this quarter. Flexibility is only valuable here if it improves offline reliability, sync correctness, load speed, or technician simplicity.

## Alignment assessment

### L4 Purpose fit

A full REST-to-GraphQL replacement is risky against the stated constraints:

- **Mobile-first:** GraphQL can help shape payloads, but it can also add client complexity, schema/versioning complexity, and caching complexity.
- **Offline-first:** The current system is already built around local SQLite cache, a sync queue, and a backend-owned conflict resolution model. GraphQL does not automatically improve offline behavior.
- **Poor connectivity:** GraphQL requests can become harder to retry, persist, inspect, and cache than simple purpose-built REST endpoints if not carefully constrained.
- **Low-admin / no dedicated IT staff:** A new GraphQL layer adds operational and debugging surface area for small teams that likely need reliability more than flexibility.

So the core question is not “Can we replace REST with GraphQL?” It is: **What concrete technician or sync failure does REST currently cause?**

If there is no measured pain around over-fetching, under-fetching, slow route downloads, or API evolution blocking mobile releases, replacement is likely misaligned.

## L2 Contract impact

The current L2 contract is tightly aligned to the offline workflow:

- `GET /work-orders?date=today`
- `PATCH /work-orders/:id/status`
- `POST /work-orders/:id/photos`
- `POST /sync`
- mobile local SQLite cache
- mobile sync queue
- backend-owned conflict resolution

Replacing this with GraphQL would require rethinking more than routing:

1. **Route download contract**
   - Today’s jobs need to remain fast, predictable, and cacheable.
   - A GraphQL query must not make the “morning route download” less deterministic.

2. **Mutation and sync semantics**
   - Work-order status changes, photo uploads, signatures, checklist completion, and retry behavior need explicit offline-safe mutation semantics.
   - Generic GraphQL mutations could obscure ordering, idempotency, conflict handling, and retry behavior.

3. **`POST /sync` replacement risk**
   - The sync endpoint is probably the most purpose-critical API.
   - Replacing it with GraphQL should not happen unless GraphQL can preserve or improve batch sync, conflict resolution, idempotency keys, partial failure reporting, and resumability.

4. **Photo upload path**
   - `POST /work-orders/:id/photos` may still be better as REST or direct object-storage upload with metadata sync.
   - Forcing binary/photo workflows through GraphQL would be a poor fit.

## L1 Function impact

A full replacement would touch the most purpose-critical modules:

- **mobile sync-queue**: would need GraphQL-aware operation serialization, retries, idempotency, and offline mutation replay
- **work-order-cache**: would need mapping between GraphQL response shapes and stable SQLite tables
- **photo-uploader**: likely should remain separate from GraphQL or require a dedicated upload handshake
- **backend sync-controller**: would need to preserve backend-owned conflict resolution, batch sync, and deterministic merge behavior
- **tests**: Vitest and Playwright mobile flows would need expanded coverage for offline replay, poor connectivity, partial sync failure, route download speed, and conflict resolution regressions

This is not just an API facade change. It affects the offline data model and the reliability guarantees that FieldOps Lite is built around.

## Recommendation: Reframe, do not replace this quarter

I recommend **reframing** the initiative rather than planning a full REST replacement.

Smallest aligned alternative:

1. **Keep the existing REST sync-critical endpoints** for this quarter, especially:
   - `GET /work-orders?date=today`
   - `POST /sync`
   - photo upload endpoint

2. **Measure the actual mobile API pain first:**
   - route download payload size
   - time to load today’s jobs
   - number of round trips during morning download
   - sync failure/retry rates in poor connectivity
   - fields commonly over-fetched or under-fetched

3. **Improve existing REST contracts where the data shows pain:**
   - add field selection or compact route payloads
   - add purpose-built batch endpoints
   - improve sync diffing
   - add better idempotency and partial failure responses

4. **Consider a narrow GraphQL layer only if there is proven need**, for example:
   - read-only admin/reporting queries
   - non-critical office dashboard flexibility
   - experimental mobile read query for route details, behind a feature flag

I would not replace the core offline/sync REST API with GraphQL unless there is a demonstrated failure in the current API that directly threatens the L4 metrics.

## If the CTO still wants a plan

The right first milestone is not “implement GraphQL.” It is:

**Milestone 1: Offline API fit study**

Deliverables:

- document current REST endpoint performance against the 2-second route-load target
- identify over-fetching/under-fetching examples from mobile clients
- map current sync queue operations to required API semantics
- define non-negotiable sync guarantees: idempotency, ordering, conflict resolution, resumability, partial failure handling
- decide whether GraphQL solves a measured problem better than targeted REST improvements

Only after that should the team decide whether to proceed with GraphQL, and even then I would start with a narrow additive layer rather than a full replacement.
