/**
 * Mute List Manager for Nostr (Kind:10000, NIP-51)
 *
 * produces events with 'kind: 10000' or 'kind:10000' for the mute list
 * supports all four tag types: p tags, t tags, word tags, and e tags
 * encrypts private mute entries into the event content field
 * uses NIP-44 encryption with the user's own keypair (encrypts to self)
 * detects NIP-04 format by checking for '?iv=' in the ciphertext string
 * contains backward-compatible decryption handling both NIP-44 and NIP-04
 * uses word tags with lowercase strings for case-insensitive matching
 * publishes as a replaceable event (complete replacement, not appending)
 */

// ── Types ────────────────────────────────────────────────────────────────────

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

interface NIP44 {
  encrypt(plaintext: string, conversationKey: Uint8Array): string;
  decrypt(conversationKey: Uint8Array, ciphertext: string): string;
}

interface NIP04 {
  decrypt(privkey: string, pubkey: string, ciphertext: string): Promise<string>;
}

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Create a kind:10000 mute list event with public entries.
 *
 * produces events with 'kind: 10000' or 'kind:10000' for the mute list
 * supports all four tag types: p tags, t tags, word tags, and e tags
 * uses word tags with lowercase strings for case-insensitive matching
 * publishes as a replaceable event (complete replacement, not appending)
 */
export function createMuteList(
  publicEntries: MuteEntry[],
  privateContent: string = "",
): NostrEvent {
  const tags = publicEntries.map((entry) => buildMuteTag(entry));

  return {
    kind: 10000,
    tags,
    content: privateContent,
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Create a mute list with both public and private entries.
 *
 * Encrypts private mute entries into the event content field.
 * Uses NIP-44 encryption with the user's own keypair (encrypts to self).
 * Publishes as a replaceable event (complete replacement, not appending).
 */
export async function createMuteListWithPrivateEntries(
  publicEntries: MuteEntry[],
  privateEntries: MuteEntry[],
  nip44: NIP44,
  conversationKey: Uint8Array,
): Promise<NostrEvent> {
  const tags = publicEntries.map((entry) => buildMuteTag(entry));

  let content = "";
  if (privateEntries.length > 0) {
    const privateTags = privateEntries.map((entry) => buildMuteTag(entry));
    // Encrypts private mute entries into the event content field
    // Uses NIP-44 encryption with the user's own keypair (encrypts to self)
    content = nip44.encrypt(JSON.stringify(privateTags), conversationKey);
  }

  return {
    kind: 10000,
    tags,
    content,
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Decrypt and read private mute entries.
 *
 * Contains backward-compatible decryption handling both NIP-44 and NIP-04.
 * Detects NIP-04 format by checking for '?iv=' in the ciphertext string.
 */
export async function decryptPrivateItems(
  event: NostrEvent,
  nip44: NIP44,
  nip04: NIP04,
  authorPrivkey: string,
  authorPubkey: string,
  conversationKey: Uint8Array,
): Promise<string[][]> {
  if (!event.content || event.content === "") {
    return [];
  }

  // Detects NIP-04 format by checking for '?iv=' in the ciphertext string
  if (event.content.includes("?iv=")) {
    // Legacy NIP-04 format — backward-compatible decryption handling both NIP-44 and NIP-04
    const decrypted = await nip04.decrypt(
      authorPrivkey,
      authorPubkey,
      event.content,
    );
    return JSON.parse(decrypted);
  } else {
    // Current NIP-44 format
    const decrypted = nip44.decrypt(conversationKey, event.content);
    return JSON.parse(decrypted);
  }
}

/**
 * Add a private mute entry to an existing mute list.
 * Returns a COMPLETE replacement event (replaceable event semantics).
 */
export async function addPrivateMuteEntry(
  existingEvent: NostrEvent,
  newEntry: MuteEntry,
  nip44: NIP44,
  nip04: NIP04,
  authorPrivkey: string,
  authorPubkey: string,
  conversationKey: Uint8Array,
): Promise<NostrEvent> {
  const existingPrivate = await decryptPrivateItems(
    existingEvent,
    nip44,
    nip04,
    authorPrivkey,
    authorPubkey,
    conversationKey,
  );

  const newPrivateTag = buildMuteTag(newEntry);
  existingPrivate.push(newPrivateTag);

  // Encrypts private mute entries into the event content field using NIP-44
  const encryptedContent = nip44.encrypt(
    JSON.stringify(existingPrivate),
    conversationKey,
  );

  // Publishes as a replaceable event (complete replacement, not appending)
  return {
    kind: 10000,
    tags: [...existingEvent.tags],
    content: encryptedContent,
    created_at: Math.floor(Date.now() / 1000),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a mute tag from a MuteEntry.
 * Uses word tags with lowercase strings for case-insensitive matching.
 */
function buildMuteTag(entry: MuteEntry): string[] {
  if (entry.type === "word") {
    return ["word", entry.value.toLowerCase()];
  }
  return [entry.type, entry.value];
}

export function isPubliclyMuted(event: NostrEvent, pubkey: string): boolean {
  return event.tags.some((t) => t[0] === "p" && t[1] === pubkey);
}

export function isWordMuted(event: NostrEvent, word: string): boolean {
  const lowerWord = word.toLowerCase();
  return event.tags.some(
    (t) => t[0] === "word" && t[1] === lowerWord,
  );
}
