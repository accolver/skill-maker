# TELOS Alignment Assessment: Real-Time Collaborative Editing

## Proposed Feature

Add real-time collaborative editing so multiple users can edit the same document
simultaneously, similar to Google Docs.

## Assessment

### L4 Purpose Alignment — MISALIGNED

NoteKeeper's stated purpose is:

> A fast, private, offline-first note-taking app for **individual** knowledge
> workers who **distrust cloud services**.

Real-time collaborative editing directly contradicts the core purpose at
multiple levels:

1. **"Individual knowledge workers"** — The project explicitly targets solo
   users. Collaboration is a multi-user feature that serves a fundamentally
   different audience. The beneficiaries are defined as individuals who value
   privacy and organizations that prohibit cloud tools — neither group is asking
   for real-time collaboration.

2. **"Distrust cloud services"** — Real-time collaboration inherently requires a
   network layer. For two users to edit the same document simultaneously, data
   must leave the device and traverse a network to reach the other user. This
   directly violates the constraint: **"Zero data leaves the device without
   explicit user action."** Even with peer-to-peer approaches (CRDTs over
   WebRTC), data still leaves the device, and the "real-time" requirement means
   it happens continuously and automatically — the opposite of "explicit user
   action."

3. **"Offline-first"** — The constraint says **"No cloud requirement — must work
   fully offline."** Real-time collaboration is, by definition, an online
   feature. You cannot collaboratively edit in real-time while offline. This is
   a logical impossibility, not an engineering challenge to solve.

4. **Success metrics conflict** — The success metrics are about launch speed (<
   1 second), data locality (zero data leaves device), and user trust (90% feel
   data is safe). Collaborative editing serves none of these metrics and
   actively undermines the second and third.

5. **"No user accounts — zero sign-up friction"** — Collaboration requires
   identity. You need to know who you're collaborating with, who made which
   edit, and how to establish a connection. This pushes toward user accounts or
   at minimum peer discovery, violating the no-accounts constraint.

**Verdict: The feature contradicts the project's reason for existing.**
NoteKeeper exists specifically because tools like Google Docs require cloud
connectivity, accounts, and data sharing. Adding Google Docs-style collaboration
would make NoteKeeper into the thing it was built to replace.

### L3 Experience Alignment — MISALIGNED

The defined experience principles are:

- **Speed over polish** — Collaboration adds significant complexity (conflict
  resolution, presence indicators, cursor tracking) that will slow down the app
  and the development process.
- **Privacy over convenience** — Collaboration is a convenience feature that
  directly trades away privacy. Data must be shared with collaborators.
- **Simplicity over features** — Real-time collaboration is one of the most
  complex features in software engineering (operational transforms or CRDTs,
  networking, conflict resolution, presence, permissions). It is the antithesis
  of simplicity.

The key user journeys are:

1. **Quick Capture** — "User opens app, types a note, closes app." This is a
   solo activity. Collaboration adds nothing to this journey and would
   complicate it (who owns the note? is it shared by default? do I need to be
   online?).
2. **Knowledge Retrieval** — "User searches notes, finds one, reads/edits it."
   Again, a solo activity. Collaboration would raise questions: am I searching
   shared notes too? Can someone else edit while I'm reading?

The feature introduces an entirely new journey ("User invites collaborator, both
edit simultaneously") that conflicts with the existing journeys rather than
complementing them.

**Verdict: The feature violates all three experience principles and conflicts
with both defined user journeys.**

### L2 Contract Alignment — MISALIGNED

Current interfaces and contracts:

- **Note CRUD API** — Would need to be extended with collaboration-specific
  operations (lock, merge, broadcast changes, resolve conflicts). This is not an
  extension; it's a fundamental redesign.
- **Local SQLite with FTS5** — A local database cannot support real-time
  multi-user editing. You'd need either a server-side database, a CRDT-based
  data structure, or a real-time sync layer (WebSocket server, signaling server
  for WebRTC). This is a new integration point in a project that explicitly has
  **"None — intentionally isolated"** as its integration points.
- **Data contracts** — The Note schema
  `{ id, title, body, created_at, updated_at, tags[] }` would need to expand
  significantly: version vectors, operation logs, author attribution,
  collaboration session state, peer connection metadata. The simple data model
  would roughly triple in complexity.

**Verdict: The feature requires new integration points in a project designed to
have none, and fundamentally changes the data architecture.**

### L1 Function Feasibility — IMPRACTICAL

Current architecture:

- **Electron app, vanilla JS, no framework** — Real-time collaboration typically
  requires sophisticated state management (CRDTs like Yjs or Automerge, or OT
  libraries). Implementing this in vanilla JS without a framework is possible
  but enormously complex.
- **Event-driven architecture, single-file modules** — The simplicity of the
  current architecture would be overwhelmed. You'd need to add: a networking
  module, a CRDT/OT engine, a presence system, a peer discovery mechanism,
  conflict resolution logic, and collaboration UI components. This roughly
  doubles the codebase complexity.
- **No existing networking code** — The app is intentionally isolated. There is
  no WebSocket, WebRTC, or any networking infrastructure to build on. Everything
  would be built from scratch.
- **Testing strategy** — Unit tests with Vitest and E2E with Playwright. Testing
  real-time collaboration requires multi-instance testing, network simulation,
  conflict scenario testing, and timing-sensitive assertions. This is a
  qualitative leap in testing complexity.

**Verdict: The feature would require introducing entirely new architectural
patterns (networking, CRDTs, peer discovery) into a codebase designed for
local-only operation. It's not an extension of the current architecture — it's a
replacement.**

## Recommendation: RECONSIDER

**This feature should not be built.** It is fundamentally misaligned with
NoteKeeper's purpose at every level of the telos hierarchy:

| Level         | Alignment   | Key Conflict                                                                                                   |
| ------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| L4 Purpose    | Misaligned  | Contradicts "private," "offline-first," "individual," "no cloud," "no accounts," and "zero data leaves device" |
| L3 Experience | Misaligned  | Violates all three experience principles (speed, privacy, simplicity) and conflicts with both user journeys    |
| L2 Contract   | Misaligned  | Requires new integration points in an intentionally isolated system; fundamentally changes data architecture   |
| L1 Function   | Impractical | Requires entirely new architectural patterns (networking, CRDTs) with no existing foundation to build on       |

### Why this matters

NoteKeeper's entire value proposition is that it is the **opposite** of Google
Docs. It's local, private, offline, fast, and simple. Adding Google Docs-style
collaboration doesn't enhance NoteKeeper — it transforms it into a different
product that competes with established tools (Google Docs, Notion, HackMD) on
their home turf, while abandoning the niche that makes NoteKeeper valuable.

### If collaboration is truly needed

If the user genuinely needs collaborative features, the right path is not to add
them to NoteKeeper. Instead, consider:

1. **Export/import** — Let users export notes as files and share them manually.
   This preserves the "explicit user action" constraint.
2. **Git-based sync** — Let users put their note database in a Git repo and use
   existing Git collaboration workflows. This is offline-compatible and
   user-controlled.
3. **A separate product** — If real-time collaboration is a genuine need, it
   deserves its own project with its own telos, not a bolt-on to a privacy-first
   local app.

Any of these alternatives would serve collaboration needs without destroying
NoteKeeper's core identity.
