#!/usr/bin/env bun

/**
 * rollback.ts — Rolls back a CDK/CloudFormation deployment to the previous version.
 *
 * Supports CloudFormation stack rollback and CloudFront cache invalidation.
 * Outputs structured JSON to stdout for agent consumption.
 */

const HELP = `
rollback.ts — Roll back a Next.js CDK deployment

USAGE:
  bun run scripts/rollback.ts --env <environment> [options]

OPTIONS:
  --env <name>            Target environment: staging | production (required)
  --reason <text>         Reason for rollback (recorded in output, default: "manual rollback")
  --stack-name <name>     CloudFormation stack name (default: Nextjs<Env>Stack)
  --invalidate-cdn        Also invalidate CloudFront cache after rollback
  --distribution-id <id>  CloudFront distribution ID (required if --invalidate-cdn)
  --dry-run               Show what would be executed without running commands
  --help                  Show this help message

EXAMPLES:
  # Roll back staging
  bun run scripts/rollback.ts --env staging --reason "Health check failed"

  # Roll back production with CDN invalidation
  bun run scripts/rollback.ts --env production --reason "500 errors in logs" \\
    --invalidate-cdn --distribution-id E1234567890

  # Dry run to see rollback commands
  bun run scripts/rollback.ts --env production --dry-run

OUTPUT (JSON to stdout):
  {
    "success": true,
    "environment": "production",
    "action": "rollback",
    "reason": "Health check failed",
    "stack_name": "NextjsProductionStack",
    "steps": [
      { "name": "rollback-stack", "status": "passed", "duration_ms": 34000 },
      { "name": "invalidate-cdn", "status": "skipped" }
    ],
    "timestamp": "2025-01-15T10:45:00Z"
  }

EXIT CODES:
  0  Rollback completed successfully
  1  Invalid arguments
  2  CloudFormation rollback failed
  3  CloudFront invalidation failed
  4  Stack not found or not in a rollbackable state
`;

import { $ } from "bun";

interface StepResult {
  name: string;
  status: "passed" | "failed" | "skipped";
  duration_ms?: number;
  error?: string;
}

interface RollbackResult {
  success: boolean;
  environment: string;
  action: "rollback";
  reason: string;
  stack_name: string;
  steps: StepResult[];
  timestamp: string;
  dry_run: boolean;
}

function parseArgs(args: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help") {
      parsed.help = true;
    } else if (arg === "--invalidate-cdn") {
      parsed["invalidate-cdn"] = true;
    } else if (arg === "--dry-run") {
      parsed["dry-run"] = true;
    } else if (arg.startsWith("--") && i + 1 < args.length) {
      parsed[arg.slice(2)] = args[++i];
    }
  }
  return parsed;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.error(HELP);
    process.exit(0);
  }

  const env = args.env as string;
  if (!env || !["staging", "production"].includes(env)) {
    console.error(
      "[rollback] Error: --env is required and must be 'staging' or 'production'"
    );
    console.error("Run with --help for usage information.");
    const result: RollbackResult = {
      success: false,
      environment: env || "unknown",
      action: "rollback",
      reason: "invalid arguments",
      stack_name: "unknown",
      steps: [],
      timestamp: new Date().toISOString(),
      dry_run: false,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const reason = (args.reason as string) || "manual rollback";
  const stackName =
    (args["stack-name"] as string) || `Nextjs${capitalize(env)}Stack`;
  const invalidateCdn = !!args["invalidate-cdn"];
  const distributionId = args["distribution-id"] as string;
  const dryRun = !!args["dry-run"];

  if (invalidateCdn && !distributionId) {
    console.error(
      "[rollback] Error: --distribution-id is required when using --invalidate-cdn"
    );
    const result: RollbackResult = {
      success: false,
      environment: env,
      action: "rollback",
      reason,
      stack_name: stackName,
      steps: [],
      timestamp: new Date().toISOString(),
      dry_run: dryRun,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const steps: StepResult[] = [];

  // Step 1: Check stack status
  console.error(`[rollback] Checking stack status: ${stackName}`);
  if (!dryRun) {
    try {
      const statusResult =
        await $`aws cloudformation describe-stacks --stack-name ${stackName} --query "Stacks[0].StackStatus" --output text`
          .quiet()
          .text();
      const status = statusResult.trim();
      console.error(`[rollback] Current stack status: ${status}`);

      const rollbackableStates = [
        "UPDATE_COMPLETE",
        "UPDATE_ROLLBACK_COMPLETE",
        "UPDATE_FAILED",
      ];
      if (!rollbackableStates.includes(status)) {
        console.error(
          `[rollback] Stack is in state '${status}' which may not support rollback`
        );
        steps.push({
          name: "check-status",
          status: "failed",
          error: `Stack in non-rollbackable state: ${status}`,
        });
        const result: RollbackResult = {
          success: false,
          environment: env,
          action: "rollback",
          reason,
          stack_name: stackName,
          steps,
          timestamp: new Date().toISOString(),
          dry_run: dryRun,
        };
        console.log(JSON.stringify(result, null, 2));
        process.exit(4);
      }

      steps.push({ name: "check-status", status: "passed" });
    } catch (err: any) {
      steps.push({
        name: "check-status",
        status: "failed",
        error: `Stack not found: ${stackName}`,
      });
      const result: RollbackResult = {
        success: false,
        environment: env,
        action: "rollback",
        reason,
        stack_name: stackName,
        steps,
        timestamp: new Date().toISOString(),
        dry_run: dryRun,
      };
      console.log(JSON.stringify(result, null, 2));
      process.exit(4);
    }
  } else {
    console.error(`[dry-run] Would check stack status for: ${stackName}`);
    steps.push({ name: "check-status", status: "passed", duration_ms: 0 });
  }

  // Step 2: Rollback the stack
  console.error(`[rollback] Rolling back stack: ${stackName}`);
  const rollbackStart = Date.now();

  if (!dryRun) {
    try {
      await $`aws cloudformation rollback-stack --stack-name ${stackName}`.quiet();
      console.error("[rollback] Rollback initiated, waiting for completion...");

      await $`aws cloudformation wait stack-rollback-complete --stack-name ${stackName}`.quiet();
      const duration_ms = Date.now() - rollbackStart;
      console.error(`[rollback] Stack rollback completed in ${duration_ms}ms`);
      steps.push({ name: "rollback-stack", status: "passed", duration_ms });
    } catch (err: any) {
      const duration_ms = Date.now() - rollbackStart;
      steps.push({
        name: "rollback-stack",
        status: "failed",
        duration_ms,
        error: err.message?.slice(0, 500) || "Rollback failed",
      });
      const result: RollbackResult = {
        success: false,
        environment: env,
        action: "rollback",
        reason,
        stack_name: stackName,
        steps,
        timestamp: new Date().toISOString(),
        dry_run: dryRun,
      };
      console.log(JSON.stringify(result, null, 2));
      process.exit(2);
    }
  } else {
    console.error(
      `[dry-run] Would execute: aws cloudformation rollback-stack --stack-name ${stackName}`
    );
    console.error(
      `[dry-run] Would execute: aws cloudformation wait stack-rollback-complete --stack-name ${stackName}`
    );
    steps.push({ name: "rollback-stack", status: "passed", duration_ms: 0 });
  }

  // Step 3: Invalidate CDN (optional)
  if (invalidateCdn) {
    console.error(
      `[rollback] Invalidating CloudFront distribution: ${distributionId}`
    );
    const cdnStart = Date.now();

    if (!dryRun) {
      try {
        await $`aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/*"`.quiet();
        const duration_ms = Date.now() - cdnStart;
        console.error(`[rollback] CDN invalidation created in ${duration_ms}ms`);
        steps.push({ name: "invalidate-cdn", status: "passed", duration_ms });
      } catch (err: any) {
        const duration_ms = Date.now() - cdnStart;
        steps.push({
          name: "invalidate-cdn",
          status: "failed",
          duration_ms,
          error: err.message?.slice(0, 500) || "CDN invalidation failed",
        });
        const result: RollbackResult = {
          success: false,
          environment: env,
          action: "rollback",
          reason,
          stack_name: stackName,
          steps,
          timestamp: new Date().toISOString(),
          dry_run: dryRun,
        };
        console.log(JSON.stringify(result, null, 2));
        process.exit(3);
      }
    } else {
      console.error(
        `[dry-run] Would execute: aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/*"`
      );
      steps.push({ name: "invalidate-cdn", status: "passed", duration_ms: 0 });
    }
  } else {
    steps.push({ name: "invalidate-cdn", status: "skipped" });
  }

  const result: RollbackResult = {
    success: true,
    environment: env,
    action: "rollback",
    reason,
    stack_name: stackName,
    steps,
    timestamp: new Date().toISOString(),
    dry_run: dryRun,
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main();
