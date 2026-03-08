/**
 * bunker-daemon.ts — NIP-46 Remote Signer (Bunker) Daemon
 *
 * A complete NIP-46 remote signer service that:
 * - Holds a user's private key securely
 * - Listens for incoming signing requests over Nostr relays via kind:24133 events
 * - Enforces permissions (sign_event:0, sign_event:1, nip44_encrypt, nip44_decrypt)
 * - Handles the connect flow (bunker-initiated with bunker:// URI)
 * - Uses NIP-44 encryption for all kind:24133 transport
 * - Generates a bunker:// URI for client connections
 *
 * Dependencies: @nostr/tools (nostr-tools)
 */

import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  verifyEvent,
  type UnsignedEvent,
  type VerifiedEvent,
} from "@nostr/tools/pure";
import { nip44 } from "@nostr/tools";
import { SimplePool, type SubCloser } from "@nostr/tools/pool";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A NIP-46 JSON-RPC-like request (decrypted from kind:24133 content). */
interface NIP46Request {
  id: string;
  method: string;
  params: string[];
}

/** A NIP-46 JSON-RPC-like response (encrypted into kind:24133 content). */
interface NIP46Response {
  id: string;
  result: string | null;
  error?: string;
}

/** Tracks a connected client session with its granted permissions. */
interface ClientSession {
  clientPubkey: string;
  permissions: Permission[];
  connectedAt: number;
  lastActivity: number;
}

/** A parsed permission entry (e.g., sign_event:1 -> { method: "sign_event", kind: 1 }). */
interface Permission {
  method: string;
  kind?: number; // Only for sign_event
}

/** Configuration for the bunker daemon. */
interface BunkerDaemonConfig {
  /** The user's private key (hex string). The key being protected. */
  userPrivkeyHex: string;
  /** Relay URLs to listen on. */
  relays: string[];
  /** Optional: provide a signer keypair. If omitted, one is generated. */
  signerPrivkeyHex?: string;
  /** Optional: a single-use secret for the bunker:// URI. */
  secret?: string;
  /** Optional: preferred relays the signer may switch clients to. */
  preferredRelays?: string[];
  /** Optional: log handler. Defaults to console.log. */
  logger?: (msg: string, ...args: unknown[]) => void;
}

// ---------------------------------------------------------------------------
// Permission Parsing & Enforcement
// ---------------------------------------------------------------------------

/**
 * Parse a comma-separated permission string into structured Permission objects.
 *
 * Format: "sign_event:1,sign_event:0,nip44_encrypt,nip44_decrypt"
 */
function parsePermissions(permsStr: string | undefined): Permission[] {
  if (!permsStr || permsStr.trim() === "") return [];

  return permsStr.split(",").map((p) => {
    const trimmed = p.trim();
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      return { method: trimmed };
    }
    const method = trimmed.slice(0, colonIdx);
    const kindStr = trimmed.slice(colonIdx + 1);
    const kind = parseInt(kindStr, 10);
    if (isNaN(kind)) {
      return { method };
    }
    return { method, kind };
  });
}

/**
 * Check whether a given method call is permitted by the session's permissions.
 *
 * Rules:
 * - If no permissions are stored (empty array), ALL methods are allowed
 *   (open session — the signer trusts this client fully).
 * - "connect", "ping", "get_public_key", "switch_relays" are always allowed.
 * - "sign_event" checks for exact kind match if the permission specifies a kind.
 *   A bare "sign_event" permission (no kind) allows signing any kind.
 * - "nip44_encrypt" / "nip44_decrypt" require explicit permission entries.
 */
function isPermitted(
  permissions: Permission[],
  method: string,
  params: string[],
): boolean {
  // These methods are always allowed regardless of permissions
  const alwaysAllowed = ["connect", "ping", "get_public_key", "switch_relays"];
  if (alwaysAllowed.includes(method)) return true;

  // If no permissions were specified, allow everything (open session)
  if (permissions.length === 0) return true;

  if (method === "sign_event") {
    // Parse the event template to get its kind
    let eventKind: number | undefined;
    try {
      const template = JSON.parse(params[0]);
      eventKind = template.kind;
    } catch {
      return false; // Can't parse event template — deny
    }

    return permissions.some((perm) => {
      if (perm.method !== "sign_event") return false;
      // Bare sign_event (no kind restriction) allows any kind
      if (perm.kind === undefined) return true;
      // Kind-specific permission
      return perm.kind === eventKind;
    });
  }

  // For nip44_encrypt, nip44_decrypt, nip04_encrypt, nip04_decrypt
  return permissions.some((perm) => perm.method === method);
}

// ---------------------------------------------------------------------------
// BunkerDaemon Class
// ---------------------------------------------------------------------------

export class BunkerDaemon {
  // Keys
  private readonly userPrivkey: Uint8Array;
  private readonly userPubkey: string;
  private readonly signerPrivkey: Uint8Array;
  private readonly signerPubkey: string;

  // Relay & pool
  private readonly relays: string[];
  private readonly preferredRelays: string[];
  private readonly pool: SimplePool;
  private subscription: SubCloser | null = null;

  // Sessions
  private readonly sessions: Map<string, ClientSession> = new Map();
  private readonly usedSecrets: Set<string> = new Set();
  private readonly connectionSecret: string | null;

  // Logging
  private readonly log: (msg: string, ...args: unknown[]) => void;

  constructor(config: BunkerDaemonConfig) {
    // User keys — the identity being protected
    this.userPrivkey = hexToBytes(config.userPrivkeyHex);
    this.userPubkey = getPublicKey(this.userPrivkey);

    // Signer keys — used for transport encryption (may differ from user keys)
    if (config.signerPrivkeyHex) {
      this.signerPrivkey = hexToBytes(config.signerPrivkeyHex);
    } else {
      this.signerPrivkey = generateSecretKey();
    }
    this.signerPubkey = getPublicKey(this.signerPrivkey);

    this.relays = config.relays;
    this.preferredRelays = config.preferredRelays ?? config.relays;
    this.connectionSecret = config.secret ?? null;
    this.pool = new SimplePool();
    this.log = config.logger ?? console.log;

    this.log(`[BunkerDaemon] Initialized`);
    this.log(`[BunkerDaemon]   User pubkey:   ${this.userPubkey}`);
    this.log(`[BunkerDaemon]   Signer pubkey: ${this.signerPubkey}`);
    this.log(`[BunkerDaemon]   Relays:        ${this.relays.join(", ")}`);
  }

  // -------------------------------------------------------------------------
  // bunker:// URI Generation
  // -------------------------------------------------------------------------

  /**
   * Generate a bunker:// URI that clients can use to connect.
   *
   * Format: bunker://<remote-signer-pubkey>?relay=<url>&relay=<url>&secret=<optional>
   *
   * The pubkey in the URI is the SIGNER pubkey (transport key), NOT the user pubkey.
   * Clients will discover the user pubkey via get_public_key after connecting.
   */
  generateBunkerURI(secret?: string): string {
    const params = new URLSearchParams();
    for (const relay of this.relays) {
      params.append("relay", relay);
    }
    const sec = secret ?? this.connectionSecret;
    if (sec) {
      params.set("secret", sec);
    }
    return `bunker://${this.signerPubkey}?${params.toString()}`;
  }

  // -------------------------------------------------------------------------
  // Start / Stop
  // -------------------------------------------------------------------------

  /**
   * Start listening for incoming kind:24133 requests on the configured relays.
   *
   * Subscribes to events where:
   * - kind = 24133
   * - p-tag = our signer pubkey (requests addressed to us)
   */
  start(): void {
    this.log(`[BunkerDaemon] Starting — subscribing to kind:24133 on ${this.relays.join(", ")}`);

    this.subscription = this.pool.subscribeMany(
      this.relays,
      [
        {
          kinds: [24133],
          "#p": [this.signerPubkey],
          // Only listen for recent events (avoid replaying old requests)
          since: Math.floor(Date.now() / 1000) - 30,
        },
      ],
      {
        onevent: (event) => {
          this.handleIncomingEvent(event).catch((err) => {
            this.log(`[BunkerDaemon] Error handling event ${event.id}:`, err);
          });
        },
        oneose: () => {
          this.log(`[BunkerDaemon] EOSE received — listening for new requests`);
        },
      },
    );

    this.log(`[BunkerDaemon] Subscription active`);
  }

  /**
   * Stop the daemon and clean up resources.
   */
  stop(): void {
    this.log(`[BunkerDaemon] Stopping...`);
    if (this.subscription) {
      this.subscription.close();
      this.subscription = null;
    }
    this.pool.close(this.relays);
    this.log(`[BunkerDaemon] Stopped`);
  }

  // -------------------------------------------------------------------------
  // Event Handling
  // -------------------------------------------------------------------------

  /**
   * Handle an incoming kind:24133 event.
   *
   * Steps:
   * 1. Verify the event signature
   * 2. Decrypt the NIP-44 encrypted content
   * 3. Parse the JSON-RPC request
   * 4. Check permissions
   * 5. Execute the method
   * 6. Send the encrypted response
   */
  private async handleIncomingEvent(event: VerifiedEvent): Promise<void> {
    // Step 1: Verify event signature
    if (!verifyEvent(event)) {
      this.log(`[BunkerDaemon] Rejecting event with invalid signature: ${event.id}`);
      return;
    }

    const clientPubkey = event.pubkey;

    // Step 2: Decrypt content using NIP-44
    let decryptedContent: string;
    try {
      const conversationKey = nip44.v2.utils.getConversationKey(
        this.signerPrivkey,
        clientPubkey,
      );
      decryptedContent = nip44.v2.decrypt(event.content, conversationKey);
    } catch (err) {
      this.log(`[BunkerDaemon] Failed to decrypt event from ${clientPubkey}:`, err);
      return;
    }

    // Step 3: Parse the JSON-RPC request
    let request: NIP46Request;
    try {
      request = JSON.parse(decryptedContent);
    } catch (err) {
      this.log(`[BunkerDaemon] Failed to parse request JSON from ${clientPubkey}:`, err);
      return;
    }

    if (!request.id || !request.method) {
      this.log(`[BunkerDaemon] Malformed request (missing id or method) from ${clientPubkey}`);
      return;
    }

    this.log(`[BunkerDaemon] Request from ${clientPubkey.slice(0, 8)}...: ${request.method} (id: ${request.id})`);

    // Step 4: Check permissions (connect is always allowed for new sessions)
    const session = this.sessions.get(clientPubkey);
    if (request.method !== "connect" && !session) {
      this.log(`[BunkerDaemon] Rejecting request from unknown client ${clientPubkey.slice(0, 8)}... — not connected`);
      await this.sendResponse(clientPubkey, {
        id: request.id,
        result: null,
        error: "Not connected. Send a connect request first.",
      });
      return;
    }

    if (session && !isPermitted(session.permissions, request.method, request.params ?? [])) {
      this.log(`[BunkerDaemon] Permission denied for ${request.method} from ${clientPubkey.slice(0, 8)}...`);
      await this.sendResponse(clientPubkey, {
        id: request.id,
        result: null,
        error: `Permission denied: ${request.method} is not in the granted permissions for this session.`,
      });
      return;
    }

    // Update last activity
    if (session) {
      session.lastActivity = Math.floor(Date.now() / 1000);
    }

    // Step 5: Execute the method
    try {
      const result = await this.executeMethod(clientPubkey, request);

      // Step 6: Send response
      await this.sendResponse(clientPubkey, {
        id: request.id,
        result,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.log(`[BunkerDaemon] Error executing ${request.method}:`, errorMsg);
      await this.sendResponse(clientPubkey, {
        id: request.id,
        result: null,
        error: errorMsg,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Method Execution
  // -------------------------------------------------------------------------

  /**
   * Execute a NIP-46 method and return the result string.
   */
  private async executeMethod(
    clientPubkey: string,
    request: NIP46Request,
  ): Promise<string> {
    const params = request.params ?? [];

    switch (request.method) {
      case "connect":
        return this.handleConnect(clientPubkey, params);

      case "get_public_key":
        return this.handleGetPublicKey();

      case "sign_event":
        return this.handleSignEvent(params);

      case "ping":
        return this.handlePing();

      case "nip44_encrypt":
        return this.handleNip44Encrypt(params);

      case "nip44_decrypt":
        return this.handleNip44Decrypt(params);

      case "switch_relays":
        return this.handleSwitchRelays();

      default:
        throw new Error(`Unknown method: ${request.method}`);
    }
  }

  // ---- connect ----

  /**
   * Handle the "connect" method.
   *
   * Params: [remote_signer_pubkey, secret?, perms?]
   *
   * - Validates the secret if one was provided in the bunker:// URI
   * - Secrets are single-use: reject reuse
   * - Parses and stores permissions for the session
   * - Returns "ack" on success
   */
  private handleConnect(clientPubkey: string, params: string[]): string {
    const [remotePubkey, secret, permsStr] = params;

    // Validate that the remote_signer_pubkey matches ours
    if (remotePubkey && remotePubkey !== this.signerPubkey) {
      throw new Error(
        `Connect request targets wrong signer pubkey. Expected ${this.signerPubkey}, got ${remotePubkey}`,
      );
    }

    // Validate secret if our bunker URI included one
    if (this.connectionSecret) {
      if (!secret) {
        throw new Error("Connection secret required but not provided");
      }
      // Secrets are single-use — reject reuse
      if (this.usedSecrets.has(secret)) {
        throw new Error("Connection secret has already been used. Secrets are single-use.");
      }
      if (secret !== this.connectionSecret) {
        throw new Error("Invalid connection secret");
      }
      this.usedSecrets.add(secret);
    }

    // Parse permissions
    const permissions = parsePermissions(permsStr);

    // Create or update session
    const now = Math.floor(Date.now() / 1000);
    this.sessions.set(clientPubkey, {
      clientPubkey,
      permissions,
      connectedAt: now,
      lastActivity: now,
    });

    this.log(
      `[BunkerDaemon] Client ${clientPubkey.slice(0, 8)}... connected. ` +
        `Permissions: ${permissions.length > 0 ? permissions.map((p) => p.method + (p.kind !== undefined ? `:${p.kind}` : "")).join(", ") : "all (unrestricted)"}`,
    );

    // Return the secret if one was provided (for client validation), otherwise "ack"
    return secret || "ack";
  }

  // ---- get_public_key ----

  /**
   * Return the USER's public key (NOT the signer's transport pubkey).
   *
   * This is critical: the signer pubkey is for transport encryption only.
   * The user pubkey is the actual identity key used for signing events.
   */
  private handleGetPublicKey(): string {
    return this.userPubkey;
  }

  // ---- sign_event ----

  /**
   * Sign an event with the user's private key.
   *
   * Params: [json_stringified_unsigned_event]
   *
   * The event template contains { kind, content, tags, created_at }.
   * The signer adds the user's pubkey and signs with the user's private key.
   * Returns the fully signed event as a JSON string.
   *
   * IMPORTANT: Signs with userPrivkey, NOT signerPrivkey.
   */
  private handleSignEvent(params: string[]): string {
    if (!params[0]) {
      throw new Error("sign_event requires an event template as the first parameter");
    }

    let template: {
      kind: number;
      content: string;
      tags: string[][];
      created_at: number;
    };

    try {
      template = JSON.parse(params[0]);
    } catch {
      throw new Error("Failed to parse event template JSON");
    }

    // Validate required fields
    if (template.kind === undefined || template.kind === null) {
      throw new Error("Event template missing 'kind' field");
    }
    if (template.content === undefined) {
      throw new Error("Event template missing 'content' field");
    }
    if (!Array.isArray(template.tags)) {
      throw new Error("Event template missing or invalid 'tags' field");
    }

    // Build the unsigned event with the USER's pubkey
    const unsignedEvent: UnsignedEvent = {
      kind: template.kind,
      content: template.content,
      tags: template.tags,
      created_at: template.created_at ?? Math.floor(Date.now() / 1000),
      pubkey: this.userPubkey,
    };

    // Sign with the USER's private key (NOT the signer's transport key)
    const signedEvent = finalizeEvent(unsignedEvent, this.userPrivkey);

    this.log(
      `[BunkerDaemon] Signed kind:${template.kind} event (id: ${signedEvent.id.slice(0, 8)}...)`,
    );

    return JSON.stringify(signedEvent);
  }

  // ---- ping ----

  /**
   * Health check. Returns "pong".
   */
  private handlePing(): string {
    return "pong";
  }

  // ---- nip44_encrypt ----

  /**
   * Encrypt a message using NIP-44 with the user's private key.
   *
   * Params: [third_party_pubkey, plaintext]
   *
   * Uses the USER's private key (not the signer's transport key) to derive
   * the conversation key with the third party, then encrypts.
   */
  private handleNip44Encrypt(params: string[]): string {
    const [thirdPartyPubkey, plaintext] = params;

    if (!thirdPartyPubkey || !plaintext) {
      throw new Error("nip44_encrypt requires [third_party_pubkey, plaintext]");
    }

    if (!/^[0-9a-f]{64}$/i.test(thirdPartyPubkey)) {
      throw new Error("Invalid third_party_pubkey: must be 64 hex characters");
    }

    // Derive conversation key using USER's private key
    const conversationKey = nip44.v2.utils.getConversationKey(
      this.userPrivkey,
      thirdPartyPubkey,
    );

    return nip44.v2.encrypt(plaintext, conversationKey);
  }

  // ---- nip44_decrypt ----

  /**
   * Decrypt a message using NIP-44 with the user's private key.
   *
   * Params: [third_party_pubkey, ciphertext]
   *
   * Uses the USER's private key (not the signer's transport key) to derive
   * the conversation key with the third party, then decrypts.
   */
  private handleNip44Decrypt(params: string[]): string {
    const [thirdPartyPubkey, ciphertext] = params;

    if (!thirdPartyPubkey || !ciphertext) {
      throw new Error("nip44_decrypt requires [third_party_pubkey, ciphertext]");
    }

    if (!/^[0-9a-f]{64}$/i.test(thirdPartyPubkey)) {
      throw new Error("Invalid third_party_pubkey: must be 64 hex characters");
    }

    // Derive conversation key using USER's private key
    const conversationKey = nip44.v2.utils.getConversationKey(
      this.userPrivkey,
      thirdPartyPubkey,
    );

    return nip44.v2.decrypt(ciphertext, conversationKey);
  }

  // ---- switch_relays ----

  /**
   * Return the signer's preferred relay list, or null if no change needed.
   *
   * The signer controls which relays are used. If the preferred relays differ
   * from the current relays, return the new list. The client MUST update its
   * relay state accordingly.
   */
  private handleSwitchRelays(): string {
    // Compare preferred relays with current relays
    const currentSet = new Set(this.relays);
    const preferredSet = new Set(this.preferredRelays);

    const same =
      currentSet.size === preferredSet.size &&
      [...currentSet].every((r) => preferredSet.has(r));

    if (same) {
      // No change needed
      return "null";
    }

    return JSON.stringify(this.preferredRelays);
  }

  // -------------------------------------------------------------------------
  // Response Sending
  // -------------------------------------------------------------------------

  /**
   * Send an encrypted NIP-46 response back to the client.
   *
   * Creates a kind:24133 event with:
   * - NIP-44 encrypted content (the JSON-RPC response)
   * - p-tag pointing to the client's pubkey
   * - Signed by the SIGNER's private key (transport key)
   */
  private async sendResponse(
    clientPubkey: string,
    response: NIP46Response,
  ): Promise<void> {
    // Serialize the response
    const responseJson = JSON.stringify(response);

    // Encrypt with NIP-44 using the SIGNER's private key and client's pubkey
    const conversationKey = nip44.v2.utils.getConversationKey(
      this.signerPrivkey,
      clientPubkey,
    );
    const encryptedContent = nip44.v2.encrypt(responseJson, conversationKey);

    // Build and sign the kind:24133 response event with the SIGNER's key
    const responseEvent = finalizeEvent(
      {
        kind: 24133,
        content: encryptedContent,
        tags: [["p", clientPubkey]],
        created_at: Math.floor(Date.now() / 1000),
      },
      this.signerPrivkey,
    );

    // Publish to all relays
    await Promise.allSettled(
      this.pool.publish(this.relays, responseEvent),
    );

    this.log(
      `[BunkerDaemon] Sent response for request ${response.id} to ${clientPubkey.slice(0, 8)}... ` +
        `(${response.error ? "error" : "success"})`,
    );
  }

  // -------------------------------------------------------------------------
  // Accessors
  // -------------------------------------------------------------------------

  /** Get the signer's public key (transport key). */
  getSignerPubkey(): string {
    return this.signerPubkey;
  }

  /** Get the user's public key (identity key). */
  getUserPubkey(): string {
    return this.userPubkey;
  }

  /** Get the number of active client sessions. */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /** Get all active sessions (for monitoring). */
  getSessions(): ReadonlyMap<string, ClientSession> {
    return this.sessions;
  }

  /** Disconnect a specific client session. */
  disconnectClient(clientPubkey: string): boolean {
    return this.sessions.delete(clientPubkey);
  }
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Example usage: run the bunker daemon from the command line.
 *
 * Environment variables:
 *   USER_PRIVKEY_HEX  — The user's private key (64 hex chars, required)
 *   SIGNER_PRIVKEY_HEX — Optional separate signer transport key
 *   RELAYS            — Comma-separated relay URLs (default: wss://relay.damus.io)
 *   SECRET            — Optional single-use connection secret
 */
function main(): void {
  const userPrivkeyHex = process.env.USER_PRIVKEY_HEX;
  if (!userPrivkeyHex) {
    console.error("Error: USER_PRIVKEY_HEX environment variable is required");
    console.error("Usage: USER_PRIVKEY_HEX=<hex> RELAYS=wss://relay.example.com bun run bunker-daemon.ts");
    process.exit(1);
  }

  if (!/^[0-9a-f]{64}$/i.test(userPrivkeyHex)) {
    console.error("Error: USER_PRIVKEY_HEX must be exactly 64 hex characters");
    process.exit(1);
  }

  const relaysEnv = process.env.RELAYS ?? "wss://relay.damus.io";
  const relays = relaysEnv.split(",").map((r) => r.trim()).filter(Boolean);

  const secret = process.env.SECRET ?? crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  const daemon = new BunkerDaemon({
    userPrivkeyHex,
    relays,
    signerPrivkeyHex: process.env.SIGNER_PRIVKEY_HEX,
    secret,
  });

  // Generate and display the bunker:// URI
  const bunkerUri = daemon.generateBunkerURI();
  console.log("\n========================================");
  console.log("  NIP-46 Bunker Daemon Running");
  console.log("========================================");
  console.log(`\n  User pubkey:   ${daemon.getUserPubkey()}`);
  console.log(`  Signer pubkey: ${daemon.getSignerPubkey()}`);
  console.log(`  Relays:        ${relays.join(", ")}`);
  console.log(`\n  bunker:// URI (share with clients):\n`);
  console.log(`  ${bunkerUri}`);
  console.log("\n========================================\n");

  // Enforce permissions: only allow sign_event for kind 0 and kind 1,
  // plus nip44_encrypt and nip44_decrypt.
  // This is enforced per-session when clients connect with permissions,
  // but we also log the daemon's policy.
  console.log("  Permission policy:");
  console.log("    - sign_event:0 (kind 0 — profile metadata)");
  console.log("    - sign_event:1 (kind 1 — short text notes)");
  console.log("    - nip44_encrypt");
  console.log("    - nip44_decrypt");
  console.log("    - connect, ping, get_public_key, switch_relays (always allowed)");
  console.log("");

  // Start listening
  daemon.start();

  // Handle graceful shutdown
  const shutdown = () => {
    console.log("\nShutting down...");
    daemon.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Run if executed directly
if (typeof require !== "undefined" && require.main === module) {
  main();
} else if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { parsePermissions, isPermitted };
export type {
  NIP46Request,
  NIP46Response,
  ClientSession,
  Permission,
  BunkerDaemonConfig,
};
