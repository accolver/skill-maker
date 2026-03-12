# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "pandas==2.2.3",
#     "pyarrow==18.1.0",
# ]
# ///
"""Validate a cleaned CSV or Parquet file against a set of rules.

Usage:
    uv run scripts/validate_cleaned.py cleaned.csv --no-nulls customer_id revenue --no-dupes customer_id order_date
    uv run scripts/validate_cleaned.py cleaned.parquet --no-nulls id --range revenue 0 1000000
    uv run scripts/validate_cleaned.py --help

Output: JSON to stdout with PASS/FAIL for each check.
Exit codes: 0 = all checks pass, 1 = at least one check failed, 2 = error.
"""

import argparse
import json
import sys
from pathlib import Path

import pandas as pd


def main():
    parser = argparse.ArgumentParser(
        description="Validate a cleaned data file against rules.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    uv run scripts/validate_cleaned.py data.csv --no-nulls id email
    uv run scripts/validate_cleaned.py data.csv --no-dupes id
    uv run scripts/validate_cleaned.py data.csv --no-nulls id --no-dupes id --range price 0 10000
    uv run scripts/validate_cleaned.py data.parquet --snake-case-columns
        """,
    )
    parser.add_argument("file", help="Path to CSV or Parquet file to validate")
    parser.add_argument(
        "--no-nulls",
        nargs="+",
        metavar="COL",
        help="Columns that must have no null values",
    )
    parser.add_argument(
        "--no-dupes",
        nargs="+",
        metavar="COL",
        help="Columns that form a unique key (no duplicate combinations)",
    )
    parser.add_argument(
        "--range",
        nargs=3,
        action="append",
        metavar=("COL", "MIN", "MAX"),
        help="Column must have values in [MIN, MAX] range",
    )
    parser.add_argument(
        "--snake-case-columns",
        action="store_true",
        help="Check that all column names are snake_case",
    )
    parser.add_argument(
        "--min-rows",
        type=int,
        help="Minimum number of rows expected",
    )

    args = parser.parse_args()
    filepath = Path(args.file)

    if not filepath.exists():
        print(json.dumps({"error": f"File not found: {filepath}"}), file=sys.stderr)
        sys.exit(2)

    try:
        if filepath.suffix.lower() == ".parquet":
            df = pd.read_parquet(filepath)
        else:
            df = pd.read_csv(filepath, dtype_backend="numpy_nullable")
    except Exception as e:
        print(json.dumps({"error": f"Failed to read file: {e}"}), file=sys.stderr)
        sys.exit(2)

    checks = []
    all_passed = True

    # No nulls check
    if args.no_nulls:
        for col in args.no_nulls:
            if col not in df.columns:
                checks.append({
                    "check": f"no_nulls:{col}",
                    "passed": False,
                    "detail": f"Column '{col}' not found in data",
                })
                all_passed = False
                continue

            n_null = int(df[col].isna().sum())
            passed = n_null == 0
            checks.append({
                "check": f"no_nulls:{col}",
                "passed": passed,
                "detail": f"{n_null} null values" if not passed else "No nulls",
            })
            if not passed:
                all_passed = False

    # No duplicates check
    if args.no_dupes:
        missing_cols = [c for c in args.no_dupes if c not in df.columns]
        if missing_cols:
            checks.append({
                "check": f"no_dupes:{','.join(args.no_dupes)}",
                "passed": False,
                "detail": f"Columns not found: {missing_cols}",
            })
            all_passed = False
        else:
            n_dupes = int(df.duplicated(subset=args.no_dupes).sum())
            passed = n_dupes == 0
            checks.append({
                "check": f"no_dupes:{','.join(args.no_dupes)}",
                "passed": passed,
                "detail": f"{n_dupes} duplicate rows" if not passed else "No duplicates",
            })
            if not passed:
                all_passed = False

    # Range check
    if args.range:
        for col, lo, hi in args.range:
            if col not in df.columns:
                checks.append({
                    "check": f"range:{col}[{lo},{hi}]",
                    "passed": False,
                    "detail": f"Column '{col}' not found",
                })
                all_passed = False
                continue

            lo_f, hi_f = float(lo), float(hi)
            numeric_col = pd.to_numeric(df[col], errors="coerce")
            out_of_range = int(((numeric_col < lo_f) | (numeric_col > hi_f)).sum())
            passed = out_of_range == 0
            checks.append({
                "check": f"range:{col}[{lo},{hi}]",
                "passed": passed,
                "detail": f"{out_of_range} values out of range" if not passed else "All in range",
            })
            if not passed:
                all_passed = False

    # Snake case columns check
    if args.snake_case_columns:
        import re
        bad_cols = [c for c in df.columns if not re.match(r"^[a-z][a-z0-9_]*$", c)]
        passed = len(bad_cols) == 0
        checks.append({
            "check": "snake_case_columns",
            "passed": passed,
            "detail": f"Non-snake_case columns: {bad_cols}" if not passed else "All columns are snake_case",
        })
        if not passed:
            all_passed = False

    # Min rows check
    if args.min_rows is not None:
        n_rows = len(df)
        passed = n_rows >= args.min_rows
        checks.append({
            "check": f"min_rows:{args.min_rows}",
            "passed": passed,
            "detail": f"Has {n_rows} rows (need {args.min_rows})" if not passed else f"Has {n_rows} rows",
        })
        if not passed:
            all_passed = False

    result = {
        "file": str(filepath),
        "shape": {"rows": int(df.shape[0]), "columns": int(df.shape[1])},
        "checks": checks,
        "summary": {
            "total": len(checks),
            "passed": sum(1 for c in checks if c["passed"]),
            "failed": sum(1 for c in checks if not c["passed"]),
            "all_passed": all_passed,
        },
    }

    print(json.dumps(result, indent=2))
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
