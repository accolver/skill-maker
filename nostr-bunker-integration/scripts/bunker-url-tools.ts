#!/usr/bin/env bun

/**
 * bunker-url-tools.ts — Parse bunker:// URIs, generate nostrconnect:// URIs,
 * and validate NIP-46 connection parameters.
 *
 * Usage:
 *   bun run scripts/bunker-url-tools.ts parse <bunker-uri>
 *   bun run scripts/bunker-url-tools.ts generate-nostrconnect [options]
 *   bun run scripts/bunker-url-tools.ts generate-bunker [options]
 *   bun run scripts/bunker-url-tools.ts validate <uri>
 *   bun run scripts/bunker-url-tools.ts --help
 */

const BUNKER_REGEX = /^bunker:\/\/([0-9a-f]{64})\??(.*)$/i;
const NOSTRCONNECT_REGEX = /^nostrconnect:\/\/([0-9a-f]{64})\??(.*)$/i;
const HEX_PUBKEY_REGEX = /^[0-9a-f]{64}$/i;
const WSS_REGEX = /^wss?:\/\/.+/i;

interface BunkerPointer {
  pubkey: string;
  relays: string[];
  secret: string | null;
}

interface NostrConnectParams {
  clientPubkey: string;
  relays: string[];
  secret: string;
  perms?: string[];
  name?: string;
  url?: string;
  image?: string;
}

interface ParseResult {
  type: "bunker" | "nostrconnect";
  valid: boolean;
  errors: string[];
  warnings: string[];
  parsed: BunkerPointer | NostrConnectParams | null;
}

function parseBunkerUri(uri: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const match = BUNKER_REGEX.exec(uri);

  if (!match) {
    return {
      type: "bunker",
      valid: false,
      errors: ["URI does not match bunker:// format. Expected: bunker://<64-char-hex-pubkey>?relay=<wss-url>"],
      warnings: [],
      parsed: null,
    };
  }

  const pubkey = match[1].toLowerCase();
  const queryString = match[2];
  const params = new URLSearchParams(queryString);

  if (!HEX_PUBKEY_REGEX.test(pubkey)) {
    errors.push(`Invalid pubkey: must be 64 hex characters, got "${pubkey}"`);
  }

  const relays = params.getAll("relay");
  if (relays.length === 0) {
    errors.push("No relay specified. At least one relay=wss://... parameter is required");
  }

  for (const relay of relays) {
    if (!WSS_REGEX.test(relay)) {
      errors.push(`Invalid relay URL: "${relay}". Must start with wss:// or ws://`);
    }
    if (relay.startsWith("ws://")) {
      warnings.push(`Relay "${relay}" uses unencrypted ws://. Consider using wss:// for security`);
    }
  }

  const secret = params.get("secret");
  if (!secret) {
    warnings.push("No secret provided. A secret is recommended for connection security");
  }

  return {
    type: "bunker",
    valid: errors.length === 0,
    errors,
    warnings,
    parsed: {
      pubkey,
      relays,
      secret: secret || null,
    },
  };
}

function parseNostrConnectUri(uri: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const match = NOSTRCONNECT_REGEX.exec(uri);

  if (!match) {
    return {
      type: "nostrconnect",
      valid: false,
      errors: ["URI does not match nostrconnect:// format. Expected: nostrconnect://<64-char-hex-pubkey>?relay=<url>&secret=<str>"],
      warnings: [],
      parsed: null,
    };
  }

  const clientPubkey = match[1].toLowerCase();
  const queryString = match[2];
  const params = new URLSearchParams(queryString);

  if (!HEX_PUBKEY_REGEX.test(clientPubkey)) {
    errors.push(`Invalid client pubkey: must be 64 hex characters, got "${clientPubkey}"`);
  }

  const relays = params.getAll("relay");
  if (relays.length === 0) {
    errors.push("No relay specified. At least one relay=wss://... parameter is required");
  }

  for (const relay of relays) {
    if (!WSS_REGEX.test(relay)) {
      errors.push(`Invalid relay URL: "${relay}". Must start with wss:// or ws://`);
    }
  }

  const secret = params.get("secret");
  if (!secret) {
    errors.push("No secret provided. secret is REQUIRED for nostrconnect:// URIs");
  }

  const perms = params.get("perms");
  const name = params.get("name");
  const url = params.get("url");
  const image = params.get("image");

  if (!name) {
    warnings.push("No app name provided. Consider adding name=<app-name> for better UX");
  }

  const parsedPerms = perms ? perms.split(",").filter(Boolean) : undefined;
  if (parsedPerms) {
    for (const perm of parsedPerms) {
      const parts = perm.split(":");
      const validMethods = [
        "connect", "sign_event", "ping", "get_public_key",
        "nip04_encrypt", "nip04_decrypt", "nip44_encrypt", "nip44_decrypt",
        "switch_relays"
      ];
      if (!validMethods.includes(parts[0])) {
        warnings.push(`Unknown permission method: "${parts[0]}". Known methods: ${validMethods.join(", ")}`);
      }
      if (parts[0] === "sign_event" && parts[1] && isNaN(Number(parts[1]))) {
        errors.push(`Invalid sign_event kind parameter: "${parts[1]}". Must be a number`);
      }
    }
  }

  return {
    type: "nostrconnect",
    valid: errors.length === 0,
    errors,
    warnings,
    parsed: {
      clientPubkey,
      relays,
      secret: secret || "",
      perms: parsedPerms,
      name: name || undefined,
      url: url || undefined,
      image: image || undefined,
    },
  };
}

function generateNostrConnectUri(opts: {
  relays: string[];
  secret?: string;
  name?: string;
  url?: string;
  image?: string;
  perms?: string[];
}): { uri: string; clientPubkey: string; clientSecretKey: string } {
  // Generate a random 32-byte keypair (hex representation)
  const skBytes = crypto.getRandomValues(new Uint8Array(32));
  const clientSecretKey = Array.from(skBytes).map(b => b.toString(16).padStart(2, "0")).join("");

  // For a real implementation you'd derive the pubkey via secp256k1.
  // This tool generates a placeholder - use your SDK for real pubkeys.
  const clientPubkey = "REPLACE_WITH_REAL_PUBKEY_FROM_SDK";

  const secret = opts.secret || crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  const params = new URLSearchParams();
  for (const relay of opts.relays) {
    params.append("relay", relay);
  }
  params.set("secret", secret);
  if (opts.name) params.set("name", opts.name);
  if (opts.url) params.set("url", opts.url);
  if (opts.image) params.set("image", opts.image);
  if (opts.perms && opts.perms.length > 0) params.set("perms", opts.perms.join(","));

  const uri = `nostrconnect://${clientPubkey}?${params.toString()}`;

  return { uri, clientPubkey, clientSecretKey };
}

function generateBunkerUri(opts: {
  signerPubkey: string;
  relays: string[];
  secret?: string;
}): string {
  const params = new URLSearchParams();
  for (const relay of opts.relays) {
    params.append("relay", relay);
  }
  if (opts.secret) params.set("secret", opts.secret);
  return `bunker://${opts.signerPubkey}?${params.toString()}`;
}

function printHelp(): void {
  console.log(`bunker-url-tools.ts — NIP-46 Connection URI Tools

USAGE:
  bun run scripts/bunker-url-tools.ts <command> [options]

COMMANDS:
  parse <uri>                    Parse and validate a bunker:// or nostrconnect:// URI
  validate <uri>                 Alias for parse
  generate-nostrconnect          Generate a nostrconnect:// URI template
  generate-bunker                Generate a bunker:// URI

OPTIONS for generate-nostrconnect:
  --relays <url> [<url>...]      Relay URLs (required, space-separated)
  --name <name>                  App name
  --url <url>                    App URL
  --perms <perm>[,<perm>,...]    Comma-separated permissions
  --secret <secret>              Connection secret (auto-generated if omitted)

OPTIONS for generate-bunker:
  --pubkey <hex>                 Signer pubkey (64 hex chars, required)
  --relays <url> [<url>...]      Relay URLs (required, space-separated)
  --secret <secret>              Connection secret (optional)

EXAMPLES:
  bun run scripts/bunker-url-tools.ts parse "bunker://ab12cd...?relay=wss://relay.example.com&secret=xyz"
  bun run scripts/bunker-url-tools.ts generate-nostrconnect --relays wss://relay.damus.io --name "My App" --perms sign_event:1,nip44_encrypt
  bun run scripts/bunker-url-tools.ts generate-bunker --pubkey ab12cd...ef --relays wss://relay.example.com --secret mysecret

OUTPUT:
  JSON to stdout. Diagnostics to stderr.
  Exit 0 on success, 1 on validation failure, 2 on usage error.`);
}

// --- Main ---

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

if (command === "parse" || command === "validate") {
  const uri = args[1];
  if (!uri) {
    console.error("Error: URI argument required");
    printHelp();
    process.exit(2);
  }

  let result: ParseResult;
  if (uri.startsWith("bunker://")) {
    result = parseBunkerUri(uri);
  } else if (uri.startsWith("nostrconnect://")) {
    result = parseNostrConnectUri(uri);
  } else {
    result = {
      type: "bunker",
      valid: false,
      errors: [`Unknown URI scheme. Expected bunker:// or nostrconnect://, got: ${uri.split("://")[0]}://`],
      warnings: [],
      parsed: null,
    };
  }

  console.log(JSON.stringify(result, null, 2));

  if (result.warnings.length > 0) {
    for (const w of result.warnings) {
      console.error(`Warning: ${w}`);
    }
  }

  process.exit(result.valid ? 0 : 1);
}

if (command === "generate-nostrconnect") {
  const relays: string[] = [];
  let name: string | undefined;
  let url: string | undefined;
  let perms: string[] | undefined;
  let secret: string | undefined;

  let i = 1;
  while (i < args.length) {
    switch (args[i]) {
      case "--relays":
        i++;
        while (i < args.length && !args[i].startsWith("--")) {
          relays.push(args[i]);
          i++;
        }
        break;
      case "--name":
        name = args[++i];
        i++;
        break;
      case "--url":
        url = args[++i];
        i++;
        break;
      case "--perms":
        perms = args[++i]?.split(",");
        i++;
        break;
      case "--secret":
        secret = args[++i];
        i++;
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(2);
    }
  }

  if (relays.length === 0) {
    console.error("Error: --relays is required");
    process.exit(2);
  }

  const result = generateNostrConnectUri({ relays, name, url, perms, secret });
  console.log(JSON.stringify(result, null, 2));
  console.error("Note: clientPubkey is a placeholder. Use your SDK to derive the real pubkey from clientSecretKey.");
  process.exit(0);
}

if (command === "generate-bunker") {
  let pubkey: string | undefined;
  const relays: string[] = [];
  let secret: string | undefined;

  let i = 1;
  while (i < args.length) {
    switch (args[i]) {
      case "--pubkey":
        pubkey = args[++i];
        i++;
        break;
      case "--relays":
        i++;
        while (i < args.length && !args[i].startsWith("--")) {
          relays.push(args[i]);
          i++;
        }
        break;
      case "--secret":
        secret = args[++i];
        i++;
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(2);
    }
  }

  if (!pubkey) {
    console.error("Error: --pubkey is required");
    process.exit(2);
  }

  if (!HEX_PUBKEY_REGEX.test(pubkey)) {
    console.error("Error: --pubkey must be 64 hex characters");
    process.exit(2);
  }

  if (relays.length === 0) {
    console.error("Error: --relays is required");
    process.exit(2);
  }

  const uri = generateBunkerUri({ signerPubkey: pubkey, relays, secret });
  console.log(JSON.stringify({ uri, signerPubkey: pubkey, relays, secret: secret || null }, null, 2));
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
printHelp();
process.exit(2);
