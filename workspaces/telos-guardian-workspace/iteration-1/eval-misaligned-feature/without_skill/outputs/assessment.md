# Feature Assessment: Real-Time Collaborative Editing

## Proposed Feature

Add real-time collaborative editing to NoteKeeper, allowing multiple users to
edit the same document simultaneously (Google Docs-style).

## Assessment Summary

**Recommendation: DO NOT IMPLEMENT — This feature fundamentally conflicts with
the project's core identity and architectural foundations.**

---

## Detailed Analysis

### 1. Alignment with L4 (Purpose)

The L4 layer defines NoteKeeper's reason for existence:

> "A fast, private, offline-first note-taking app for **individual** knowledge
> workers who **distrust cloud services**."

Real-time collaborative editing conflicts with every key term in this purpose
statement:

| Purpose Element               | Collaborative Editing Impact                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **"individual"**              | Collaboration is inherently multi-user, contradicting the single-user design                                                         |
| **"distrust cloud services"** | Real-time sync requires network infrastructure (servers, WebSockets, or peer-to-peer discovery) — the exact thing users are avoiding |
| **"offline-first"**           | Collaboration requires being online; offline-first and real-time collaboration are architecturally opposed                           |
| **"private"**                 | Sharing documents with others means data leaves the device, violating the core privacy promise                                       |

**Key success metric violated:**

> "Zero data leaves the device without explicit user action"

Real-time collaboration requires continuous data transmission by design. Even
with end-to-end encryption, data must leave the device to reach collaborators.

**Constraint violated:**

> "No cloud requirement — must work fully offline"

Real-time collaboration cannot work fully offline. It requires at minimum a
signaling server for peer discovery, and practically requires a sync server for
operational transforms or CRDTs.

### 2. Alignment with L3 (Experience)

The experience principles are:

- **Speed over polish** — Collaboration adds significant complexity and latency
- **Privacy over convenience** — Collaboration trades privacy for convenience
- **Simplicity over features** — This is a major feature addition that increases
  complexity substantially

The defined user journeys are solo activities:

- "User opens app, types a note, closes app"
- "User searches their notes"

There are no multi-user journeys. The app is designed for one person.

**Beneficiaries:**

- Primary users are "individual knowledge workers who value privacy"
- Secondary users are "privacy-conscious organizations that prohibit cloud-based
  tools"

Both user groups would likely reject a feature that introduces network
communication.

### 3. Alignment with L2 (Contract)

The integration points section explicitly states:

> "None — intentionally isolated"

This is not an oversight — it's a deliberate architectural decision. Real-time
collaboration would require:

- WebSocket or WebRTC connections
- A signaling/relay server
- Conflict resolution protocol (OT or CRDT)
- User identity/presence system
- Network error handling and reconnection logic

This transforms the integration surface from "none" to "extensive."

The data contract (`Note: { id, title, body, created_at, updated_at, tags[] }`)
has no concept of:

- User identity or authorship
- Version vectors or logical clocks
- Collaboration metadata (cursors, selections, presence)

### 4. Alignment with L1 (Function)

The current architecture is:

- Electron app, vanilla JS, no framework
- SQLite local storage
- Single-file modules
- Event-driven architecture

Real-time collaboration would require:

- CRDT or OT library (e.g., Yjs, Automerge)
- Networking layer (WebSocket client/server or WebRTC)
- Presence/awareness protocol
- Conflict resolution engine
- Potentially a server component (contradicting the no-cloud constraint)

This would roughly double the codebase complexity and introduce entirely new
architectural concerns (distributed systems, eventual consistency, network
partitions).

### 5. Technical Feasibility Concerns

Even if we ignored the vision misalignment, the technical challenges are severe:

- **Offline-first + real-time sync** is an unsolved hard problem. CRDTs help but
  add significant complexity and storage overhead.
- **No user accounts** means no authentication, which means no way to identify
  collaborators or control access.
- **Local SQLite** would need to be supplemented or replaced with a CRDT-aware
  data store.
- **Peer-to-peer** approaches (to avoid cloud) require NAT traversal, which is
  unreliable and still needs STUN/TURN servers.

---

## What To Do Instead

If there's a genuine user need behind this request, consider these alternatives
that stay within NoteKeeper's vision:

### Alternative 1: Export/Import

Allow users to export notes as files and import others' notes. Data only moves
when the user explicitly acts. This preserves the "zero data leaves without
explicit action" principle.

### Alternative 2: Local Network Sharing (Optional)

An opt-in feature to share notes over the local network (LAN only, no internet).
This could use mDNS for discovery and direct TCP connections. It's still
offline-capable and keeps data off the internet, though it does expand the
scope.

### Alternative 3: Git-Based Sync (Optional)

Allow users to back up their notes to a git repository they control. This gives
version history and the ability to merge changes, while keeping the user in
control of where data goes.

---

## Conclusion

Real-time collaborative editing is not just a poor fit for NoteKeeper — it is
antithetical to the project's stated purpose. Implementing it would require
violating the core privacy promise, abandoning the offline-first architecture,
and fundamentally changing who the product is for.

The feature request should be declined. If collaboration needs are genuine, the
alternatives above offer paths that respect the project's identity.

**Verdict: REJECT — Conflicts with L4 Purpose, L3 Experience Principles, L2
Contracts, and L1 Architecture.**
