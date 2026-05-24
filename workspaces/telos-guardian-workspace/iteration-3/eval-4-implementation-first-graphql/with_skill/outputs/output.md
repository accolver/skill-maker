## Summary

This is an architecture decision, not just an implementation-planning task: replacing FieldOps Lite’s REST API with GraphQL would change the L2 API/sync contract and L1 offline-sync modules. Based on the provided `telos/TELOS.md` and full specs, I would not draft a replacement plan yet; the current proposal should be **Reframed** unless a concrete offline/mobile problem proves REST is blocking the Telos.

## Decision / Approach

**Recommendation: Reframe.** “GraphQL is more flexible for mobile clients” is insufficient purpose pressure for FieldOps Lite, whose L4 purpose is reducing dispatch-to-completion time through reliable offline access in poor connectivity for teams without dedicated IT staff.

Telos fit:

- **L4 Purpose:** A full GraphQL replacement risks distracting from the actual success metrics: today’s jobs load in under 2 seconds, 95% offline completion, and 30% fewer dispatch calls. Flexibility is not itself a Telos-aligned outcome unless it measurably improves offline load/sync reliability.
- **L3 Experience:** Technician experience prioritizes offline reliability, simple screens, and fast tap targets over rich interactivity. GraphQL can add client/schema complexity that may not help the technician’s morning download, offline completion, photo/signature capture, or end-of-day sync.
- **L2 Contract:** The current contract is purpose-shaped: `GET /work-orders?date=today`, `PATCH /work-orders/:id/status`, `POST /work-orders/:id/photos`, and `POST /sync`, with local SQLite cache, sync queue, and backend-owned conflict resolution. Replacing this with GraphQL would require redefining sync semantics, upload flows, cache hydration, conflict ownership, and offline mutation replay.
- **L1 Function:** The affected modules are not just API handlers; they include `mobile sync-queue`, `work-order-cache`, `photo-uploader`, and `backend sync-controller`, plus Vitest and Playwright mobile offline flows. That is a high-risk migration for the core reliability path.

Smallest aligned alternative:

1. Keep the existing REST/sync contract as the source of truth this quarter.
2. First measure the pain: overfetch/underfetch, route load time, sync failure rate, payload size, or developer change velocity.
3. Improve the current endpoints if the issue is known: e.g. add sparse fieldsets, route-day bundled payloads, delta sync, compression, or versioned `/sync` improvements.
4. Consider a narrow GraphQL read-only facade only if there is a proven mobile/offline need and it does not replace `POST /sync`, photo upload, local SQLite cache, or backend conflict resolution.

## Artifacts

No implementation plan for a full REST-to-GraphQL replacement should be produced yet. Proposed decision record:

> FieldOps Lite will not replace its REST API with GraphQL this quarter based only on client flexibility. The team will preserve the existing offline-first REST/sync contracts and investigate targeted endpoint or sync improvements tied to load-time, offline-completion, and dispatch-call metrics.

## Validation

Checked against the provided full Telos framework context:

- `telos/TELOS.md`: mobile-first work-order tool for small field service teams.
- `telos/specs/L4-purpose/purpose.md`: offline-first, poor-connectivity, low-admin constraints and success metrics.
- `telos/specs/L3-experience/technician-day.md`: technician offline journey and principles.
- `telos/specs/L2-contract/work-orders-api.md`: REST endpoints, SQLite cache, sync queue, backend conflict resolution.
- `telos/specs/L1-function/sync-queue.md`: sync/cache/upload/backend modules and mobile tests.

Primary risks of a full replacement: regression in offline completion, added mobile cache complexity, unclear conflict-resolution semantics, harder photo/upload handling, migration burden, and operational complexity for low-admin customers.

## Next steps

1. Define the specific mobile/offline problem GraphQL is supposed to solve.
2. Benchmark current REST payload size, route load time, sync failures, and conflict cases.
3. Prefer targeted REST/sync improvements unless the evidence shows GraphQL directly advances the L4 success metrics.
