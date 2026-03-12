#!/usr/bin/env bun
/**
 * assess-nextjs-app.ts
 *
 * Analyzes a Next.js application to determine deployment requirements.
 * Checks rendering mode, API routes, middleware, image optimization,
 * and environment variable usage.
 *
 * Usage:
 *   bun run scripts/assess-nextjs-app.ts <path-to-nextjs-app>
 *   bun run scripts/assess-nextjs-app.ts --help
 *
 * Output: JSON to stdout with assessment results.
 * Exit codes: 0 = success, 1 = error, 2 = not a Next.js app
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, resolve } from "path";

interface Assessment {
  isNextApp: boolean;
  appDir: string;
  renderingMode: "ssr" | "ssg" | "isr" | "hybrid";
  outputConfig: "standalone" | "export" | "default";
  hasApiRoutes: boolean;
  hasMiddleware: boolean;
  hasImageOptimization: boolean;
  usesAppRouter: boolean;
  usesPagesRouter: boolean;
  envFiles: string[];
  nextPublicVars: string[];
  dependencies: {
    next: string;
    react: string;
  };
  recommendations: string[];
  cdkConstructsNeeded: string[];
}

function printHelp(): void {
  console.error(`
assess-nextjs-app.ts — Analyze a Next.js app for AWS CDK deployment

USAGE:
  bun run scripts/assess-nextjs-app.ts <path-to-nextjs-app>

ARGUMENTS:
  <path-to-nextjs-app>  Path to the Next.js application root directory

OUTPUT:
  JSON object to stdout with:
    - renderingMode: ssr | ssg | isr | hybrid
    - outputConfig: standalone | export | default
    - hasApiRoutes: boolean
    - hasMiddleware: boolean
    - hasImageOptimization: boolean
    - envFiles: list of .env* files found
    - nextPublicVars: list of NEXT_PUBLIC_* variables
    - recommendations: deployment recommendations
    - cdkConstructsNeeded: required CDK constructs

EXIT CODES:
  0  Success
  1  Error (invalid path, read failure)
  2  Not a Next.js application (no package.json with next dependency)

EXAMPLES:
  bun run scripts/assess-nextjs-app.ts ./my-next-app
  bun run scripts/assess-nextjs-app.ts /absolute/path/to/app
`);
}

function findFilesRecursive(dir: string, pattern: RegExp, maxDepth = 5, currentDepth = 0): string[] {
  if (currentDepth >= maxDepth) return [];
  const results: string[] = [];

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...findFilesRecursive(fullPath, pattern, maxDepth, currentDepth + 1));
      } else if (pattern.test(entry)) {
        results.push(fullPath);
      }
    }
  } catch {
    // Permission denied or other read error — skip
  }

  return results;
}

function extractNextPublicVars(appDir: string): string[] {
  const vars = new Set<string>();
  const envFiles = readdirSync(appDir).filter((f) => f.startsWith(".env"));

  for (const envFile of envFiles) {
    try {
      const content = readFileSync(join(appDir, envFile), "utf-8");
      const matches = content.matchAll(/^(NEXT_PUBLIC_\w+)/gm);
      for (const match of matches) {
        vars.add(match[1]);
      }
    } catch {
      // Skip unreadable files
    }
  }

  // Also scan source files for process.env.NEXT_PUBLIC_*
  const sourceFiles = findFilesRecursive(appDir, /\.(tsx?|jsx?|mjs)$/);
  for (const file of sourceFiles) {
    try {
      const content = readFileSync(file, "utf-8");
      const matches = content.matchAll(/process\.env\.(NEXT_PUBLIC_\w+)/g);
      for (const match of matches) {
        vars.add(match[1]);
      }
    } catch {
      // Skip unreadable files
    }
  }

  return Array.from(vars).sort();
}

function detectRenderingMode(appDir: string): Assessment["renderingMode"] {
  let hasSSR = false;
  let hasSSG = false;
  let hasISR = false;

  const sourceFiles = findFilesRecursive(appDir, /\.(tsx?|jsx?)$/);

  for (const file of sourceFiles) {
    try {
      const content = readFileSync(file, "utf-8");

      if (content.includes("getServerSideProps")) hasSSR = true;
      if (content.includes("getStaticProps")) hasSSG = true;
      if (content.includes("revalidate")) hasISR = true;

      // App Router patterns
      if (content.includes("export const dynamic = 'force-dynamic'")) hasSSR = true;
      if (content.includes("export const dynamic = 'force-static'")) hasSSG = true;
      if (content.includes("export const revalidate")) hasISR = true;
      if (content.includes("generateStaticParams")) hasSSG = true;
    } catch {
      // Skip
    }
  }

  if (hasSSR && hasSSG) return "hybrid";
  if (hasISR) return "isr";
  if (hasSSR) return "ssr";
  return "ssg";
}

function detectOutputConfig(appDir: string): Assessment["outputConfig"] {
  const configFiles = ["next.config.js", "next.config.mjs", "next.config.ts"];

  for (const configFile of configFiles) {
    const configPath = join(appDir, configFile);
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, "utf-8");
        if (content.includes("'standalone'") || content.includes('"standalone"')) return "standalone";
        if (content.includes("'export'") || content.includes('"export"')) return "export";
      } catch {
        // Skip
      }
    }
  }

  return "default";
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    printHelp();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const appDir = resolve(args[0]);

  if (!existsSync(appDir)) {
    console.error(JSON.stringify({ error: `Directory not found: ${appDir}` }));
    process.exit(1);
  }

  const packageJsonPath = join(appDir, "package.json");
  if (!existsSync(packageJsonPath)) {
    console.error(JSON.stringify({ error: "No package.json found. Not a Next.js application." }));
    process.exit(2);
  }

  let packageJson: any;
  try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  } catch (e) {
    console.error(JSON.stringify({ error: `Failed to parse package.json: ${e}` }));
    process.exit(1);
  }

  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  if (!allDeps.next) {
    console.error(JSON.stringify({ error: "No 'next' dependency found. Not a Next.js application." }));
    process.exit(2);
  }

  const renderingMode = detectRenderingMode(appDir);
  const outputConfig = detectOutputConfig(appDir);
  const hasApiRoutes =
    existsSync(join(appDir, "pages/api")) ||
    existsSync(join(appDir, "src/pages/api")) ||
    findFilesRecursive(join(appDir, "app"), /^route\.(ts|js)$/, 5).length > 0;
  const hasMiddleware =
    existsSync(join(appDir, "middleware.ts")) || existsSync(join(appDir, "middleware.js"));
  const hasImageOptimization =
    findFilesRecursive(appDir, /\.(tsx?|jsx?)$/).some((f) => {
      try {
        return readFileSync(f, "utf-8").includes("next/image");
      } catch {
        return false;
      }
    });
  const usesAppRouter = existsSync(join(appDir, "app")) || existsSync(join(appDir, "src/app"));
  const usesPagesRouter = existsSync(join(appDir, "pages")) || existsSync(join(appDir, "src/pages"));
  const envFiles = readdirSync(appDir).filter((f) => f.startsWith(".env"));
  const nextPublicVars = extractNextPublicVars(appDir);

  const recommendations: string[] = [];
  const cdkConstructsNeeded: string[] = ["S3 Bucket (static assets)", "CloudFront Distribution"];

  if (outputConfig !== "standalone") {
    recommendations.push(
      "Set output: 'standalone' in next.config.js for optimal Lambda deployment (20MB vs 200MB+)"
    );
  }

  if (renderingMode !== "ssg") {
    cdkConstructsNeeded.push("Lambda Function (SSR handler)");
    cdkConstructsNeeded.push("API Gateway or Lambda Function URL");
    recommendations.push("SSR detected — Lambda function required for server-side rendering");
  }

  if (hasMiddleware) {
    cdkConstructsNeeded.push("Lambda@Edge or CloudFront Function (middleware)");
    recommendations.push(
      "Middleware detected — requires Lambda@Edge in us-east-1 or CloudFront Functions"
    );
  }

  if (hasImageOptimization) {
    cdkConstructsNeeded.push("Lambda Function (image optimization)");
    recommendations.push("next/image detected — image optimization Lambda needed");
  }

  if (nextPublicVars.length > 0) {
    recommendations.push(
      `Found ${nextPublicVars.length} NEXT_PUBLIC_* vars — must build separately per environment`
    );
  }

  cdkConstructsNeeded.push("Route53 Record (DNS)");
  cdkConstructsNeeded.push("ACM Certificate (must be in us-east-1 for CloudFront)");

  const assessment: Assessment = {
    isNextApp: true,
    appDir,
    renderingMode,
    outputConfig,
    hasApiRoutes,
    hasMiddleware,
    hasImageOptimization,
    usesAppRouter,
    usesPagesRouter,
    envFiles,
    nextPublicVars,
    dependencies: {
      next: allDeps.next || "unknown",
      react: allDeps.react || "unknown",
    },
    recommendations,
    cdkConstructsNeeded,
  };

  console.log(JSON.stringify(assessment, null, 2));
}

main();
