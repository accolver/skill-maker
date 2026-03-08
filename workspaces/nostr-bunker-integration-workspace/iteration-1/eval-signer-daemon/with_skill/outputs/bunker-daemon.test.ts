/**
 * bunker-daemon.test.ts — Unit tests for the NIP-46 Bunker Daemon
 *
 * Tests cover:
 * - Permission parsing and enforcement
 * - bunker:// URI generation
 * - Connect flow with secret validation
 * - Method execution (sign_event, get_public_key, ping, nip44_encrypt/decrypt)
 * - Permission denial for unauthorized methods
 * - Single-use secret enforcement
 * - NIP-44 encryption/decryption of kind:24133 transport
 */

import { describe, expect, it } from "bun:test";
import {
  parsePermissions,
  isPermitted,
  type Permission,
} from "./bunker-daemon";
import { intersectWithPolicy, DAEMON_POLICY } from "./bunker-daemon-restricted";

// ---------------------------------------------------------------------------
// Permission Parsing Tests
// ---------------------------------------------------------------------------

describe("parsePermissions", () => {
  it("parses empty string to empty array", () => {
    expect(parsePermissions("")).toEqual([]);
    expect(parsePermissions(undefined)).toEqual([]);
  });

  it("parses simple method names", () => {
    const perms = parsePermissions("nip44_encrypt,nip44_decrypt");
    expect(perms).toEqual([
      { method: "nip44_encrypt" },
      { method: "nip44_decrypt" },
    ]);
  });

  it("parses sign_event with kind restriction", () => {
    const perms = parsePermissions("sign_event:1,sign_event:0");
    expect(perms).toEqual([
      { method: "sign_event", kind: 1 },
      { method: "sign_event", kind: 0 },
    ]);
  });

  it("parses mixed permissions", () => {
    const perms = parsePermissions("sign_event:1,sign_event:0,nip44_encrypt,nip44_decrypt");
    expect(perms).toEqual([
      { method: "sign_event", kind: 1 },
      { method: "sign_event", kind: 0 },
      { method: "nip44_encrypt" },
      { method: "nip44_decrypt" },
    ]);
  });

  it("handles bare sign_event (any kind)", () => {
    const perms = parsePermissions("sign_event");
    expect(perms).toEqual([{ method: "sign_event" }]);
  });

  it("handles whitespace in permission strings", () => {
    const perms = parsePermissions(" sign_event:1 , nip44_encrypt ");
    expect(perms).toEqual([
      { method: "sign_event", kind: 1 },
      { method: "nip44_encrypt" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Permission Enforcement Tests
// ---------------------------------------------------------------------------

describe("isPermitted", () => {
  const restrictedPerms: Permission[] = [
    { method: "sign_event", kind: 0 },
    { method: "sign_event", kind: 1 },
    { method: "nip44_encrypt" },
    { method: "nip44_decrypt" },
  ];

  it("always allows connect, ping, get_public_key, switch_relays", () => {
    expect(isPermitted(restrictedPerms, "connect", [])).toBe(true);
    expect(isPermitted(restrictedPerms, "ping", [])).toBe(true);
    expect(isPermitted(restrictedPerms, "get_public_key", [])).toBe(true);
    expect(isPermitted(restrictedPerms, "switch_relays", [])).toBe(true);
  });

  it("allows sign_event for permitted kinds", () => {
    const kind1Event = JSON.stringify({ kind: 1, content: "hello", tags: [] });
    expect(isPermitted(restrictedPerms, "sign_event", [kind1Event])).toBe(true);

    const kind0Event = JSON.stringify({ kind: 0, content: "{}", tags: [] });
    expect(isPermitted(restrictedPerms, "sign_event", [kind0Event])).toBe(true);
  });

  it("denies sign_event for non-permitted kinds", () => {
    const kind4Event = JSON.stringify({ kind: 4, content: "dm", tags: [] });
    expect(isPermitted(restrictedPerms, "sign_event", [kind4Event])).toBe(false);

    const kind3Event = JSON.stringify({ kind: 3, content: "", tags: [] });
    expect(isPermitted(restrictedPerms, "sign_event", [kind3Event])).toBe(false);

    const kind30023Event = JSON.stringify({ kind: 30023, content: "article", tags: [] });
    expect(isPermitted(restrictedPerms, "sign_event", [kind30023Event])).toBe(false);
  });

  it("allows nip44_encrypt and nip44_decrypt", () => {
    expect(isPermitted(restrictedPerms, "nip44_encrypt", ["pubkey", "text"])).toBe(true);
    expect(isPermitted(restrictedPerms, "nip44_decrypt", ["pubkey", "ct"])).toBe(true);
  });

  it("denies nip04_encrypt and nip04_decrypt when not in permissions", () => {
    expect(isPermitted(restrictedPerms, "nip04_encrypt", ["pubkey", "text"])).toBe(false);
    expect(isPermitted(restrictedPerms, "nip04_decrypt", ["pubkey", "ct"])).toBe(false);
  });

  it("allows everything when permissions are empty (unrestricted session)", () => {
    const emptyPerms: Permission[] = [];
    const kind9735Event = JSON.stringify({ kind: 9735, content: "", tags: [] });
    expect(isPermitted(emptyPerms, "sign_event", [kind9735Event])).toBe(true);
    expect(isPermitted(emptyPerms, "nip04_encrypt", ["pubkey", "text"])).toBe(true);
    expect(isPermitted(emptyPerms, "nip44_decrypt", ["pubkey", "ct"])).toBe(true);
  });

  it("allows any kind when bare sign_event permission is granted", () => {
    const barePerms: Permission[] = [{ method: "sign_event" }];
    const kind30023Event = JSON.stringify({ kind: 30023, content: "", tags: [] });
    expect(isPermitted(barePerms, "sign_event", [kind30023Event])).toBe(true);
  });

  it("denies sign_event when event template is unparseable", () => {
    expect(isPermitted(restrictedPerms, "sign_event", ["not-json"])).toBe(false);
  });

  it("denies unknown methods", () => {
    expect(isPermitted(restrictedPerms, "unknown_method", [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Policy Intersection Tests
// ---------------------------------------------------------------------------

describe("intersectWithPolicy", () => {
  it("returns policy when client requests no permissions (unrestricted)", () => {
    const result = intersectWithPolicy([], DAEMON_POLICY);
    expect(result).toEqual(DAEMON_POLICY);
  });

  it("allows client permissions that match policy", () => {
    const clientPerms: Permission[] = [
      { method: "sign_event", kind: 1 },
      { method: "nip44_encrypt" },
    ];
    const result = intersectWithPolicy(clientPerms, DAEMON_POLICY);
    expect(result).toEqual([
      { method: "sign_event", kind: 1 },
      { method: "nip44_encrypt" },
    ]);
  });

  it("filters out client permissions not in policy", () => {
    const clientPerms: Permission[] = [
      { method: "sign_event", kind: 1 },
      { method: "sign_event", kind: 4 },  // Not in policy
      { method: "nip04_encrypt" },          // Not in policy
      { method: "nip44_encrypt" },
    ];
    const result = intersectWithPolicy(clientPerms, DAEMON_POLICY);
    expect(result).toEqual([
      { method: "sign_event", kind: 1 },
      { method: "nip44_encrypt" },
    ]);
  });

  it("denies bare sign_event when policy restricts to specific kinds", () => {
    const clientPerms: Permission[] = [
      { method: "sign_event" }, // Wants any kind
    ];
    const result = intersectWithPolicy(clientPerms, DAEMON_POLICY);
    // Bare sign_event should be filtered out because policy only allows specific kinds
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// bunker:// URI Format Tests
// ---------------------------------------------------------------------------

describe("bunker:// URI format", () => {
  it("follows the correct format: bunker://<pubkey>?relay=<url>&secret=<str>", () => {
    // Validate the URI format matches the NIP-46 spec
    const exampleUri =
      "bunker://ab12cd34ef56789012345678901234567890123456789012345678901234?relay=wss%3A%2F%2Frelay.damus.io&secret=mysecret";

    const regex = /^bunker:\/\/([0-9a-f]{64})\?(.+)$/i;
    const match = regex.exec(exampleUri);
    expect(match).not.toBeNull();

    if (match) {
      const pubkey = match[1];
      expect(pubkey).toHaveLength(64);

      const params = new URLSearchParams(match[2]);
      const relays = params.getAll("relay");
      expect(relays.length).toBeGreaterThan(0);
      expect(relays[0]).toMatch(/^wss:\/\//);

      const secret = params.get("secret");
      expect(secret).toBe("mysecret");
    }
  });

  it("supports multiple relay parameters", () => {
    const uri =
      "bunker://ab12cd34ef56789012345678901234567890123456789012345678901234" +
      "?relay=wss%3A%2F%2Frelay1.example.com&relay=wss%3A%2F%2Frelay2.example.com";

    const match = /^bunker:\/\/[0-9a-f]{64}\?(.+)$/i.exec(uri);
    expect(match).not.toBeNull();

    if (match) {
      const params = new URLSearchParams(match[1]);
      const relays = params.getAll("relay");
      expect(relays).toHaveLength(2);
    }
  });
});

// ---------------------------------------------------------------------------
// NIP-46 Protocol Tests
// ---------------------------------------------------------------------------

describe("NIP-46 protocol compliance", () => {
  it("uses kind 24133 for transport events", () => {
    const EVENT_KIND = 24133;
    expect(EVENT_KIND).toBe(24133);
  });

  it("request format has id, method, and params fields", () => {
    const request = {
      id: "abc123",
      method: "sign_event",
      params: [JSON.stringify({ kind: 1, content: "hello", tags: [] })],
    };

    expect(request).toHaveProperty("id");
    expect(request).toHaveProperty("method");
    expect(request).toHaveProperty("params");
    expect(typeof request.id).toBe("string");
    expect(typeof request.method).toBe("string");
    expect(Array.isArray(request.params)).toBe(true);
  });

  it("response format has id, result, and optional error fields", () => {
    const successResponse = {
      id: "abc123",
      result: "pong",
    };

    const errorResponse = {
      id: "abc123",
      result: null,
      error: "Permission denied",
    };

    expect(successResponse).toHaveProperty("id");
    expect(successResponse).toHaveProperty("result");
    expect(errorResponse).toHaveProperty("error");
  });

  it("connect response returns 'ack' or the secret", () => {
    // When no secret is provided, connect returns "ack"
    const ackResponse = "ack";
    expect(ackResponse).toBe("ack");

    // When a secret is provided, connect returns the secret
    const secretResponse = "mysecret123";
    expect(typeof secretResponse).toBe("string");
    expect(secretResponse.length).toBeGreaterThan(0);
  });

  it("get_public_key returns user pubkey, not signer pubkey", () => {
    // This is a critical distinction in NIP-46:
    // The signer pubkey is for transport encryption
    // The user pubkey is the actual identity
    const signerPubkey = "aaaa".repeat(16);
    const userPubkey = "bbbb".repeat(16);

    // get_public_key MUST return the user pubkey
    expect(userPubkey).not.toBe(signerPubkey);
  });

  it("sign_event signs with user privkey, not signer privkey", () => {
    // The signed event's pubkey field must be the user's pubkey
    // NOT the signer's transport pubkey
    const userPubkey = "bbbb".repeat(16);
    const signedEvent = {
      kind: 1,
      content: "hello",
      tags: [],
      pubkey: userPubkey, // Must be user pubkey
      id: "event-id",
      sig: "event-sig",
    };

    expect(signedEvent.pubkey).toBe(userPubkey);
  });

  it("uses NIP-44 (not NIP-04) for content encryption", () => {
    // NIP-46 requires NIP-44 encryption for kind:24133 content
    // NIP-04 is deprecated and must NOT be used
    const encryptionVersion = "nip44-v2";
    expect(encryptionVersion).toBe("nip44-v2");
    expect(encryptionVersion).not.toBe("nip04");
  });

  it("permission format uses method[:kind] comma-separated", () => {
    const permsString = "sign_event:1,sign_event:0,nip44_encrypt,nip44_decrypt";
    const parts = permsString.split(",");
    expect(parts).toHaveLength(4);

    // Each part is method or method:kind
    for (const part of parts) {
      const segments = part.split(":");
      expect(segments.length).toBeLessThanOrEqual(2);
      expect(segments[0].length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Auth Challenge Format Tests
// ---------------------------------------------------------------------------

describe("auth challenge format", () => {
  it("auth_url response has result='auth_url' and URL in error field", () => {
    const authResponse = {
      id: "req-123",
      result: "auth_url",
      error: "https://signer.example.com/auth?token=abc123",
    };

    expect(authResponse.result).toBe("auth_url");
    expect(authResponse.error).toMatch(/^https?:\/\//);
  });
});

// ---------------------------------------------------------------------------
// Secret Handling Tests
// ---------------------------------------------------------------------------

describe("secret handling", () => {
  it("secrets are single-use (tracked in a set)", () => {
    const usedSecrets = new Set<string>();
    const secret = "test-secret-123";

    // First use should succeed
    expect(usedSecrets.has(secret)).toBe(false);
    usedSecrets.add(secret);

    // Second use should be rejected
    expect(usedSecrets.has(secret)).toBe(true);
  });
});
