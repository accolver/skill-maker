#!/usr/bin/env bun
/**
 * Synthesize CDK stack and show diff for a specific stage.
 *
 * Usage: bun run scripts/synth.ts <stage>
 * Example: bun run scripts/synth.ts staging
 *
 * This script:
 * 1. Loads stage configuration
 * 2. Runs `cdk synth` to generate CloudFormation templates
 * 3. Runs `cdk diff` to show what will change
 * 4. Outputs warnings for dangerous changes
 */

import { $ } from "bun";
import * as fs from "fs";
import * as path from "path";

const VALID_STAGES = ["staging", "production"];

// Patterns in cdk diff output that indicate dangerous changes
const DANGEROUS_PATTERNS = [
  { pattern: /\[~\].*AWS::RDS::DBInstance/, label: "Database instance modification" },
  { pattern: /\[-\].*AWS::/, label: "Resource deletion" },
  { pattern: /replace/, label: "Resource replacement (causes downtime)" },
  { pattern: /Security Group.*ingress/, label: "Security group ingress change" },
  { pattern: /AWS::IAM::Policy.*\*/, label: "Wildcard IAM policy" },
];

async function main() {
  const stage = process.argv[2];

  if (!stage || !VALID_STAGES.includes(stage)) {
    console.error(`Usage: bun run scripts/synth.ts <stage>`);
    console.error(`Valid stages: ${VALID_STAGES.join(", ")}`);
    process.exit(1);
  }

  // Verify config exists
  const stageEnvPath = path.resolve(`config/${stage}.env`);
  if (!fs.existsSync(stageEnvPath)) {
    console.error(`ERROR: Config file not found: ${stageEnvPath}`);
    process.exit(1);
  }

  // Verify cdk.json exists
  if (!fs.existsSync("cdk.json")) {
    console.error("ERROR: cdk.json not found in project root.");
    console.error("Create a cdk.json or run from the project root directory.");
    process.exit(1);
  }

  console.log(`\n=== Synthesizing CDK stack for ${stage} ===\n`);

  // Step 1: Run cdk synth
  console.log("Running cdk synth...\n");
  try {
    await $`npx cdk synth --context stage=${stage} --quiet`;
    console.log("Synth complete. CloudFormation template written to cdk.out/\n");
  } catch (error) {
    console.error("ERROR: cdk synth failed.");
    console.error(error);
    process.exit(1);
  }

  // Verify cdk.out exists
  const cdkOutPath = path.resolve("cdk.out");
  if (!fs.existsSync(cdkOutPath)) {
    console.error("ERROR: cdk.out directory not created after synth.");
    process.exit(1);
  }

  // List generated templates
  const templates = fs
    .readdirSync(cdkOutPath)
    .filter((f) => f.endsWith(".template.json"));
  console.log(`Generated ${templates.length} template(s):`);
  for (const t of templates) {
    const size = fs.statSync(path.join(cdkOutPath, t)).size;
    console.log(`  - ${t} (${(size / 1024).toFixed(1)} KB)`);
  }

  // Step 2: Run cdk diff
  console.log(`\n=== CDK Diff for ${stage} ===\n`);
  let diffOutput = "";
  try {
    const result = await $`npx cdk diff --context stage=${stage}`.text();
    diffOutput = result;
    console.log(result);
  } catch (error: any) {
    // cdk diff exits with code 1 when there are differences (this is normal)
    if (error.exitCode === 1 && error.stdout) {
      diffOutput = error.stdout;
      console.log(error.stdout);
    } else {
      console.error("ERROR: cdk diff failed.");
      console.error(error);
      process.exit(1);
    }
  }

  // Step 3: Check for dangerous changes
  const warnings: string[] = [];
  for (const { pattern, label } of DANGEROUS_PATTERNS) {
    if (pattern.test(diffOutput)) {
      warnings.push(label);
    }
  }

  if (warnings.length > 0) {
    console.log("\n=== WARNINGS: Potentially Dangerous Changes ===\n");
    for (const w of warnings) {
      console.log(`  ⚠️  ${w}`);
    }
    console.log(
      "\nReview these changes carefully before deploying."
    );

    if (stage === "production") {
      console.log(
        "\n🔴 PRODUCTION: These changes require extra scrutiny. Consider deploying to staging first."
      );
    }
  } else if (diffOutput.includes("no differences")) {
    console.log("\n✅ No infrastructure changes detected.");
  } else {
    console.log("\n✅ Changes look safe. Review the diff above before deploying.");
  }

  // Write synth metadata
  const metadata = {
    stage,
    timestamp: new Date().toISOString(),
    templates,
    warnings,
    hasDifferences: !diffOutput.includes("no differences"),
  };

  const metadataPath = path.resolve("cdk.out/synth-metadata.json");
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`\nMetadata written to: ${metadataPath}`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
