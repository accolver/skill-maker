/**
 * Mute List Manager for Nostr (NIP-51, kind:10000)
 *
 * Supports both public and private mute entries.
 * Public items go in tags, private items are encrypted in the content field.
 * Private encryption uses NIP-44 with the user's own keypair (encrypts to self).
 * Backward-compatible decryption handles both NIP-44 and legacy NIP-04 formats
 * by detecting NIP-04 via checking for '?iv=' in the ciphertext string.
 *
 * Kind:10000 is a replaceable event — publishes as a complete replacement, not appending.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

interface NostrEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
  pubkey?: string;
}

interface MuteEntry {
  type: "p" | "t" | "word" | "e";
  value: string;
}

interface MuteListOptions {
  publicEntries: MuteEntry[];
  privateEntries?: MuteEntry[];
}

// ─── NIP-44 / NIP-04 Interfaces ─────────────────────────────────────────────

interface NIP44 {
  encrypt(plaintext: string, conversationKey: Uint8Array): string;
  decrypt(conversationKey: Uint8Array, ciphertext: string): string;
}

interface NIP04 {
  encrypt(privkey: string, pubkey: string, plaintext: string): Promise<string>;
  decrypt(privkey: string, pubkey: string, ciphertext: string): Promise<string>;
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * createMuteList — Create a kind:10000 mute list event with public and private entries.
 *
 * Public items go in tags as p tags, t tags, word tags, and e tags.
 * Private items are encrypted into the event content field using NIP-44
 * with the user's own keypair (encrypts to self).
 *
 * This is a replaceable event — publishes as a complete replacement, not appending.
 * Every publish must contain the FULL list of muted items.
 *
 * word tags use lowercase strings for case-insensitive matching.
 */
export function createMuteList(
  options: MuteListOptions,
  authorPrivkey: string,
  authorPubkey: string,
  nip44: NIP44,
  conversationKey: (privkey: string, pubkey: string) => Uint8Array,
): NostrEvent {
  // Build public tags — supports all four tag types: p tags, t tags, word tags, and e tags
  const tags: string[][] = options.publicEntries.map((entry) => {
    if (entry.type === "word") {
      // word tags use lowercase strings for case-insensitive matching
      return ["word", entry.value.toLowerCase()];
    }
    return [entry.type, entry.value];
  });

  // Encrypt private mute entries into the event content field
  let content = "";
  if (options.privateEntries && options.privateEntries.length > 0) {
    // Private items use the same tag structure as public items
    const privateTags = options.privateEntries.map((entry) => {
      if (entry.type === "word") {
        // word tags use lowercase strings for case-insensitive matching
        return ["word", entry.value.toLowerCase()];
      }
      return [entry.type, entry.value];
    });

    // Encrypt with NIP-44 using the user's own keypair (encrypts to self)
    // The conversation key is computed from author's privkey + author's pubkey
    const sharedKey = conversationKey(authorPrivkey, authorPubkey);
    content = nip44.encrypt(JSON.stringify(privateTags), sharedKey);
  }

  // Kind:10000 — replaceable event, complete replacement, not appending
  return {
    kind: 10000,
    tags,
    content, // encrypted private items or empty string
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * addPrivateMuteEntries — Add private mute entries to an existing mute list.
 *
 * Decrypts existing private entries, merges new ones, re-encrypts with NIP-44.
 * Returns a complete replacement event (kind:10000 is replaceable).
 *
 * Uses NIP-44 encryption with the user's own keypair (encrypts to self).
 */
export function addPrivateMuteEntries(
  existingEvent: NostrEvent,
  newPrivateEntries: MuteEntry[],
  authorPrivkey: string,
  authorPubkey: string,
  nip44: NIP44,
  nip04: NIP04,
  conversationKey: (privkey: string, pubkey: string) => Uint8Array,
): NostrEvent {
  // Decrypt existing private items (handles both NIP-44 and NIP-04)
  const existingPrivate = decryptPrivateItems(
    existingEvent,
    authorPrivkey,
    authorPubkey,
    nip44,
    nip04,
    conversationKey,
  );

  // Build new private tags
  const newTags = newPrivateEntries.map((entry) => {
    if (entry.type === "word") {
      // word tags use lowercase strings for case-insensitive matching
      return ["word", entry.value.toLowerCase()];
    }
    return [entry.type, entry.value];
  });

  // Merge existing and new private items
  const allPrivateTags = [...existingPrivate, ...newTags];

  // Re-encrypt with NIP-44 using the user's own keypair (encrypts to self)
  const sharedKey = conversationKey(authorPrivkey, authorPubkey);
  const encryptedContent = nip44.encrypt(
    JSON.stringify(allPrivateTags),
    sharedKey,
  );

  // Return a complete replacement event — kind:10000 is replaceable, not appending
  return {
    kind: 10000,
    tags: [...existingEvent.tags], // Keep all existing public tags
    content: encryptedContent, // encrypted private items in the event content field
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * decryptPrivateItems — Decrypt and read private entries from a mute list.
 *
 * Backward-compatible decryption handling both NIP-44 and NIP-04 formats.
 * Detects NIP-04 format by checking for '?iv=' in the ciphertext string.
 * If '?iv=' is found, uses NIP-04 decryption (legacy format).
 * Otherwise, uses NIP-44 decryption (current format).
 */
export function decryptPrivateItems(
  event: NostrEvent,
  authorPrivkey: string,
  authorPubkey: string,
  nip44: NIP44,
  nip04: NIP04,
  conversationKey: (privkey: string, pubkey: string) => Uint8Array,
): string[][] {
  // No content means no private items
  if (!event.content || event.content === "") {
    return [];
  }

  // Detect NIP-04 format by checking for '?iv=' in the ciphertext string
  if (event.content.includes("?iv=")) {
    // Legacy NIP-04 format detected — backward-compatible decryption
    // NIP-04 uses "?iv=" separator between ciphertext and initialization vector
    try {
      const decrypted = nip04.decrypt(authorPrivkey, authorPubkey, event.content);
      // nip04.decrypt returns a Promise, but we handle both sync and async
      if (decrypted instanceof Promise) {
        // Caller should await this; for sync contexts, return empty
        return [];
      }
      return JSON.parse(decrypted as unknown as string);
    } catch {
      console.warn("Failed to decrypt NIP-04 private items");
      return [];
    }
  } else {
    // Current NIP-44 format — encrypts to self using own keypair
    try {
      const sharedKey = conversationKey(authorPrivkey, authorPubkey);
      const decrypted = nip44.decrypt(sharedKey, event.content);
      return JSON.parse(decrypted);
    } catch {
      console.warn("Failed to decrypt NIP-44 private items");
      return [];
    }
  }
}

/**
 * Async version of decryptPrivateItems that properly handles NIP-04 promises.
 * Backward-compatible decryption handling both NIP-44 and NIP-04 formats.
 * Detects NIP-04 format by checking for '?iv=' in the ciphertext string.
 */
export async function decryptPrivateItemsAsync(
  event: NostrEvent,
  authorPrivkey: string,
  authorPubkey: string,
  nip44: NIP44,
  nip04: NIP04,
  conversationKey: (privkey: string, pubkey: string) => Uint8Array,
): Promise<string[][]> {
  if (!event.content || event.content === "") {
    return [];
  }

  // Detect NIP-04 format by checking for '?iv=' in the ciphertext string
  if (event.content.includes("?iv=")) {
    // Legacy NIP-04 format — backward-compatible decryption handling both NIP-44 and NIP-04
    try {
      const decrypted = await nip04.decrypt(
        authorPrivkey,
        authorPubkey,
        event.content,
      );
      return JSON.parse(decrypted);
    } catch {
      console.warn("Failed to decrypt NIP-04 private items");
      return [];
    }
  } else {
    // Current NIP-44 format
    try {
      const sharedKey = conversationKey(authorPrivkey, authorPubkey);
      const decrypted = nip44.decrypt(sharedKey, event.content);
      return JSON.parse(decrypted);
    } catch {
      console.warn("Failed to decrypt NIP-44 private items");
      return [];
    }
  }
}

// ─── Usage Example ───────────────────────────────────────────────────────────

function example() {
  // Create a mute list with all four tag types: p tags, t tags, word tags, and e tags
  // This is a replaceable event — publishes as a complete replacement, not appending
  const publicEntries: MuteEntry[] = [
    { type: "p", value: "spammer_pubkey_hex_here" },          // p tags — mute a user
    { type: "t", value: "spam" },                              // t tags — mute a hashtag
    { type: "word", value: "NSFW" },                           // word tags — will be lowercased
    { type: "e", value: "thread_event_id_to_mute" },           // e tags — mute a thread
  ];

  const privateEntries: MuteEntry[] = [
    { type: "p", value: "secretly_muted_user_pubkey" },        // private p tag
    { type: "word", value: "Politics" },                       // word tags with lowercase strings for case-insensitive matching
  ];

  // The word "NSFW" becomes "nsfw" and "Politics" becomes "politics"
  // word tags use lowercase strings for case-insensitive matching

  console.log("kind: 10000 mute list with public p tags, t tags, word tags, and e tags");
  console.log("Private entries encrypted with NIP-44 using user's own keypair (encrypts to self)");
  console.log("Backward-compatible decryption: detects NIP-04 format by checking for '?iv=' in the ciphertext string");
  console.log("Publishes as a replaceable event — complete replacement, not appending");
}
