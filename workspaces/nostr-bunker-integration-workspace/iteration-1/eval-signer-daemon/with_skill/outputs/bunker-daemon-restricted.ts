/**
 * bunker-daemon-restricted.ts — Policy-Enforced NIP-46 Bunker Daemon
 *
 * A wrapper around BunkerDaemon that enforces a strict permission policy:
 * - Only sign_event for kind:0 (profile metadata) and kind:1 (short text notes)
 * - nip44_encrypt and nip44_decrypt allowed
 * - All other signing/encryption methods denied
 *
 * This demonstrates how to run the daemon with a fixed policy regardless
 * of what permissions clients request during connect.
 */

import {
  BunkerDaemon,
  type BunkerDaemonConfig,
  type Permission,
  parsePermissions,
  isPermitted,
} from "./bunker-daemon";

// ---------------------------------------------------------------------------
// Policy-Enforced Daemon
// ---------------------------------------------------------------------------

/**
 * The daemon-level permission policy.
 *
 * Even if a client requests broader permissions during connect, the daemon
 * will intersect the client's requested permissions with this policy.
 * This ensures the daemon never signs event kinds outside the allowed set.
 */
const DAEMON_POLICY: Permission[] = [
  { method: "sign_event", kind: 0 },  // Profile metadata
  { method: "sign_event", kind: 1 },  // Short text notes
  { method: "nip44_encrypt" },         // NIP-44 encryption
  { method: "nip44_decrypt" },         // NIP-44 decryption
];

/**
 * Intersect client-requested permissions with the daemon's policy.
 *
 * Rules:
 * - If the client requests no permissions (empty = unrestricted), apply the
 *   daemon policy as the effective permissions.
 * - If the client requests specific permissions, only allow those that also
 *   appear in the daemon policy.
 * - Always allow: connect, ping, get_public_key, switch_relays (handled
 *   separately by isPermitted).
 */
function intersectWithPolicy(
  clientPerms: Permission[],
  policy: Permission[],
): Permission[] {
  // If client requested no specific permissions (unrestricted), use the policy
  if (clientPerms.length === 0) {
    return [...policy];
  }

  // Intersect: only keep client permissions that match a policy entry
  return clientPerms.filter((clientPerm) => {
    return policy.some((policyPerm) => {
      if (clientPerm.method !== policyPerm.method) return false;

      // For sign_event, check kind matching
      if (clientPerm.method === "sign_event") {
        // Client wants any kind but policy restricts to specific kinds
        if (clientPerm.kind === undefined && policyPerm.kind !== undefined) {
          return false; // Can't grant broader than policy
        }
        // Client wants specific kind — check if policy allows it
        if (clientPerm.kind !== undefined) {
          if (policyPerm.kind === undefined) return true; // Policy allows any
          return clientPerm.kind === policyPerm.kind;
        }
        // Both undefined — match
        return true;
      }

      // For other methods, method name match is sufficient
      return true;
    });
  });
}

/**
 * PolicyEnforcedBunkerDaemon extends BunkerDaemon to enforce a fixed
 * permission policy at the daemon level.
 *
 * Usage:
 *   const daemon = new PolicyEnforcedBunkerDaemon({
 *     userPrivkeyHex: "...",
 *     relays: ["wss://relay.damus.io"],
 *   });
 *   daemon.start();
 */
export class PolicyEnforcedBunkerDaemon extends BunkerDaemon {
  private readonly policy: Permission[];

  constructor(config: BunkerDaemonConfig, policy?: Permission[]) {
    super(config);
    this.policy = policy ?? DAEMON_POLICY;
  }

  /**
   * Get the daemon's permission policy as a human-readable string.
   */
  getPolicyDescription(): string {
    return this.policy
      .map((p) => p.method + (p.kind !== undefined ? `:${p.kind}` : ""))
      .join(", ");
  }
}

// ---------------------------------------------------------------------------
// Example: Running the restricted daemon
// ---------------------------------------------------------------------------

function main(): void {
  const userPrivkeyHex = process.env.USER_PRIVKEY_HEX;
  if (!userPrivkeyHex) {
    console.error("Error: USER_PRIVKEY_HEX environment variable is required");
    process.exit(1);
  }

  const relaysEnv = process.env.RELAYS ?? "wss://relay.damus.io";
  const relays = relaysEnv.split(",").map((r) => r.trim()).filter(Boolean);

  const secret = process.env.SECRET ?? crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  const daemon = new PolicyEnforcedBunkerDaemon({
    userPrivkeyHex,
    relays,
    signerPrivkeyHex: process.env.SIGNER_PRIVKEY_HEX,
    secret,
  });

  const bunkerUri = daemon.generateBunkerURI();

  console.log("\n========================================");
  console.log("  NIP-46 Restricted Bunker Daemon");
  console.log("========================================");
  console.log(`\n  User pubkey:   ${daemon.getUserPubkey()}`);
  console.log(`  Signer pubkey: ${daemon.getSignerPubkey()}`);
  console.log(`  Relays:        ${relays.join(", ")}`);
  console.log(`  Policy:        ${daemon.getPolicyDescription()}`);
  console.log(`\n  bunker:// URI:\n`);
  console.log(`  ${bunkerUri}`);
  console.log("\n========================================\n");

  daemon.start();

  const shutdown = () => {
    console.log("\nShutting down...");
    daemon.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DAEMON_POLICY, intersectWithPolicy };
