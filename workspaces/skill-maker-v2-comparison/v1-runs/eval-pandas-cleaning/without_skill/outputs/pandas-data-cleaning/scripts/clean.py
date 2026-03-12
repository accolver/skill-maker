#!/usr/bin/env python3
"""
Pandas Data Cleaning Pipeline

A reusable cleaning pipeline that applies the standard workflow:
load -> profile -> normalize columns -> handle missing -> deduplicate ->
convert types -> export.

Usage:
    python clean.py input.csv --output cleaned.csv --config cleaning_config.json
    python clean.py input.parquet --output cleaned.parquet --report report.json

Config file format (JSON):
{
    "missing_strategies": {
        "email": "drop",
        "age": "median",
        "city": "unknown"
    },
    "dedup_columns": ["email"],
    "dedup_keep": "last",
    "type_conversions": {
        "age": "int",
        "created_at": "datetime",
        "is_active": "bool"
    },
    "drop_columns": ["unused_col"],
    "sentinel_values": ["N/A", "null", ""]
}
"""

import argparse
import json
import re
import sys
from pathlib import Path

import pandas as pd


# --- Column Normalization ---

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names to lowercase snake_case."""
    df = df.copy()
    df.columns = [
        re.sub(r'[^a-z0-9]+', '_', col.strip().lower()).strip('_')
        for col in df.columns
    ]
    # Handle duplicate column names
    seen: dict[str, int] = {}
    new_cols: list[str] = []
    for col in df.columns:
        if col in seen:
            seen[col] += 1
            new_cols.append(f"{col}_{seen[col]}")
        else:
            seen[col] = 0
            new_cols.append(col)
    df.columns = new_cols
    return df


# --- Sentinel Replacement ---

DEFAULT_SENTINELS = [
    "", "N/A", "n/a", "NA", "na", "NULL", "null",
    "None", "none", "-", "--", ".", "?", "NaN", "nan",
    "#N/A", "#REF!", "#VALUE!", "undefined",
]


def replace_sentinels(df: pd.DataFrame,
                      sentinels: list[str] | None = None) -> pd.DataFrame:
    """Replace sentinel string values with pd.NA."""
    df = df.copy()
    values = sentinels if sentinels is not None else DEFAULT_SENTINELS
    df = df.replace(values, pd.NA)
    return df


# --- Missing Value Handling ---

def handle_missing(df: pd.DataFrame, strategies: dict) -> pd.DataFrame:
    """Apply per-column missing value strategies."""
    df = df.copy()
    for col, strategy in strategies.items():
        if col not in df.columns:
            print(f"Warning: column '{col}' not found, skipping",
                  file=sys.stderr)
            continue
        if strategy == "drop":
            df = df.dropna(subset=[col])
        elif strategy == "mean":
            df[col] = df[col].fillna(df[col].mean())
        elif strategy == "median":
            df[col] = df[col].fillna(df[col].median())
        elif strategy == "mode":
            mode_val = df[col].mode()
            if not mode_val.empty:
                df[col] = df[col].fillna(mode_val.iloc[0])
        elif strategy == "ffill":
            df[col] = df[col].ffill()
        elif strategy == "bfill":
            df[col] = df[col].bfill()
        elif strategy == "zero":
            df[col] = df[col].fillna(0)
        elif strategy == "empty":
            df[col] = df[col].fillna("")
        elif strategy == "unknown":
            df[col] = df[col].fillna("Unknown")
        else:
            df[col] = df[col].fillna(strategy)
    return df


# --- Deduplication ---

def deduplicate(df: pd.DataFrame,
                subset: list[str] | None = None,
                keep: str = "first") -> pd.DataFrame:
    """Remove duplicate rows."""
    before = len(df)
    df = df.drop_duplicates(subset=subset, keep=keep).reset_index(drop=True)
    after = len(df)
    removed = before - after
    if removed > 0:
        print(f"Deduplication: {before} -> {after} rows "
              f"({removed} removed)", file=sys.stderr)
    return df


# --- Type Conversion ---

def convert_types(df: pd.DataFrame, type_map: dict) -> pd.DataFrame:
    """Convert column types safely."""
    df = df.copy()
    true_vals = {"true", "yes", "1", "t", "y"}
    false_vals = {"false", "no", "0", "f", "n"}

    for col, target in type_map.items():
        if col not in df.columns:
            print(f"Warning: column '{col}' not found, skipping",
                  file=sys.stderr)
            continue
        try:
            if target == "int":
                df[col] = pd.to_numeric(
                    df[col], errors="coerce"
                ).astype("Int64")
            elif target == "float":
                df[col] = pd.to_numeric(df[col], errors="coerce")
            elif target == "str":
                df[col] = df[col].astype(str).replace("nan", pd.NA)
            elif target == "bool":
                df[col] = (
                    df[col].astype(str).str.lower().str.strip()
                    .map(lambda x: True if x in true_vals
                         else (False if x in false_vals else pd.NA))
                )
            elif target == "datetime":
                df[col] = pd.to_datetime(df[col], errors="coerce")
            elif target == "category":
                df[col] = df[col].astype("category")
            elif target.startswith("%"):
                df[col] = pd.to_datetime(
                    df[col], format=target, errors="coerce"
                )
            else:
                df[col] = df[col].astype(target)
        except Exception as e:
            print(f"Warning: Could not convert {col} to {target}: {e}",
                  file=sys.stderr)
    return df


# --- Cleaning Report ---

def cleaning_report(original: pd.DataFrame,
                    cleaned: pd.DataFrame) -> dict:
    """Generate a summary of all cleaning operations."""
    report = {
        "original_shape": list(original.shape),
        "cleaned_shape": list(cleaned.shape),
        "rows_removed": len(original) - len(cleaned),
        "columns_removed": len(original.columns) - len(cleaned.columns),
        "missing_values_before": int(original.isnull().sum().sum()),
        "missing_values_after": int(cleaned.isnull().sum().sum()),
        "duplicate_rows_before": int(original.duplicated().sum()),
        "duplicate_rows_after": int(cleaned.duplicated().sum()),
        "dtypes_after": {
            col: str(dtype) for col, dtype in cleaned.dtypes.items()
        },
    }
    return report


# --- Data Profiling ---

def profile(df: pd.DataFrame) -> dict:
    """Profile a DataFrame and return summary statistics."""
    missing = df.isnull().sum()
    missing_pct = (missing / len(df) * 100).round(2)

    return {
        "shape": list(df.shape),
        "columns": list(df.columns),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "missing_values": {
            col: {"count": int(missing[col]),
                  "percent": float(missing_pct[col])}
            for col in df.columns if missing[col] > 0
        },
        "duplicate_rows": int(df.duplicated().sum()),
        "memory_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
    }


# --- Main Pipeline ---

def load_data(path: str) -> pd.DataFrame:
    """Load CSV or Parquet based on file extension."""
    p = Path(path)
    if p.suffix.lower() == ".parquet":
        return pd.read_parquet(path)
    elif p.suffix.lower() in (".csv", ".tsv"):
        sep = "\t" if p.suffix.lower() == ".tsv" else ","
        return pd.read_csv(path, sep=sep)
    else:
        raise ValueError(f"Unsupported file format: {p.suffix}")


def save_data(df: pd.DataFrame, path: str) -> None:
    """Save to CSV or Parquet based on file extension."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    if p.suffix.lower() == ".parquet":
        df.to_parquet(path, index=False)
    elif p.suffix.lower() in (".csv", ".tsv"):
        sep = "\t" if p.suffix.lower() == ".tsv" else ","
        df.to_csv(path, index=False, sep=sep)
    else:
        raise ValueError(f"Unsupported file format: {p.suffix}")
    print(f"Saved {len(df)} rows to {path}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(
        description="Clean tabular data using a standard pipeline"
    )
    parser.add_argument("input", help="Input file path (CSV or Parquet)")
    parser.add_argument("--output", "-o", help="Output file path")
    parser.add_argument("--config", "-c",
                        help="JSON config file with cleaning strategies")
    parser.add_argument("--report", "-r",
                        help="Path to save cleaning report JSON")
    parser.add_argument("--profile-only", action="store_true",
                        help="Only profile the data, don't clean")
    args = parser.parse_args()

    # Load
    df = load_data(args.input)
    df_original = df.copy()

    # Profile only mode
    if args.profile_only:
        result = profile(df)
        print(json.dumps(result, indent=2))
        return

    # Load config
    config = {}
    if args.config:
        with open(args.config) as f:
            config = json.load(f)

    # Pipeline
    df = normalize_columns(df)
    df = replace_sentinels(df, config.get("sentinel_values"))

    # Drop columns
    drop_cols = config.get("drop_columns", [])
    df = df.drop(columns=[c for c in drop_cols if c in df.columns])

    # Handle missing
    if "missing_strategies" in config:
        df = handle_missing(df, config["missing_strategies"])

    # Deduplicate
    dedup_cols = config.get("dedup_columns")
    dedup_keep = config.get("dedup_keep", "first")
    df = deduplicate(df, subset=dedup_cols, keep=dedup_keep)

    # Convert types
    if "type_conversions" in config:
        df = convert_types(df, config["type_conversions"])

    # Reset index
    df = df.reset_index(drop=True)

    # Report
    report = cleaning_report(df_original, df)
    print(json.dumps(report, indent=2))

    if args.report:
        Path(args.report).parent.mkdir(parents=True, exist_ok=True)
        with open(args.report, "w") as f:
            json.dump(report, f, indent=2)
        print(f"Report saved to {args.report}", file=sys.stderr)

    # Save
    if args.output:
        save_data(df, args.output)
    else:
        output_path = str(Path(args.input).with_stem(
            Path(args.input).stem + "_cleaned"
        ))
        save_data(df, output_path)


if __name__ == "__main__":
    main()
