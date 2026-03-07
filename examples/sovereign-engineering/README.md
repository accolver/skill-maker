# Sovereign Engineering

Skills for building decentralized protocol applications, focusing on user
sovereignty, censorship resistance, and peer-to-peer communication.

## Categories

### Nostr Protocol

11 skills covering the complete Nostr protocol ecosystem. See
[nostr/README.md](nostr/README.md) for detailed evaluation reports.

| Skill                     | Delta  | Description                                                 |
| ------------------------- | ------ | ----------------------------------------------------------- |
| nostr-event-builder       | +58.3% | Constructs correct Nostr events with kind-specific tags     |
| nostr-nip-advisor         | 0%*    | Identifies applicable NIPs and warns about deprecations     |
| nostr-relay-builder       | +4.2%  | Builds relays with WebSocket handling and NIP-01 validation |
| nostr-filter-designer     | +45.2% | Constructs correct REQ filters with AND/OR semantics        |
| nostr-crypto-guide        | +95.8% | Guides NIP-44/NIP-59/NIP-49 cryptographic implementations   |
| nostr-nip05-setup         | +16.7% | Sets up NIP-05 DNS-based identity verification              |
| nostr-client-patterns     | +100%  | Implements client architecture with relay pool management   |
| nostr-social-graph        | +100%  | Builds social graphs with follow lists and outbox model     |
| nostr-zap-integration     | +8.3%  | Implements Lightning Zaps and Nutzaps                       |
| nostr-marketplace-builder | +75.0% | Builds marketplace apps with NIP-15/NIP-69                  |
| nostr-dvms                | +100%  | Builds Data Vending Machine services with NIP-90            |

_*Grader heuristic limitation -- see [nostr/README.md](nostr/README.md) for
details._

**Average delta: +54.7%** across Nostr skills.

## Key Insight

Protocol-specific knowledge is where skills provide the most value. Agents know
Nostr concepts broadly but consistently miss exact event kind numbers, correct
tag structures, proper encryption parameters, and protocol edge cases. Four
skills achieved +95% or higher delta.
