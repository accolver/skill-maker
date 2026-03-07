/**
 * Mute List Manager for Nostr
 */

interface NostrEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
}

/**
 * Create a mute list event
 */
export function createMuteList(
  mutedPubkeys: string[],
  mutedHashtags: string[] = [],
  mutedWords: string[] = [],
): NostrEvent {
  const tags: string[][] = [
    ...mutedPubkeys.map((pk) => ["p", pk]),
    ...mutedHashtags.map((ht) => ["t", ht]),
    ...mutedWords.map((w) => ["word", w]),
  ];

  return {
    kind: 10000,
    tags,
    content: "",
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Add private mute entries encrypted in the content field
 */
export async function addPrivateEntries(
  event: NostrEvent,
  privateEntries: { pubkey: string }[],
  encrypt: (content: string, recipientPubkey: string) => Promise<string>,
  recipientPubkey: string,
): Promise<NostrEvent> {
  const privateData = privateEntries.map((e) => ["p", e.pubkey]);
  const encrypted = await encrypt(JSON.stringify(privateData), recipientPubkey);

  return {
    ...event,
    content: encrypted,
  };
}

/**
 * Decrypt private mute entries
 */
export async function decryptPrivateEntries(
  event: NostrEvent,
  decrypt: (content: string, senderPubkey: string) => Promise<string>,
  senderPubkey: string,
): Promise<string[][]> {
  if (!event.content) return [];

  const decrypted = await decrypt(event.content, senderPubkey);
  return JSON.parse(decrypted);
}

// Example
const muteList = createMuteList(
  ["abc123", "def456"],
  ["spam", "nsfw"],
  ["BadWord", "SCAM"],
);

console.log(JSON.stringify(muteList, null, 2));
