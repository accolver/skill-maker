/**
 * Nostr Mute List Manager
 * Supports public and private mute entries
 */

interface NostrEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
}

interface MuteItem {
  type: "pubkey" | "hashtag" | "keyword" | "event";
  value: string;
}

/**
 * Create a mute list event.
 * Mute lists are kind 10000 events.
 */
export function createMuteList(
  publicItems: MuteItem[],
  privateItems: MuteItem[] = [],
  encryptFn?: (data: string) => string,
): NostrEvent {
  const tags: string[][] = [];

  for (const item of publicItems) {
    switch (item.type) {
      case "pubkey":
        tags.push(["p", item.value]);
        break;
      case "hashtag":
        tags.push(["t", item.value]);
        break;
      case "keyword":
        tags.push(["word", item.value]);
        break;
      case "event":
        tags.push(["e", item.value]);
        break;
    }
  }

  let content = "";
  if (privateItems.length > 0 && encryptFn) {
    const privateTags = privateItems.map((item) => {
      switch (item.type) {
        case "pubkey": return ["p", item.value];
        case "hashtag": return ["t", item.value];
        case "keyword": return ["word", item.value];
        case "event": return ["e", item.value];
      }
    });
    content = encryptFn(JSON.stringify(privateTags));
  }

  return {
    kind: 10000,
    tags,
    content,
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Decrypt private mute entries from the content field.
 */
export function decryptPrivateItems(
  event: NostrEvent,
  decryptFn: (data: string) => string,
): string[][] {
  if (!event.content) return [];
  const decrypted = decryptFn(event.content);
  return JSON.parse(decrypted);
}
