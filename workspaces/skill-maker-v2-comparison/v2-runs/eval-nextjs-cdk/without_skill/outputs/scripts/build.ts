#!/usr/bin/env bun
/**
 * Build a Next.js application for a specific deployment stage.
 *
 * Usage: bun run scripts/build.ts <stage>
 * Example: bun run scripts/build.ts staging
 *
 * This script:
 * 1. Loads environment variables from config/<stage>.env
 * 2. Validates that next.config has output: "standalone"
 * 3. Runs `next build`
 * 4. Validates the build output
 */

import { $ } from "bun";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

const VALID_STAGES = ["staging", "production"];

async function main() {
  const stage = process.argv[2];

  if (!stage || !VALID_STAGES.includes(stage)) {
    console.error(`Usage: bun run scripts/build.ts <stage>`);
    console.error(`Valid stages: ${VALID_STAGES.join(", ")}`);
    process.exit(1);
  }

  console.log(`\n=== Building Next.js app for ${stage} ===\n`);

  // Step 1: Load environment variables
  const sharedEnvPath = path.resolve("config/shared.env");
  const stageEnvPath = path.resolve(`config/${stage}.env`);

  if (fs.existsSync(sharedEnvPath)) {
    dotenv.config({ path: sharedEnvPath });
    console.log(`Loaded shared config: ${sharedEnvPath}`);
  }

  if (!fs.existsSync(stageEnvPath)) {
    console.error(`ERROR: Config file not found: ${stageEnvPath}`);
    console.error(`Create config/${stage}.env with the required variables.`);
    process.exit(1);
  }

  const stageEnv = dotenv.config({ path: stageEnvPath });
  console.log(`Loaded stage config: ${stageEnvPath}`);

  // Collect NEXT_PUBLIC_ vars for build-time injection
  const buildEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("NEXT_PUBLIC_") && value) {
      buildEnv[key] = value;
    }
  }
  console.log(
    `Injecting ${Object.keys(buildEnv).length} NEXT_PUBLIC_ variables`
  );

  // Step 2: Validate next.config
  const nextConfigPaths = [
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
  ];
  let nextConfigPath: string | null = null;
  for (const p of nextConfigPaths) {
    if (fs.existsSync(p)) {
      nextConfigPath = p;
      break;
    }
  }

  if (!nextConfigPath) {
    console.error("ERROR: No next.config.js/mjs/ts found in project root.");
    process.exit(1);
  }

  const nextConfigContent = fs.readFileSync(nextConfigPath, "utf-8");
  if (!nextConfigContent.includes("standalone")) {
    console.warn(
      `WARNING: ${nextConfigPath} may not have output: "standalone" configured.`
    );
    console.warn(
      'Add `output: "standalone"` to your Next.js config for Lambda deployment.'
    );
    console.warn("Continuing build anyway...\n");
  }

  // Step 3: Run next build
  console.log("Running next build...\n");

  const buildStart = Date.now();
  try {
    await $`npx next build`.env({
      ...process.env,
      ...buildEnv,
      NODE_ENV: "production",
    });
  } catch (error) {
    console.error("\nERROR: next build failed.");
    console.error(error);
    process.exit(1);
  }
  const buildDuration = ((Date.now() - buildStart) / 1000).toFixed(1);

  // Step 4: Validate build output
  const standalonePath = path.resolve(".next/standalone");
  const staticPath = path.resolve(".next/static");

  if (!fs.existsSync(standalonePath)) {
    console.error(
      "\nERROR: .next/standalone directory not found after build."
    );
    console.error(
      'Ensure next.config has `output: "standalone"` configured.'
    );
    process.exit(1);
  }

  if (!fs.existsSync(staticPath)) {
    console.error("\nERROR: .next/static directory not found after build.");
    process.exit(1);
  }

  // Check standalone directory is non-empty
  const standaloneFiles = fs.readdirSync(standalonePath);
  if (standaloneFiles.length === 0) {
    console.error("\nERROR: .next/standalone directory is empty.");
    process.exit(1);
  }

  console.log(`\n=== Build complete for ${stage} ===`);
  console.log(`Duration: ${buildDuration}s`);
  console.log(`Standalone: ${standalonePath} (${standaloneFiles.length} items)`);
  console.log(`Static: ${staticPath}`);

  // Write build metadata
  const metadata = {
    stage,
    timestamp: new Date().toISOString(),
    duration: parseFloat(buildDuration),
    commitSha: await getCommitSha(),
    nextPublicVars: Object.keys(buildEnv),
  };

  const metadataPath = path.resolve(".next/build-metadata.json");
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`Metadata: ${metadataPath}`);
}

async function getCommitSha(): Promise<string> {
  try {
    const result = await $`git rev-parse HEAD`.text();
    return result.trim();
  } catch {
    return "unknown";
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
