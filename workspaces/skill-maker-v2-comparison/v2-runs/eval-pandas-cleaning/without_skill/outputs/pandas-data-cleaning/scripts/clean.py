#!/usr/bin/env python3
"""
Pandas Data Cleaning Pipeline

A reusable script that applies the full cleaning pipeline to a CSV or Parquet file.

Usage:
    python clean.py input.csv --output cleaned.csv
    python clean.py input.parquet --output cleaned.parquet --format parquet
    python clean.py input.csv --output cleaned.csv --dedup-cols id,email
    python clean.py input.csv --output cleaned.csv --type-map '{"age": "int", "date": "datetime"}'
"""

import argparse
import json
import re
import sys
from pathlib import Path

import pandas as pd
import numpy as np


# ---------------------------------------------------------------------------
# Column normalization
# ---------------------------------------------------------------------------

def to_snake_case(name: str) -> str:
    """Convert a column name to snake_case."""
    s = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", str(name))
    s = re.sub(r"([a-z\d])([A-Z])", r"\1_\2", s)
    s = re.sub(r"[\s\-\.\/\\]+", "_", s)
    s = re.sub(r"[^a-z0-9_]", "", s.lower())
    s = re.sub(r"_+", "_", s).strip("_")
    return s


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize all column names to snake_case, handling collisions."""
    rename_map = {col: to_snake_case(col) for col in df.columns}

    seen: dict[str, int] = {}
    for old, new in rename_map.items():
        if new in seen:
            seen[new] += 1
            rename_map[old] = f"{new}_{seen[new]}"
        else:
            seen[new] = 0

    return df.rename(columns=rename_map)


# ---------------------------------------------------------------------------
# Data profiling
# ---------------------------------------------------------------------------

def profile_data(df: pd.DataFrame) -> dict:
    """Generate a data quality profile."""
    return {
        "shape": df.shape,
        "columns": list(df.columns),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "missing_counts": df.isnull().sum().to_dict(),
        "missing_pct": (df.isnull().sum() / len(df) * 100).round(2).to_dict(),
        "duplicate_rows": int(df.duplicated().sum()),
        "memory_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
    }


# ---------------------------------------------------------------------------
# Missing value handling
# ---------------------------------------------------------------------------

def handle_missing_values(
    df: pd.DataFrame,
    strategy: dict | None = None,
) -> pd.DataFrame:
    """Handle missing values with per-column strategies or smart defaults."""
    if strategy is None:
        strategy = {}
        for col in df.columns:
            if df[col].isnull().sum() == 0:
                continue
            if pd.api.types.is_numeric_dtype(df[col]):
                strategy[col] = "median"
            elif pd.api.types.is_bool_dtype(df[col]):
                strategy[col] = False
            elif pd.api.types.is_datetime64_any_dtype(df[col]):
                strategy[col] = "drop"
            else:
                strategy[col] = "unknown"

    for col, method in strategy.items():
        if col not in df.columns:
            continue
        if method == "drop":
            df = df.dropna(subset=[col])
        elif method == "mean":
            df[col] = df[col].fillna(df[col].mean())
        elif method == "median":
            df[col] = df[col].fillna(df[col].median())
        elif method == "mode":
            mode_val = df[col].mode()
            if not mode_val.empty:
                df[col] = df[col].fillna(mode_val.iloc[0])
        elif method == "ffill":
            df[col] = df[col].ffill()
        elif method == "bfill":
            df[col] = df[col].bfill()
        elif method == "zero":
            df[col] = df[col].fillna(0)
        elif method == "empty":
            df[col] = df[col].fillna("")
        elif method == "unknown":
            df[col] = df[col].fillna("Unknown")
        else:
            df[col] = df[col].fillna(method)

    return df


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

def deduplicate(
    df: pd.DataFrame,
    subset: list[str] | None = None,
    keep: str = "first",
) -> pd.DataFrame:
    """Remove duplicate rows."""
    n_before = len(df)
    df = df.drop_duplicates(subset=subset, keep=keep).reset_index(drop=True)
    n_removed = n_before - len(df)
    print(f"  Removed {n_removed} duplicate rows ({n_removed / max(n_before, 1) * 100:.1f}%)")
    return df


# ---------------------------------------------------------------------------
# Type inference and conversion
# ---------------------------------------------------------------------------

def infer_types(df: pd.DataFrame) -> dict:
    """Infer better dtypes for object columns."""
    type_map: dict[str, str] = {}
    for col in df.select_dtypes(include=["object"]).columns:
        sample = df[col].dropna().head(100)
        if sample.empty:
            continue

        # Try numeric
        numeric = pd.to_numeric(sample, errors="coerce")
        if numeric.notna().sum() / len(sample) > 0.8:
            if (numeric.dropna() == numeric.dropna().astype(int)).all():
                type_map[col] = "Int64"
            else:
                type_map[col] = "float64"
            continue

        # Try datetime
        try:
            pd.to_datetime(sample, errors="raise")
            type_map[col] = "datetime"
            continue
        except (ValueError, TypeError):
            pass

        # Try boolean
        bool_values = {"true", "false", "yes", "no", "1", "0"}
        if sample.str.lower().str.strip().isin(bool_values).mean() > 0.8:
            type_map[col] = "boolean"
            continue

        # Low cardinality -> category
        if df[col].nunique() / len(df) < 0.05 and df[col].nunique() < 50:
            type_map[col] = "category"

    return type_map


def convert_types(df: pd.DataFrame, type_map: dict) -> pd.DataFrame:
    """Convert column dtypes with safe error handling."""
    for col, target in type_map.items():
        if col not in df.columns:
            continue
        try:
            if target in ("datetime", "date"):
                df[col] = pd.to_datetime(df[col], errors="coerce")
            elif target in ("int", "int64"):
                if df[col].isnull().any():
                    df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")
                else:
                    df[col] = pd.to_numeric(df[col], errors="coerce").astype("int64")
            elif target == "Int64":
                df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")
            elif target in ("float", "float64"):
                df[col] = pd.to_numeric(df[col], errors="coerce")
            elif target in ("str", "string"):
                df[col] = df[col].astype("string")
            elif target in ("bool", "boolean"):
                df[col] = df[col].map(
                    {
                        "true": True, "false": False, "1": True, "0": False,
                        "yes": True, "no": False, "True": True, "False": False,
                        True: True, False: False, 1: True, 0: False,
                    }
                )
                if df[col].isnull().any():
                    df[col] = df[col].astype("boolean")
                else:
                    df[col] = df[col].astype("bool")
            elif target == "category":
                df[col] = df[col].astype("category")
            else:
                df[col] = df[col].astype(target)
            print(f"  Converted {col} -> {target}")
        except (ValueError, TypeError) as e:
            print(f"  WARNING: Failed to convert {col} to {target}: {e}")

    return df


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_cleaned(df: pd.DataFrame, original_shape: tuple) -> dict:
    """Run validation checks on cleaned data."""
    checks = {
        "no_duplicate_columns": len(df.columns) == len(set(df.columns)),
        "no_fully_null_columns": not (df.isnull().all()).any(),
        "no_fully_null_rows": not (df.isnull().all(axis=1)).any(),
        "row_count_reasonable": 0 < len(df) <= original_shape[0],
        "columns_are_snake_case": all(
            re.match(r"^[a-z][a-z0-9_]*$", col) for col in df.columns
        ),
    }
    return checks


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

def generate_report(
    original_profile: dict,
    cleaned_df: pd.DataFrame,
    validation: dict,
) -> str:
    """Generate a human-readable cleaning report."""
    lines = [
        "# Data Cleaning Report",
        "",
        "## Summary",
        f"- **Original shape:** {original_profile['shape']}",
        f"- **Cleaned shape:** {cleaned_df.shape}",
        f"- **Rows removed:** {original_profile['shape'][0] - len(cleaned_df)}",
        f"- **Original duplicates:** {original_profile['duplicate_rows']}",
        "",
        "## Missing Values (Before)",
        "| Column | Count | Percentage |",
        "|--------|-------|------------|",
    ]

    for col, count in original_profile["missing_counts"].items():
        if count > 0:
            pct = original_profile["missing_pct"][col]
            lines.append(f"| {col} | {count} | {pct}% |")

    lines.extend([
        "",
        "## Missing Values (After)",
        f"- Total remaining nulls: {cleaned_df.isnull().sum().sum()}",
        "",
        "## Validation Checks",
        "| Check | Status |",
        "|-------|--------|",
    ])

    for check, passed in validation.items():
        status = "PASS" if passed else "FAIL"
        lines.append(f"| {check} | {status} |")

    lines.extend([
        "",
        "## Final Dtypes",
        "| Column | Dtype |",
        "|--------|-------|",
    ])

    for col in cleaned_df.columns:
        lines.append(f"| {col} | {cleaned_df[col].dtype} |")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Pandas Data Cleaning Pipeline")
    parser.add_argument("input", help="Path to input CSV or Parquet file")
    parser.add_argument("--output", "-o", required=True, help="Path to output file")
    parser.add_argument(
        "--format", "-f", default=None, choices=["csv", "parquet"],
        help="Output format (inferred from extension if not specified)",
    )
    parser.add_argument(
        "--dedup-cols", default=None,
        help="Comma-separated columns for deduplication (default: all columns)",
    )
    parser.add_argument(
        "--type-map", default=None,
        help='JSON string mapping columns to types, e.g. \'{"age": "int", "date": "datetime"}\'',
    )
    parser.add_argument(
        "--missing-strategy", default=None,
        help='JSON string mapping columns to strategies, e.g. \'{"age": "mean", "name": "drop"}\'',
    )
    parser.add_argument(
        "--report", default=None,
        help="Path to write the cleaning report (markdown)",
    )
    parser.add_argument(
        "--no-normalize", action="store_true",
        help="Skip column name normalization",
    )
    parser.add_argument(
        "--no-dedup", action="store_true",
        help="Skip deduplication",
    )
    parser.add_argument(
        "--no-type-convert", action="store_true",
        help="Skip automatic type conversion",
    )

    args = parser.parse_args()

    # Determine output format
    out_format = args.format
    if out_format is None:
        ext = Path(args.output).suffix.lower()
        out_format = "parquet" if ext in (".parquet", ".pq") else "csv"

    # Load
    print(f"Loading {args.input}...")
    input_path = Path(args.input)
    if input_path.suffix == ".csv":
        df = pd.read_csv(args.input, low_memory=False)
    elif input_path.suffix in (".parquet", ".pq"):
        df = pd.read_parquet(args.input)
    else:
        print(f"ERROR: Unsupported file format: {input_path.suffix}", file=sys.stderr)
        sys.exit(1)

    original_profile = profile_data(df)
    original_shape = df.shape
    print(f"  Shape: {df.shape}")
    print(f"  Missing values: {df.isnull().sum().sum()}")
    print(f"  Duplicate rows: {original_profile['duplicate_rows']}")

    # Normalize columns
    if not args.no_normalize:
        print("\nNormalizing column names...")
        df = normalize_columns(df)
        print(f"  Columns: {list(df.columns)}")

    # Handle missing values
    print("\nHandling missing values...")
    missing_strategy = None
    if args.missing_strategy:
        missing_strategy = json.loads(args.missing_strategy)
    df = handle_missing_values(df, strategy=missing_strategy)
    print(f"  Remaining nulls: {df.isnull().sum().sum()}")

    # Deduplicate
    if not args.no_dedup:
        print("\nDeduplicating...")
        dedup_cols = None
        if args.dedup_cols:
            dedup_cols = [c.strip() for c in args.dedup_cols.split(",")]
        df = deduplicate(df, subset=dedup_cols)

    # Convert types
    if not args.no_type_convert:
        print("\nConverting types...")
        type_map = json.loads(args.type_map) if args.type_map else infer_types(df)
        if type_map:
            df = convert_types(df, type_map)
        else:
            print("  No type conversions needed")

    # Validate
    print("\nValidating...")
    validation = validate_cleaned(df, original_shape)
    for check, passed in validation.items():
        status = "PASS" if passed else "FAIL"
        print(f"  {check}: {status}")

    # Export
    print(f"\nExporting to {args.output} ({out_format})...")
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if out_format == "csv":
        df.to_csv(output_path, index=False)
    else:
        df.to_parquet(output_path, index=False, engine="pyarrow")
    print(f"  Size: {output_path.stat().st_size / 1024:.1f} KB")

    # Report
    report = generate_report(original_profile, df, validation)
    if args.report:
        report_path = Path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(report)
        print(f"\nReport written to {args.report}")
    else:
        print(f"\n{report}")

    print("\nDone!")


if __name__ == "__main__":
    main()
