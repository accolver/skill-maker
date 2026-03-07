#!/usr/bin/env bun

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ValidationResult {
  valid: boolean;
  skill_name: string | null;
  errors: string[];
  warnings: string[];
  info: {
    name: string | null;
    description: string | null;
    body_lines: number;
    estimated_tokens: number;
    has_scripts: boolean;
    has_references: boolean;
    has_assets: boolean;
    referenced_files: string[];
    missing_files: string[];
  };
}

interface Frontmatter {
  [key: string]: string | Record<string, string> | undefined;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
validate-skill — Validate a SKILL.md file against the Agent Skills specification.

USAGE
  bun run scripts/validate-skill.ts <skill-dir>

ARGUMENTS
  <skill-dir>   Path to a skill directory containing SKILL.md.

EXIT CODES
  0   Valid (possibly with warnings).
  1   Invalid (has errors) or bad usage.

OUTPUT
  Structured JSON written to stdout with fields:
    valid, skill_name, errors, warnings, info

EXAMPLES
  bun run scripts/validate-skill.ts ./my-skill
  bun run scripts/validate-skill.ts /absolute/path/to/skill
`.trim();

// ---------------------------------------------------------------------------
// Minimal YAML frontmatter parser
// ---------------------------------------------------------------------------

function parseFrontmatter(raw: string): Frontmatter {
  const result: Frontmatter = {};
  let currentKey: string | null = null;
  let currentMapValue: Record<string, string> | null = null;

  for (const line of raw.split("\n")) {
    // Blank lines — flush any map accumulator
    if (line.trim() === "") {
      if (currentKey && currentMapValue) {
        result[currentKey] = currentMapValue;
        currentKey = null;
        currentMapValue = null;
      }
      continue;
    }

    // Indented line → part of a map value for the current key
    if (/^\s{2,}/.test(line) && currentKey !== null) {
      const mapMatch = line.trim().match(/^([^:]+):\s*(.*)$/);
      if (mapMatch) {
        if (!currentMapValue) currentMapValue = {};
        currentMapValue[mapMatch[1].trim()] = mapMatch[2].trim();
      }
      continue;
    }

    // Flush previous map if we hit a non-indented line
    if (currentKey && currentMapValue) {
      result[currentKey] = currentMapValue;
      currentKey = null;
      currentMapValue = null;
    }

    // Top-level key: value
    const kvMatch = line.match(/^([A-Za-z_-][A-Za-z0-9_-]*):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const value = kvMatch[2].trim();

      if (value === "" || value === "|" || value === ">") {
        // Could be a map or multiline — we'll accumulate on next indented lines
        currentKey = key;
        currentMapValue = null;
        if (value === "" ) {
          // Might be a map — peek ahead handled by indented-line branch
          currentMapValue = {};
        }
        continue;
      }

      // Strip optional surrounding quotes
      result[key] = value.replace(/^["']|["']$/g, "");
      currentKey = null;
      currentMapValue = null;
    }
  }

  // Flush trailing map
  if (currentKey && currentMapValue) {
    result[currentKey] = currentMapValue;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validateName(
  name: unknown,
  dirName: string,
  errors: string[],
): string | null {
  if (name === undefined || name === null || name === "") {
    errors.push("Frontmatter is missing required field 'name'.");
    return null;
  }

  if (typeof name !== "string") {
    errors.push(`'name' must be a string, got ${typeof name}.`);
    return null;
  }

  if (name.length < 1 || name.length > 64) {
    errors.push(
      `name '${name}' must be 1-64 characters (got ${name.length}).`,
    );
  }

  if (/[A-Z]/.test(name)) {
    errors.push(
      `name '${name}' contains uppercase characters. Use lowercase only: '${name.toLowerCase()}'.`,
    );
  }

  if (/[^a-z0-9-]/.test(name)) {
    const bad = [...new Set(name.match(/[^a-z0-9-]/g) || [])].join(", ");
    errors.push(
      `name '${name}' contains invalid characters: ${bad}. Only lowercase alphanumeric and hyphens allowed.`,
    );
  }

  if (name.startsWith("-")) {
    errors.push(`name '${name}' must not start with a hyphen.`);
  }

  if (name.endsWith("-")) {
    errors.push(`name '${name}' must not end with a hyphen.`);
  }

  if (name.includes("--")) {
    errors.push(
      `name '${name}' must not contain consecutive hyphens ('--').`,
    );
  }

  if (name !== dirName) {
    errors.push(
      `name '${name}' does not match parent directory name '${dirName}'. They must be identical.`,
    );
  }

  return name;
}

function validateDescription(
  description: unknown,
  errors: string[],
): string | null {
  if (
    description === undefined ||
    description === null ||
    description === ""
  ) {
    errors.push("Frontmatter is missing required field 'description'.");
    return null;
  }

  if (typeof description !== "string") {
    errors.push(`'description' must be a string, got ${typeof description}.`);
    return null;
  }

  if (description.length < 1 || description.length > 1024) {
    errors.push(
      `description must be 1-1024 characters (got ${description.length}).`,
    );
  }

  return description;
}

function validateCompatibility(
  value: unknown,
  errors: string[],
): void {
  if (value === undefined || value === null) return;
  if (typeof value !== "string") {
    errors.push(`'compatibility' must be a string, got ${typeof value}.`);
    return;
  }
  if (value.length > 500) {
    errors.push(
      `compatibility must be at most 500 characters (got ${value.length}).`,
    );
  }
}

function validateMetadata(
  value: unknown,
  errors: string[],
): void {
  if (value === undefined || value === null) return;
  if (typeof value !== "object" || Array.isArray(value)) {
    errors.push("'metadata' must be a map of string keys to string values.");
    return;
  }
  const map = value as Record<string, unknown>;
  for (const [k, v] of Object.entries(map)) {
    if (typeof k !== "string" || typeof v !== "string") {
      errors.push(
        `metadata entry '${k}' must have a string value, got ${typeof v}.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// File reference scanning
// ---------------------------------------------------------------------------

/** Extract relative paths referenced in the markdown body. */
function extractReferencedFiles(body: string): string[] {
  const paths = new Set<string>();

  // Markdown links: [text](relative/path)
  const linkRegex = /\[(?:[^\]]*)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(body)) !== null) {
    const href = match[1].trim();
    // Skip absolute URLs, anchors, and mailto
    if (
      /^https?:\/\//i.test(href) ||
      /^#/.test(href) ||
      /^mailto:/i.test(href) ||
      /^file:\/\//i.test(href)
    ) {
      continue;
    }
    // Strip any anchor fragment
    const clean = href.split("#")[0];
    if (clean) paths.add(clean);
  }

  // Inline code references that look like file paths
  // Match backtick-wrapped strings that contain a / and look like paths
  const codeRegex = /`([^`]+)`/g;
  while ((match = codeRegex.exec(body)) !== null) {
    const candidate = match[1].trim();
    // Must contain a slash and look like a relative path (not a command, URL, etc.)
    if (
      candidate.includes("/") &&
      !candidate.includes(" ") &&
      !candidate.startsWith("/") &&
      !candidate.startsWith("http") &&
      !candidate.startsWith("$") &&
      /\.[a-zA-Z0-9]+$/.test(candidate)
    ) {
      paths.add(candidate);
    }
  }

  return [...paths].sort();
}

/** Check which subdirectories exist in the skill dir. */
function checkSubdirs(skillDir: string) {
  const has = (name: string): boolean => {
    const p = join(skillDir, name);
    return existsSync(p) && statSync(p).isDirectory();
  };
  return {
    has_scripts: has("scripts"),
    has_references: has("references"),
    has_assets: has("assets"),
  };
}

// ---------------------------------------------------------------------------
// Main validation
// ---------------------------------------------------------------------------

function validate(skillDir: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const resolvedDir = resolve(skillDir);
  const dirName = basename(resolvedDir);
  const skillMdPath = join(resolvedDir, "SKILL.md");

  // Initialise result skeleton
  const result: ValidationResult = {
    valid: false,
    skill_name: null,
    errors,
    warnings,
    info: {
      name: null,
      description: null,
      body_lines: 0,
      estimated_tokens: 0,
      has_scripts: false,
      has_references: false,
      has_assets: false,
      referenced_files: [],
      missing_files: [],
    },
  };

  // --- Directory checks ---
  if (!existsSync(resolvedDir)) {
    errors.push(`Directory does not exist: ${resolvedDir}`);
    result.valid = errors.length === 0;
    return result;
  }

  if (!statSync(resolvedDir).isDirectory()) {
    errors.push(`Path is not a directory: ${resolvedDir}`);
    result.valid = errors.length === 0;
    return result;
  }

  if (!existsSync(skillMdPath)) {
    errors.push(`SKILL.md not found in ${resolvedDir}`);
    result.valid = errors.length === 0;
    return result;
  }

  // --- Read & split frontmatter / body ---
  const raw = readFileSync(skillMdPath, "utf-8");
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const fmMatch = raw.match(fmRegex);

  if (!fmMatch) {
    errors.push(
      "SKILL.md is missing YAML frontmatter. Expected file to start with '---' delimiters.",
    );
    result.valid = errors.length === 0;
    return result;
  }

  const frontmatterRaw = fmMatch[1];
  const body = fmMatch[2];

  // --- Parse frontmatter ---
  const fm = parseFrontmatter(frontmatterRaw);

  // --- Validate required fields ---
  const nameValue = validateName(fm.name, dirName, errors);
  const descValue = validateDescription(fm.description, errors);

  result.skill_name = typeof nameValue === "string" ? nameValue : null;
  result.info.name = result.skill_name;
  result.info.description = typeof descValue === "string" ? descValue : null;

  // --- Validate optional fields ---
  validateCompatibility(fm.compatibility, errors);
  validateMetadata(fm.metadata, errors);

  // allowed-tools: just needs to be a string if present
  const allowedTools = fm["allowed-tools"];
  if (
    allowedTools !== undefined &&
    allowedTools !== null &&
    typeof allowedTools !== "string"
  ) {
    errors.push(
      `'allowed-tools' must be a space-delimited string, got ${typeof allowedTools}.`,
    );
  }

  // --- Body analysis ---
  const bodyLines = body.split("\n");
  const bodyLineCount = bodyLines.length;
  const wordCount = body
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  const estimatedTokens = Math.ceil(wordCount * 1.3);

  result.info.body_lines = bodyLineCount;
  result.info.estimated_tokens = estimatedTokens;

  if (bodyLineCount > 500) {
    warnings.push(
      `Body exceeds 500 lines (${bodyLineCount} lines). Consider splitting into reference files.`,
    );
  }

  if (estimatedTokens > 5000) {
    warnings.push(
      `Body exceeds 5000 estimated tokens (${estimatedTokens} tokens). Consider reducing content or moving details to reference files.`,
    );
  }

  // --- Subdirectory checks ---
  const subdirs = checkSubdirs(resolvedDir);
  result.info.has_scripts = subdirs.has_scripts;
  result.info.has_references = subdirs.has_references;
  result.info.has_assets = subdirs.has_assets;

  // --- Referenced file checks ---
  const referencedFiles = extractReferencedFiles(body);
  result.info.referenced_files = referencedFiles;

  const missingFiles: string[] = [];
  for (const ref of referencedFiles) {
    const refPath = join(resolvedDir, ref);
    if (!existsSync(refPath)) {
      missingFiles.push(ref);
    }
  }
  result.info.missing_files = missingFiles;

  if (missingFiles.length > 0) {
    warnings.push(
      `Referenced files not found: ${missingFiles.join(", ")}`,
    );
  }

  // --- Final verdict ---
  result.valid = errors.length === 0;
  return result;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  if (args.length === 0) {
    console.error("Error: Missing required argument <skill-dir>.\n");
    console.error(HELP);
    process.exit(1);
  }

  if (args.length > 1) {
    console.error(
      `Error: Expected exactly one argument <skill-dir>, got ${args.length}.\n`,
    );
    console.error(HELP);
    process.exit(1);
  }

  const skillDir = args[0];
  const result = validate(skillDir);

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid ? 0 : 1);
}

main();
