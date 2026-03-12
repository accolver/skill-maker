#!/usr/bin/env python3
"""
Data Profiling Script

Quick profiling of a CSV or Parquet file to understand data quality issues
before cleaning.

Usage:
    python profile.py data.csv
    python profile.py data.parquet --json
    python profile.py data.csv --sample 1000
"""

import argparse
import json
import sys
from pathlib import Path

import pandas as pd
import numpy as np


def load_data(filepath: str, sample_size: int | None = None) -> pd.DataFrame:
    """Load a CSV or Parquet file."""
    path = Path(filepath)
    if path.suffix == ".csv":
        df = pd.read_csv(filepath, low_memory=False)
    elif path.suffix in (".parquet", ".pq"):
        df = pd.read_parquet(filepath)
    else:
        raise ValueError(f"Unsupported format: {path.suffix}")

    if sample_size and len(df) > sample_size:
        df = df.sample(n=sample_size, random_state=42)

    return df


def profile_column(series: pd.Series) -> dict:
    """Profile a single column."""
    info = {
        "dtype": str(series.dtype),
        "null_count": int(series.isnull().sum()),
        "null_pct": round(series.isnull().sum() / len(series) * 100, 2),
        "unique_count": int(series.nunique()),
        "unique_pct": round(series.nunique() / max(len(series), 1) * 100, 2),
    }

    non_null = series.dropna()

    if pd.api.types.is_numeric_dtype(series):
        info.update({
            "min": float(non_null.min()) if len(non_null) > 0 else None,
            "max": float(non_null.max()) if len(non_null) > 0 else None,
            "mean": round(float(non_null.mean()), 4) if len(non_null) > 0 else None,
            "median": float(non_null.median()) if len(non_null) > 0 else None,
            "std": round(float(non_null.std()), 4) if len(non_null) > 0 else None,
            "zeros": int((non_null == 0).sum()),
            "negatives": int((non_null < 0).sum()),
        })
    elif series.dtype == "object" or str(series.dtype) == "string":
        if len(non_null) > 0:
            lengths = non_null.astype(str).str.len()
            info.update({
                "min_length": int(lengths.min()),
                "max_length": int(lengths.max()),
                "avg_length": round(float(lengths.mean()), 1),
                "empty_strings": int((non_null.astype(str).str.strip() == "").sum()),
            })
            # Top values
            top = non_null.value_counts().head(5)
            info["top_values"] = {str(k): int(v) for k, v in top.items()}

            # Potential type detection
            numeric_pct = pd.to_numeric(non_null, errors="coerce").notna().sum() / len(non_null)
            if numeric_pct > 0.8:
                info["potential_type"] = "numeric"
            else:
                try:
                    pd.to_datetime(non_null.head(50), errors="raise")
                    info["potential_type"] = "datetime"
                except (ValueError, TypeError):
                    bool_vals = {"true", "false", "yes", "no", "1", "0"}
                    if non_null.str.lower().str.strip().isin(bool_vals).mean() > 0.8:
                        info["potential_type"] = "boolean"

    elif pd.api.types.is_datetime64_any_dtype(series):
        if len(non_null) > 0:
            info.update({
                "min": str(non_null.min()),
                "max": str(non_null.max()),
            })

    return info


def profile_dataframe(df: pd.DataFrame) -> dict:
    """Generate a full profile of the dataframe."""
    profile = {
        "overview": {
            "rows": len(df),
            "columns": len(df.columns),
            "total_nulls": int(df.isnull().sum().sum()),
            "total_null_pct": round(
                df.isnull().sum().sum() / (len(df) * len(df.columns)) * 100, 2
            ),
            "duplicate_rows": int(df.duplicated().sum()),
            "duplicate_pct": round(df.duplicated().sum() / max(len(df), 1) * 100, 2),
            "memory_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
        },
        "columns": {},
    }

    for col in df.columns:
        profile["columns"][col] = profile_column(df[col])

    # Detect potential issues
    issues = []
    for col, info in profile["columns"].items():
        if info["null_pct"] > 50:
            issues.append(f"Column '{col}' is >50% null ({info['null_pct']}%)")
        if info["unique_count"] == 1:
            issues.append(f"Column '{col}' has only 1 unique value (constant)")
        if info["unique_count"] == len(df) and info["dtype"] == "object":
            issues.append(f"Column '{col}' has all unique values (possible ID)")
        if "potential_type" in info:
            issues.append(
                f"Column '{col}' is object but looks like {info['potential_type']}"
            )
        if "empty_strings" in info and info["empty_strings"] > 0:
            issues.append(
                f"Column '{col}' has {info['empty_strings']} empty strings (not null)"
            )

    profile["issues"] = issues

    return profile


def print_profile(profile: dict) -> None:
    """Print profile in human-readable format."""
    ov = profile["overview"]
    print("=" * 60)
    print("DATA PROFILE")
    print("=" * 60)
    print(f"Rows:            {ov['rows']:,}")
    print(f"Columns:         {ov['columns']}")
    print(f"Total nulls:     {ov['total_nulls']:,} ({ov['total_null_pct']}%)")
    print(f"Duplicate rows:  {ov['duplicate_rows']:,} ({ov['duplicate_pct']}%)")
    print(f"Memory:          {ov['memory_mb']:.2f} MB")

    print(f"\n{'Column':<30} {'Dtype':<12} {'Nulls':<10} {'Unique':<10} {'Notes'}")
    print("-" * 90)

    for col, info in profile["columns"].items():
        notes = []
        if info.get("potential_type"):
            notes.append(f"looks like {info['potential_type']}")
        if info.get("empty_strings", 0) > 0:
            notes.append(f"{info['empty_strings']} empty strings")
        note_str = "; ".join(notes)

        null_str = f"{info['null_count']} ({info['null_pct']}%)"
        unique_str = f"{info['unique_count']}"

        print(f"{col:<30} {info['dtype']:<12} {null_str:<10} {unique_str:<10} {note_str}")

    if profile["issues"]:
        print(f"\n{'ISSUES DETECTED':}")
        print("-" * 40)
        for issue in profile["issues"]:
            print(f"  - {issue}")


def main():
    parser = argparse.ArgumentParser(description="Profile a CSV or Parquet file")
    parser.add_argument("input", help="Path to input file")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--sample", type=int, default=None, help="Sample N rows")
    parser.add_argument("--output", "-o", default=None, help="Write profile to file")

    args = parser.parse_args()

    df = load_data(args.input, sample_size=args.sample)
    profile = profile_dataframe(df)

    if args.json:
        output = json.dumps(profile, indent=2, default=str)
        if args.output:
            Path(args.output).write_text(output)
        else:
            print(output)
    else:
        print_profile(profile)
        if args.output:
            Path(args.output).write_text(json.dumps(profile, indent=2, default=str))
            print(f"\nProfile saved to {args.output}")


if __name__ == "__main__":
    main()
