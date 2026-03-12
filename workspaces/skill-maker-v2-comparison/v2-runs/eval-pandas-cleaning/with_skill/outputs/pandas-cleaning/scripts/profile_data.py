# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "pandas==2.2.3",
#     "pyarrow==18.1.0",
# ]
# ///
"""Profile a CSV or Parquet file and output a JSON summary.

Usage:
    uv run scripts/profile_data.py data.csv
    uv run scripts/profile_data.py data.parquet
    uv run scripts/profile_data.py data.csv --top-values 10
    uv run scripts/profile_data.py --help

Output: JSON to stdout with shape, dtypes, missing values, duplicates,
and per-column statistics.
"""

import argparse
import json
import sys
from pathlib import Path

import pandas as pd


def profile(df: pd.DataFrame, top_n: int = 5) -> dict:
    """Generate a profiling summary of a DataFrame."""
    result = {
        "shape": {"rows": int(df.shape[0]), "columns": int(df.shape[1])},
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "missing": {},
        "duplicates": {
            "exact_duplicate_rows": int(df.duplicated().sum()),
        },
        "columns": {},
    }

    for col in df.columns:
        col_info = {
            "dtype": str(df[col].dtype),
            "missing_count": int(df[col].isna().sum()),
            "missing_pct": round(float(df[col].isna().mean() * 100), 1),
            "unique_count": int(df[col].nunique()),
        }

        if df[col].isna().sum() > 0:
            result["missing"][col] = {
                "count": col_info["missing_count"],
                "pct": col_info["missing_pct"],
            }

        # Numeric stats
        if pd.api.types.is_numeric_dtype(df[col]):
            desc = df[col].describe()
            col_info["stats"] = {
                "mean": round(float(desc.get("mean", 0)), 4),
                "std": round(float(desc.get("std", 0)), 4),
                "min": float(desc.get("min", 0)),
                "max": float(desc.get("max", 0)),
                "median": float(df[col].median()) if df[col].notna().any() else None,
            }
        else:
            # Categorical/string stats
            top = df[col].value_counts().head(top_n)
            col_info["top_values"] = {
                str(k): int(v) for k, v in top.items()
            }

        result["columns"][col] = col_info

    return result


def main():
    parser = argparse.ArgumentParser(
        description="Profile a CSV or Parquet file and output JSON summary.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    uv run scripts/profile_data.py data.csv
    uv run scripts/profile_data.py data.parquet --top-values 10
    uv run scripts/profile_data.py data.csv > profile.json
        """,
    )
    parser.add_argument("file", help="Path to CSV or Parquet file")
    parser.add_argument(
        "--top-values",
        type=int,
        default=5,
        help="Number of top values to show for categorical columns (default: 5)",
    )

    args = parser.parse_args()
    filepath = Path(args.file)

    if not filepath.exists():
        print(json.dumps({"error": f"File not found: {filepath}"}), file=sys.stderr)
        sys.exit(1)

    try:
        if filepath.suffix.lower() == ".parquet":
            df = pd.read_parquet(filepath)
        elif filepath.suffix.lower() in (".csv", ".tsv"):
            sep = "\t" if filepath.suffix.lower() == ".tsv" else ","
            df = pd.read_csv(
                filepath,
                sep=sep,
                na_values=["", "N/A", "n/a", "NULL", "null", "None", "-", "--", "?"],
                keep_default_na=True,
                dtype_backend="numpy_nullable",
            )
        else:
            print(
                json.dumps({"error": f"Unsupported file type: {filepath.suffix}"}),
                file=sys.stderr,
            )
            sys.exit(1)

        result = profile(df, top_n=args.top_values)
        print(json.dumps(result, indent=2, default=str))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
