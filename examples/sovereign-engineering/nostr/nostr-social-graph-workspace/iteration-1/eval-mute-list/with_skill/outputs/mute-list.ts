/**
 * Mute List Manager for Nostr (NIP-51)
 *
 * Manages kind:10000 mute lists with both public and private entries.
 * Kind:10000 is a replaceable event — every publish must contain the
 * COMPLETE list (public tags + encrypted private content).
 *
 * Public items: stored in tags
 * Private items: encrypted with NIP-44 and stored in content
 *
 * Supported tag types:
 * - p: mute a pubkey
 * - t: mute a hashtag
 * - word: mute a word/phrase (always lowercase for case-insensitive matching)
 * - e: mute a thread (event ID)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NostrEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
}

interface MuteEntry {
  type: "p" | "t" | "word" | "e";
  value: string;
}

interface MuteList {
  publicEntries: MuteEntry[];
  privateEntries: MuteEntry[];
}

// NIP-44 encryption interface
interface NIP44 {
  encrypt(plaintext: string, conversationKey: Uint8Array): string;
  decrypt(conversationKey: Uint8Array, ciphertext: string): string;
}

// NIP-04 decryption interface (legacy, for backward compat only)
interface NIP04 {
  decrypt(privkey: string, pubkey: string, ciphertext: string): Promise<string>;
}

// Conversation key derivation
type ConversationKeyFn = (privkey: string, pubkey: string) => Uint8Array;

// ---------------------------------------------------------------------------
// Create a mute list event
// ---------------------------------------------------------------------------

/**
 * Create a kind:10000 mute list event with public tags.
 *
 * Public mute entries are stored directly in the tags array.
 * Each entry uses the appropriate tag type:
 * - ["p", "<pubkey-hex>"] — mute a pubkey
 * - ["t", "<hashtag>"] — mute a hashtag
 * - ["word", "<lowercase-string>"] — mute a word/phrase
 * - ["e", "<event-id>"] — mute a thread
 *
 * Word tags use lowercase strings for case-insensitive matching.
 */
export function createMuteList(publicEntries: MuteEntry[]): NostrEvent {
  const tags: string[][] = publicEntries.map((entry) => {
    const value =
      entry.type === "word" ? entry.value.toLowerCase() : entry.value;
    return [entry.type, value];
  });

  return {
    kind: 10000,
    tags,
    content: "", // Empty when no private items
    created_at: Math.floor(Date.now() / 1000),
  };
}

// ---------------------------------------------------------------------------
// Add private mute entries (encrypted in content)
// ---------------------------------------------------------------------------

/**
 * Add private mute entries to a mute list event.
 * Private entries are encrypted using NIP-44 with the author's own key pair
 * (not a conversation partner's key — the author encrypts to themselves).
 *
 * The encrypted content contains a JSON array of tags in the same format
 * as public tags: [["p", "<hex>"], ["word", "<term>"], ...]
 *
 * This produces a COMPLETE replacement event with both public tags and
 * encrypted private content (replaceable event semantics).
 */
export function addPrivateEntries(
  currentEvent: NostrEvent,
  privateEntries: MuteEntry[],
  authorPrivkey: string,
  authorPubkey: string,
  nip44: NIP44,
  conversationKey: ConversationKeyFn,
): NostrEvent {
  // Convert private entries to tag format (same structure as public tags)
  const privateTags: string[][] = privateEntries.map((entry) => {
    const value =
      entry.type === "word" ? entry.value.toLowerCase() : entry.value;
    return [entry.type, value];
  });

  // Encrypt with NIP-44 using the author's own key pair
  // The shared key is derived from authorPrivkey + authorPubkey (encrypting to self)
  const sharedKey = conversationKey(authorPrivkey, authorPubkey);
  const encrypted = nip44.encrypt(JSON.stringify(privateTags), sharedKey);

  // Return a COMPLETE replacement event (replaceable event semantics)
  return {
    kind: 10000,
    tags: [...currentEvent.tags], // Preserve all public tags
    content: encrypted, // Private items encrypted in content
    created_at: Math.floor(Date.now() / 1000),
  };
}

// ---------------------------------------------------------------------------
// Decrypt and read private entries (NIP-44 + NIP-04 backward compat)
// ---------------------------------------------------------------------------

/**
 * Decrypt and read private mute entries from a mute list event.
 *
 * Handles both encryption formats:
 * - NIP-44 (current standard): modern encryption
 * - NIP-04 (legacy): detected by checking for "?iv=" in the ciphertext
 *
 * The detection works because NIP-04 uses AES-CBC and encodes the IV
 * as a query parameter separator "?iv=<base64>", while NIP-44 uses
 * a different binary format that never contains this string.
 */
export async function decryptPrivateEntries(
  event: NostrEvent,
  authorPrivkey: string,
  authorPubkey: string,
  nip44: NIP44,
  nip04: NIP04,
  conversationKey: ConversationKeyFn,
): Promise<MuteEntry[]> {
  // No private content
  if (!event.content || event.content === "") {
    return [];
  }

  let decryptedJson: string;

  // Detect NIP-04 vs NIP-44 by checking for "?iv=" in the ciphertext
  if (event.content.includes("?iv=")) {
    // Legacy NIP-04 format — "?iv=" is the separator between
    // the AES-CBC ciphertext and the initialization vector
    decryptedJson = await nip04.decrypt(
      authorPrivkey,
      authorPubkey,
      event.content,
    );
  } else {
    // Current NIP-44 format
    const sharedKey = conversationKey(authorPrivkey, authorPubkey);
    decryptedJson = nip44.decrypt(sharedKey, event.content);
  }

  // Parse the decrypted JSON array of tags
  const tags: string[][] = JSON.parse(decryptedJson);

  // Convert tags back to MuteEntry format
  return tags.map((tag) => ({
    type: tag[0] as MuteEntry["type"],
    value: tag[1],
  }));
}

// ---------------------------------------------------------------------------
// Full mute list builder (public + private)
// ---------------------------------------------------------------------------

/**
 * Create a complete kind:10000 mute list event with both public and private entries.
 * The mute list is published as a complete replacement event (replaceable event semantics).
 */
export function createFullMuteList(
  muteList: MuteList,
  authorPrivkey: string,
  authorPubkey: string,
  nip44: NIP44,
  conversationKey: ConversationKeyFn,
): NostrEvent {
  // Public tags — word tags use lowercase for case-insensitive matching
  const publicTags: string[][] = muteList.publicEntries.map((entry) => {
    const value =
      entry.type === "word" ? entry.value.toLowerCase() : entry.value;
    return [entry.type, value];
  });

  // Private tags encrypted in content
  let content = "";
  if (muteList.privateEntries.length > 0) {
    const privateTags: string[][] = muteList.privateEntries.map((entry) => {
      const value =
        entry.type === "word" ? entry.value.toLowerCase() : entry.value;
      return [entry.type, value];
    });

    // Encrypt with NIP-44 using the author's own key pair (encrypting to self)
    const sharedKey = conversationKey(authorPrivkey, authorPubkey);
    content = nip44.encrypt(JSON.stringify(privateTags), sharedKey);
  }

  return {
    kind: 10000,
    tags: publicTags,
    content,
    created_at: Math.floor(Date.now() / 1000),
  };
}

// ---------------------------------------------------------------------------
// Example usage
// ---------------------------------------------------------------------------

// Create a public-only mute list
const publicMuteList = createMuteList([
  { type: "p", value: "07caba282f76441955b695551c3c5c742e5b9202a3784780f8086fdcdc1da3a9" },
  { type: "t", value: "spam" },
  { type: "word", value: "nsfw" },  // Stored lowercase for case-insensitive matching
  { type: "word", value: "SCAM" },  // Will be converted to lowercase: "scam"
  { type: "e", value: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2" },
]);

console.log("Public mute list:", JSON.stringify(publicMuteList, null, 2));
// Output shows:
// - kind: 10000
// - tags with p, t, word, and e entries
// - word tags are lowercase
// - content is empty (no private items)
