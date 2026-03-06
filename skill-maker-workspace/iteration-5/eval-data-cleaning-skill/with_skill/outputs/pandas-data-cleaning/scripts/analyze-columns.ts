#!/usr/bin/env bun

/**
 * analyze-columns — Analyze CSV/Parquet file columns and suggest cleaning actions.
 *
 * Reads a data file and outputs a structured JSON report with column types,
 * null counts, unique values, and recommended cleaning strategies.
 */

const HELP = `
analyze-columns — Analyze data file columns and suggest cleaning actions.

USAGE
  bun run scripts/analyze-columns.ts --file <path>
  bun run scripts/analyze-columns.ts --file data.csv --sample 1000

ARGUMENTS
  --file <path>     Path to a CSV or Parquet file (required)
  --sample <n>      Number of rows to sample for analysis (default: all)
  --format <fmt>    Force file format: csv or parquet (default: auto-detect)
  --help            Show this help message

OUTPUT
  JSON to stdout with fields:
    file_path       - Path to the analyzed file
    row_count       - Total number of rows
    column_count    - Total number of columns
    columns         - Array of column analysis objects
    suggested_order - Recommended cleaning operation order

EXIT CODES
  0   Success
  1   Error (file not found, parse failure)

EXAMPLES
  bun run scripts/analyze-columns.ts --file data.csv
  bun run scripts/analyze-columns.ts --file sales.csv --sample 500
`.trim();

import { readFileSync, existsSync } from "node:fs";
import { extname } from "node:path";

// --- Types ---

interface ColumnAnalysis {
  name: string;
  original_name: string;
  normalized_name: string;
  inferred_type: string;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  sample_values: string[];
  has_sentinel_values: boolean;
  sentinel_values_found: string[];
  suggested_actions: string[];
}

interface AnalysisResult {
  file_path: string;
  row_count: number;
  column_count: number;
  columns: ColumnAnalysis[];
  suggested_order: string[];
  duplicate_row_count: number;
}

// --- CSV Parser (simple, handles quoted fields) ---

function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);

  return { headers, rows };
}

// --- Analysis helpers ---

const SENTINEL_VALUES = new Set([
  "N/A", "n/a", "NA", "na", "null", "NULL", "None", "none",
  "NaN", "nan", "-", "--", "?", "??", ".", "..", "missing",
  "MISSING", "undefined", "UNDEFINED", "#N/A", "#REF!", "#VALUE!",
  "not available", "Not Available", "NOT AVAILABLE",
]);

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function inferType(values: string[]): string {
  const nonEmpty = values.filter(
    (v) => v !== "" && !SENTINEL_VALUES.has(v)
  );
  if (nonEmpty.length === 0) return "unknown";

  const sample = nonEmpty.slice(0, 100);

  // Check if numeric
  const numericCount = sample.filter((v) =>
    /^-?[\d,]+\.?\d*$/.test(v.replace(/[$€£¥,]/g, ""))
  ).length;
  if (numericCount / sample.length > 0.8) return "numeric";

  // Check if date
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // ISO
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/, // US
    /^\d{1,2}-\d{1,2}-\d{2,4}/, // EU
    /^\w{3}\s+\d{1,2},?\s+\d{4}/, // Mon DD, YYYY
  ];
  const dateCount = sample.filter((v) =>
    datePatterns.some((p) => p.test(v))
  ).length;
  if (dateCount / sample.length > 0.8) return "datetime";

  // Check if boolean
  const boolValues = new Set([
    "true", "false", "yes", "no", "y", "n", "1", "0",
    "True", "False", "TRUE", "FALSE", "Yes", "No", "YES", "NO",
  ]);
  const boolCount = sample.filter((v) => boolValues.has(v)).length;
  if (boolCount / sample.length > 0.8) return "boolean";

  // Check cardinality for category
  const uniqueRatio = new Set(sample).size / sample.length;
  if (uniqueRatio < 0.05 && sample.length > 20) return "category";

  return "string";
}

function suggestActions(col: ColumnAnalysis): string[] {
  const actions: string[] = [];

  // Column name normalization
  if (col.name !== col.normalized_name) {
    actions.push(`Rename column: "${col.name}" → "${col.normalized_name}"`);
  }

  // Sentinel values
  if (col.has_sentinel_values) {
    actions.push(
      `Replace sentinel values with pd.NA: ${col.sentinel_values_found.join(", ")}`
    );
  }

  // Missing values
  if (col.null_percentage > 0) {
    if (col.null_percentage > 50) {
      actions.push("Consider dropping column (>50% missing)");
    } else if (col.null_percentage > 5) {
      if (col.inferred_type === "numeric") {
        actions.push("Fill missing with median (numeric, >5% missing)");
      } else if (col.inferred_type === "category") {
        actions.push("Fill missing with mode (categorical)");
      } else {
        actions.push('Fill missing with "Unknown" or appropriate default');
      }
    } else {
      actions.push("Drop rows with missing values (<5% missing)");
    }
  }

  // Type conversion
  if (col.inferred_type === "numeric") {
    actions.push("Convert to numeric with pd.to_numeric(errors='coerce')");
  } else if (col.inferred_type === "datetime") {
    actions.push("Convert to datetime with pd.to_datetime(errors='coerce')");
  } else if (col.inferred_type === "boolean") {
    actions.push("Convert to boolean using value mapping");
  } else if (col.inferred_type === "category") {
    actions.push("Convert to category dtype for memory efficiency");
  }

  return actions;
}

// --- Main ---

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  const fileIdx = args.indexOf("--file");
  if (fileIdx === -1 || !args[fileIdx + 1]) {
    console.error("Error: --file argument is required.");
    console.error('Run with --help for usage information.');
    process.exit(1);
  }

  const filePath = args[fileIdx + 1];

  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const sampleIdx = args.indexOf("--sample");
  const sampleSize = sampleIdx !== -1 ? parseInt(args[sampleIdx + 1], 10) : Infinity;

  const ext = extname(filePath).toLowerCase();
  if (ext === ".parquet") {
    console.error("Error: Parquet files require Python pandas. Use this script for CSV files only.");
    console.error("For Parquet, use: python -c \"import pandas as pd; print(pd.read_parquet('file.parquet').describe())\"");
    process.exit(1);
  }

  const content = readFileSync(filePath, "utf-8");
  const { headers, rows } = parseCSV(content);

  const sampledRows = rows.slice(0, sampleSize);

  // Detect duplicate rows
  const rowStrings = sampledRows.map((r) => r.join("|||"));
  const uniqueRows = new Set(rowStrings);
  const duplicateCount = rowStrings.length - uniqueRows.size;

  const columns: ColumnAnalysis[] = headers.map((header, colIdx) => {
    const values = sampledRows.map((row) => row[colIdx] || "");
    const nonEmpty = values.filter((v) => v !== "");
    const nullCount = values.filter(
      (v) => v === "" || SENTINEL_VALUES.has(v)
    ).length;
    const uniqueValues = new Set(nonEmpty);
    const sentinelsFound = values.filter((v) => SENTINEL_VALUES.has(v));
    const uniqueSentinels = [...new Set(sentinelsFound)];

    const col: ColumnAnalysis = {
      name: header,
      original_name: header,
      normalized_name: normalizeName(header),
      inferred_type: inferType(values),
      null_count: nullCount,
      null_percentage: values.length > 0
        ? Math.round((nullCount / values.length) * 10000) / 100
        : 0,
      unique_count: uniqueValues.size,
      sample_values: [...uniqueValues].slice(0, 5),
      has_sentinel_values: uniqueSentinels.length > 0,
      sentinel_values_found: uniqueSentinels,
      suggested_actions: [],
    };

    col.suggested_actions = suggestActions(col);
    return col;
  });

  const result: AnalysisResult = {
    file_path: filePath,
    row_count: sampledRows.length,
    column_count: headers.length,
    columns,
    suggested_order: [
      "1. Normalize column names",
      "2. Replace sentinel values with pd.NA",
      "3. Handle missing values (per-column strategy)",
      "4. Deduplicate rows",
      "5. Convert column types",
      "6. Validate and export",
    ],
    duplicate_row_count: duplicateCount,
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
