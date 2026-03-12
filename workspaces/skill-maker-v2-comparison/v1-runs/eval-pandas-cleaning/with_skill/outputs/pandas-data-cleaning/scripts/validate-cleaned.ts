#!/usr/bin/env bun
/**
 * validate-cleaned.ts — Validate a cleaned CSV against a set of rules.
 *
 * Usage:
 *   bun run scripts/validate-cleaned.ts <file-path> [--rules <rules-json>]
 *
 * Options:
 *   --rules <path>   Path to a JSON rules file (see below for format)
 *   --help           Show this help message
 *
 * Rules JSON format:
 *   {
 *     "required_columns": ["email", "name"],
 *     "no_nulls": ["email", "customer_id"],
 *     "unique_on": ["email"],
 *     "type_checks": {
 *       "age": "numeric",
 *       "created_at": "datetime",
 *       "is_active": "boolean"
 *     },
 *     "min_rows": 1
 *   }
 *
 * Output (JSON to stdout):
 *   {
 *     "valid": false,
 *     "checks": [
 *       { "rule": "no_nulls", "column": "email", "passed": true, "detail": "0 nulls" },
 *       { "rule": "unique_on", "column": "email", "passed": false, "detail": "3 duplicates found" }
 *     ],
 *     "summary": { "passed": 4, "failed": 1, "total": 5 }
 *   }
 *
 * Exit codes:
 *   0  All checks passed
 *   1  One or more checks failed
 *   2  Invalid arguments or file not found
 */

import { readFileSync, existsSync } from "fs";

interface Rules {
  required_columns?: string[];
  no_nulls?: string[];
  unique_on?: string[];
  type_checks?: Record<string, "numeric" | "datetime" | "boolean">;
  min_rows?: number;
}

interface CheckResult {
  rule: string;
  column?: string;
  passed: boolean;
  detail: string;
}

interface ValidationReport {
  valid: boolean;
  checks: CheckResult[];
  summary: { passed: number; failed: number; total: number };
}

const SENTINEL_VALUES = new Set([
  "N/A", "n/a", "NA", "na", "null", "NULL", "None", "none",
  "-", "--", "?", ".", "NaN", "nan", "",
]);

function showHelp(): void {
  console.error(`validate-cleaned.ts — Validate a cleaned CSV against rules

Usage:
  bun run scripts/validate-cleaned.ts <file-path> [--rules <rules-json>]

Options:
  --rules <path>   Path to a JSON rules file
  --help           Show this help message`);
}

function parseCSV(content: string): string[][] {
  const lines = content.split("\n").filter((l) => l.trim() !== "");
  return lines.map((line) => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && !inQuotes) {
        inQuotes = true;
      } else if (ch === '"' && inQuotes) {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  });
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.length === 0) {
    showHelp();
    process.exit(args.includes("--help") ? 0 : 2);
  }

  const filePath = args[0];
  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(2);
  }

  // Load rules
  let rules: Rules = {};
  if (args.includes("--rules")) {
    const rulesPath = args[args.indexOf("--rules") + 1];
    if (!rulesPath || !existsSync(rulesPath)) {
      console.error(`Error: Rules file not found: ${rulesPath}`);
      process.exit(2);
    }
    rules = JSON.parse(readFileSync(rulesPath, "utf-8"));
  }

  const content = readFileSync(filePath, "utf-8");
  const rows = parseCSV(content);
  const headers = rows[0]?.map((h) => h.replace(/^"|"$/g, "")) ?? [];
  const dataRows = rows.slice(1);

  const checks: CheckResult[] = [];

  // Check min_rows
  if (rules.min_rows !== undefined) {
    checks.push({
      rule: "min_rows",
      passed: dataRows.length >= rules.min_rows,
      detail: `${dataRows.length} rows (minimum: ${rules.min_rows})`,
    });
  }

  // Check required_columns
  for (const col of rules.required_columns ?? []) {
    checks.push({
      rule: "required_columns",
      column: col,
      passed: headers.includes(col),
      detail: headers.includes(col) ? "present" : "missing",
    });
  }

  // Check no_nulls
  for (const col of rules.no_nulls ?? []) {
    const colIdx = headers.indexOf(col);
    if (colIdx === -1) {
      checks.push({
        rule: "no_nulls",
        column: col,
        passed: false,
        detail: "column not found",
      });
      continue;
    }
    const nullCount = dataRows.filter(
      (row) => !row[colIdx] || SENTINEL_VALUES.has(row[colIdx])
    ).length;
    checks.push({
      rule: "no_nulls",
      column: col,
      passed: nullCount === 0,
      detail: `${nullCount} nulls/sentinels found`,
    });
  }

  // Check unique_on
  for (const col of rules.unique_on ?? []) {
    const colIdx = headers.indexOf(col);
    if (colIdx === -1) {
      checks.push({
        rule: "unique_on",
        column: col,
        passed: false,
        detail: "column not found",
      });
      continue;
    }
    const values = dataRows.map((row) => row[colIdx]);
    const dupes = values.length - new Set(values).size;
    checks.push({
      rule: "unique_on",
      column: col,
      passed: dupes === 0,
      detail: dupes === 0 ? "all unique" : `${dupes} duplicates found`,
    });
  }

  // Check type_checks
  for (const [col, expectedType] of Object.entries(rules.type_checks ?? {})) {
    const colIdx = headers.indexOf(col);
    if (colIdx === -1) {
      checks.push({
        rule: "type_checks",
        column: col,
        passed: false,
        detail: "column not found",
      });
      continue;
    }
    const values = dataRows
      .map((row) => row[colIdx])
      .filter((v) => v && !SENTINEL_VALUES.has(v));

    let badCount = 0;
    if (expectedType === "numeric") {
      badCount = values.filter((v) => isNaN(Number(v))).length;
    } else if (expectedType === "datetime") {
      badCount = values.filter((v) => isNaN(Date.parse(v))).length;
    } else if (expectedType === "boolean") {
      const boolSet = new Set(["true", "false", "1", "0", "yes", "no"]);
      badCount = values.filter((v) => !boolSet.has(v.toLowerCase())).length;
    }

    checks.push({
      rule: "type_checks",
      column: col,
      passed: badCount === 0,
      detail:
        badCount === 0
          ? `all values are ${expectedType}`
          : `${badCount} values are not ${expectedType}`,
    });
  }

  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed).length;

  const report: ValidationReport = {
    valid: failed === 0,
    checks,
    summary: { passed, failed, total: checks.length },
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(failed > 0 ? 1 : 0);
}

main();
