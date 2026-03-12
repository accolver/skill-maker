#!/usr/bin/env bun
/**
 * inspect-csv.ts — Inspect a CSV or Parquet file and produce a structured
 * JSON report of its shape, types, missing values, and sample data.
 *
 * Usage:
 *   bun run scripts/inspect-csv.ts <file-path> [--rows <n>] [--json]
 *
 * Options:
 *   --rows <n>   Number of sample rows to include (default: 5)
 *   --json       Output raw JSON instead of formatted text
 *   --help       Show this help message
 *
 * Output (JSON to stdout):
 *   {
 *     "file": "data.csv",
 *     "rows": 10000,
 *     "columns": 15,
 *     "column_info": [
 *       {
 *         "name": "age",
 *         "inferred_type": "numeric",
 *         "null_count": 42,
 *         "null_pct": 0.42,
 *         "unique_count": 85,
 *         "sample_values": ["25", "30", "N/A", "45", ""]
 *       }
 *     ],
 *     "sentinel_candidates": ["N/A", "", "null"],
 *     "duplicate_rows": 150,
 *     "recommendations": [
 *       "Column 'age' has 42 nulls (0.42%) — consider median fill",
 *       "Found 150 exact duplicate rows — deduplicate before analysis"
 *     ]
 *   }
 *
 * Exit codes:
 *   0  Success
 *   1  File not found or unreadable
 *   2  Invalid arguments
 */

import { readFileSync, existsSync } from "fs";
import { basename, extname } from "path";

const SENTINEL_VALUES = new Set([
  "N/A", "n/a", "NA", "na", "null", "NULL", "None", "none",
  "-", "--", "?", ".", "NaN", "nan", "#N/A", "#NA", "missing",
  "MISSING", "undefined", "UNDEFINED", "",
]);

interface ColumnInfo {
  name: string;
  inferred_type: "numeric" | "datetime" | "boolean" | "text" | "empty";
  null_count: number;
  null_pct: number;
  unique_count: number;
  sample_values: string[];
  sentinel_values_found: string[];
}

interface InspectionReport {
  file: string;
  rows: number;
  columns: number;
  column_info: ColumnInfo[];
  sentinel_candidates: string[];
  duplicate_rows: number;
  recommendations: string[];
}

function showHelp(): void {
  console.error(`inspect-csv.ts — Inspect a CSV file and produce a structured report

Usage:
  bun run scripts/inspect-csv.ts <file-path> [--rows <n>] [--json]

Options:
  --rows <n>   Number of sample rows to include (default: 5)
  --json       Output raw JSON instead of formatted text
  --help       Show this help message`);
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

function inferType(values: string[]): "numeric" | "datetime" | "boolean" | "text" | "empty" {
  const nonEmpty = values.filter((v) => v !== "" && !SENTINEL_VALUES.has(v));
  if (nonEmpty.length === 0) return "empty";

  const numericCount = nonEmpty.filter((v) => !isNaN(Number(v))).length;
  if (numericCount / nonEmpty.length > 0.8) return "numeric";

  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/,
    /^\d{2}\/\d{2}\/\d{4}/,
    /^\d{2}-\d{2}-\d{4}/,
  ];
  const dateCount = nonEmpty.filter((v) =>
    datePatterns.some((p) => p.test(v))
  ).length;
  if (dateCount / nonEmpty.length > 0.8) return "datetime";

  const boolValues = new Set(["true", "false", "yes", "no", "y", "n", "1", "0"]);
  const boolCount = nonEmpty.filter((v) => boolValues.has(v.toLowerCase())).length;
  if (boolCount / nonEmpty.length > 0.8) return "boolean";

  return "text";
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.length === 0) {
    showHelp();
    process.exit(args.includes("--help") ? 0 : 2);
  }

  const filePath = args[0];
  const sampleRows = args.includes("--rows")
    ? parseInt(args[args.indexOf("--rows") + 1], 10) || 5
    : 5;
  const jsonOutput = args.includes("--json");

  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const ext = extname(filePath).toLowerCase();
  if (ext === ".parquet") {
    console.error("Parquet inspection requires Python. Use the Python inspect script or convert to CSV first.");
    process.exit(2);
  }

  const content = readFileSync(filePath, "utf-8");
  const rows = parseCSV(content);

  if (rows.length < 2) {
    console.error("Error: File has fewer than 2 rows (need header + data)");
    process.exit(1);
  }

  const headers = rows[0].map((h) => h.replace(/^"|"$/g, ""));
  const dataRows = rows.slice(1);

  // Analyze each column
  const allSentinels = new Set<string>();
  const columnInfo: ColumnInfo[] = headers.map((name, colIdx) => {
    const values = dataRows.map((row) => row[colIdx] ?? "");
    const sentinelsFound = [...new Set(values.filter((v) => SENTINEL_VALUES.has(v)))];
    sentinelsFound.forEach((s) => allSentinels.add(s));

    const nullCount = values.filter(
      (v) => v === "" || SENTINEL_VALUES.has(v)
    ).length;

    return {
      name,
      inferred_type: inferType(values),
      null_count: nullCount,
      null_pct: Math.round((nullCount / values.length) * 10000) / 100,
      unique_count: new Set(values).size,
      sample_values: values.slice(0, sampleRows),
      sentinel_values_found: sentinelsFound,
    };
  });

  // Count exact duplicate rows
  const rowStrings = dataRows.map((r) => r.join("|||"));
  const uniqueRows = new Set(rowStrings);
  const duplicateRows = dataRows.length - uniqueRows.size;

  // Generate recommendations
  const recommendations: string[] = [];

  for (const col of columnInfo) {
    if (col.null_pct > 50) {
      recommendations.push(
        `Column '${col.name}' is ${col.null_pct}% null — consider dropping this column`
      );
    } else if (col.null_pct > 0) {
      const strategy =
        col.inferred_type === "numeric"
          ? "median fill"
          : col.inferred_type === "text"
          ? "fill with 'unknown'"
          : "appropriate fill strategy";
      recommendations.push(
        `Column '${col.name}' has ${col.null_count} nulls (${col.null_pct}%) — consider ${strategy}`
      );
    }
    if (col.sentinel_values_found.length > 0) {
      recommendations.push(
        `Column '${col.name}' contains sentinel values: ${col.sentinel_values_found.join(", ")} — replace with pd.NA`
      );
    }
  }

  if (duplicateRows > 0) {
    recommendations.push(
      `Found ${duplicateRows} exact duplicate rows — deduplicate before analysis`
    );
  }

  const report: InspectionReport = {
    file: basename(filePath),
    rows: dataRows.length,
    columns: headers.length,
    column_info: columnInfo,
    sentinel_candidates: [...allSentinels],
    duplicate_rows: duplicateRows,
    recommendations,
  };

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\n=== Inspection Report: ${report.file} ===`);
    console.log(`Rows: ${report.rows} | Columns: ${report.columns} | Duplicates: ${report.duplicate_rows}`);
    console.log(`\nColumns:`);
    for (const col of report.column_info) {
      const nullInfo = col.null_count > 0 ? ` | nulls: ${col.null_count} (${col.null_pct}%)` : "";
      const sentinelInfo =
        col.sentinel_values_found.length > 0
          ? ` | sentinels: ${col.sentinel_values_found.join(", ")}`
          : "";
      console.log(`  ${col.name}: ${col.inferred_type}${nullInfo}${sentinelInfo}`);
    }
    if (recommendations.length > 0) {
      console.log(`\nRecommendations:`);
      for (const rec of recommendations) {
        console.log(`  - ${rec}`);
      }
    }
    // Also output JSON for programmatic use
    console.log(`\n--- JSON ---`);
    console.log(JSON.stringify(report, null, 2));
  }
}

main();
