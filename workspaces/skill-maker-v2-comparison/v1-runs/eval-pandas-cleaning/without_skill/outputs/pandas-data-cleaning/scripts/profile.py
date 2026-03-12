#!/usr/bin/env python3
"""
Data Profiling Script

Quick profiling of CSV/Parquet files to understand data quality before cleaning.

Usage:
    python profile.py data.csv
    python profile.py data.parquet --detailed
    python profile.py data.csv --output profile.json

Output (JSON to stdout):
{
    "shape": [rows, cols],
    "columns": [...],
    "dtypes": {...},
    "missing_values": {...},
    "duplicate_rows": N,
    "memory_mb": N.NN,
    "numeric_stats": {...},      # --detailed only
    "categorical_stats": {...}   # --detailed only
}
"""

import argparse
import json
import sys
from pathlib import Path

import pandas as pd


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


def profile_basic(df: pd.DataFrame) -> dict:
    """Generate basic profile of a DataFrame."""
    missing = df.isnull().sum()
    missing_pct = (missing / len(df) * 100).round(2)

    return {
        "shape": list(df.shape),
        "columns": list(df.columns),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "missing_values": {
            col: {
                "count": int(missing[col]),
                "percent": float(missing_pct[col])
            }
            for col in df.columns if missing[col] > 0
        },
        "duplicate_rows": int(df.duplicated().sum()),
        "memory_mb": round(
            df.memory_usage(deep=True).sum() / 1024 / 1024, 2
        ),
    }


def profile_detailed(df: pd.DataFrame) -> dict:
    """Generate detailed profile including statistics."""
    result = profile_basic(df)

    # Numeric column stats
    numeric_cols = df.select_dtypes(include=["number"]).columns
    if len(numeric_cols) > 0:
        stats = df[numeric_cols].describe().to_dict()
        result["numeric_stats"] = {
            col: {k: round(v, 4) if isinstance(v, float) else v
                  for k, v in col_stats.items()}
            for col, col_stats in stats.items()
        }

    # Categorical column stats
    cat_cols = df.select_dtypes(include=["object", "category"]).columns
    if len(cat_cols) > 0:
        result["categorical_stats"] = {}
        for col in cat_cols:
            value_counts = df[col].value_counts()
            result["categorical_stats"][col] = {
                "unique_values": int(df[col].nunique()),
                "top_values": {
                    str(k): int(v)
                    for k, v in value_counts.head(10).items()
                },
                "sample_values": [
                    str(v) for v in df[col].dropna().unique()[:5]
                ],
            }

    # Potential sentinel values
    obj_cols = df.select_dtypes(include=["object"]).columns
    sentinels_found = {}
    known_sentinels = {
        "", "N/A", "n/a", "NA", "na", "NULL", "null",
        "None", "none", "-", "--", ".", "?", "NaN", "nan",
    }
    for col in obj_cols:
        found = set()
        for val in df[col].dropna().unique():
            if str(val).strip() in known_sentinels:
                found.add(str(val).strip())
        if found:
            sentinels_found[col] = list(found)
    if sentinels_found:
        result["sentinel_values_detected"] = sentinels_found

    return result


def main():
    parser = argparse.ArgumentParser(
        description="Profile a CSV or Parquet file for data quality"
    )
    parser.add_argument("input", help="Input file path (CSV or Parquet)")
    parser.add_argument("--detailed", "-d", action="store_true",
                        help="Include detailed statistics")
    parser.add_argument("--output", "-o",
                        help="Save profile to JSON file")
    args = parser.parse_args()

    df = load_data(args.input)

    if args.detailed:
        result = profile_detailed(df)
    else:
        result = profile_basic(df)

    output = json.dumps(result, indent=2)
    print(output)

    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        with open(args.output, "w") as f:
            f.write(output)
        print(f"Profile saved to {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
