"""Pandas data cleaning pipeline template.

Copy this file and customize for your dataset. Each section corresponds
to a step in the pandas-cleaning skill workflow.

Usage:
    python cleaning_template.py input.csv output.csv
    python cleaning_template.py input.parquet output.parquet
"""

import re
import sys
from pathlib import Path

import pandas as pd


# =============================================================================
# Step 1: Load and Profile
# =============================================================================

def load_data(filepath: str) -> pd.DataFrame:
    """Load CSV or Parquet with proper NA handling."""
    path = Path(filepath)
    if path.suffix.lower() == ".parquet":
        return pd.read_parquet(path)
    return pd.read_csv(
        path,
        na_values=["", "N/A", "n/a", "NULL", "null", "None", "-", "--", "?"],
        keep_default_na=True,
        dtype_backend="numpy_nullable",
    )


def profile(df: pd.DataFrame) -> None:
    """Print profiling summary."""
    print(f"Shape: {df.shape}")
    print(f"\nDtypes:\n{df.dtypes}")
    print(f"\nMissing values:\n{df.isna().sum()}")
    print(f"\nMissing %:\n{(df.isna().mean() * 100).round(1)}")
    print(f"\nDuplicate rows: {df.duplicated().sum()}")
    print(f"\nSample:\n{df.head(3)}")


# =============================================================================
# Step 2: Normalize Column Names
# =============================================================================

def to_snake(name: str) -> str:
    """Convert a column name to snake_case."""
    s = str(name).strip()
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s)
    s = re.sub(r"[^a-z0-9]+", "_", s.lower())
    s = re.sub(r"_+", "_", s).strip("_")
    return s


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize all column names to snake_case."""
    df.columns = [to_snake(c) for c in df.columns]
    dupes = df.columns[df.columns.duplicated()].tolist()
    if dupes:
        raise ValueError(f"Column name collision after normalization: {dupes}")
    return df


# =============================================================================
# Step 3: Deduplicate
# =============================================================================

def deduplicate(
    df: pd.DataFrame,
    subset: list[str] | None = None,
    keep: str = "first",
) -> pd.DataFrame:
    """Remove duplicate rows with logging."""
    n_before = len(df)
    if subset:
        df = df.sort_values(subset).reset_index(drop=True)
    df = df.drop_duplicates(subset=subset, keep=keep).reset_index(drop=True)
    n_removed = n_before - len(df)
    if n_removed > 0:
        print(f"Removed {n_removed} duplicate rows ({n_removed/n_before:.1%})")
    return df


# =============================================================================
# Step 4: Handle Missing Values
# =============================================================================

# TODO: Customize strategies based on your profiling results
MISSING_STRATEGIES = {
    # "column_name": {"method": "fill_median"},
    # "category_col": {"method": "fill_value", "value": "unknown"},
    # "id_col": {"method": "drop"},
}


def handle_missing(df: pd.DataFrame, strategies: dict) -> pd.DataFrame:
    """Apply per-column missing value strategies."""
    for col, strategy in strategies.items():
        if col not in df.columns:
            print(f"Warning: column '{col}' not found, skipping")
            continue

        method = strategy["method"]
        n_missing = df[col].isna().sum()
        if n_missing == 0:
            continue

        if method == "fill_median":
            df[col] = df[col].fillna(df[col].median())
        elif method == "fill_mean":
            df[col] = df[col].fillna(df[col].mean())
        elif method == "fill_mode":
            mode_val = df[col].mode()
            if len(mode_val) > 0:
                df[col] = df[col].fillna(mode_val.iloc[0])
        elif method == "fill_value":
            df[col] = df[col].fillna(strategy["value"])
        elif method == "drop":
            df = df.dropna(subset=[col])
        elif method == "ffill":
            df[col] = df[col].ffill()
        elif method == "interpolate":
            df[col] = df[col].interpolate(method="linear")
        else:
            raise ValueError(f"Unknown strategy: {method}")

        print(f"  {col}: filled {n_missing} missing values ({method})")

    return df.reset_index(drop=True)


# =============================================================================
# Step 5: Convert Types
# =============================================================================

# TODO: Customize type map based on your data
TYPE_MAP = {
    # "id_col": "Int64",
    # "amount_col": "Float64",
    # "date_col": "datetime",
    # "status_col": "category",
}


def convert_types(df: pd.DataFrame, type_map: dict) -> pd.DataFrame:
    """Convert column types with error handling."""
    for col, target_type in type_map.items():
        if col not in df.columns:
            print(f"Warning: column '{col}' not found, skipping")
            continue

        n_before_na = df[col].isna().sum()

        if target_type in ("int", "Int64"):
            df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")
        elif target_type in ("float", "Float64"):
            df[col] = pd.to_numeric(df[col], errors="coerce").astype("Float64")
        elif target_type == "datetime":
            df[col] = pd.to_datetime(df[col], errors="coerce")
        elif target_type == "category":
            df[col] = df[col].astype("category")
        elif target_type == "string":
            df[col] = df[col].astype("string")

        n_after_na = df[col].isna().sum()
        n_coerced = n_after_na - n_before_na
        if n_coerced > 0:
            print(f"  Warning: {col} had {n_coerced} values coerced to NaN")

    return df


# =============================================================================
# Step 6: Validate and Save
# =============================================================================

def validate(df: pd.DataFrame) -> bool:
    """Run validation checks. Customize for your data."""
    passed = True
    # TODO: Add your validation checks
    # Example:
    # if df.duplicated(subset=["id"]).sum() > 0:
    #     print("FAIL: Duplicates remain on id")
    #     passed = False
    return passed


def main():
    if len(sys.argv) < 3:
        print("Usage: python cleaning_template.py <input> <output>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    # Load and profile
    print("=" * 60)
    print("PROFILING")
    print("=" * 60)
    df = load_data(input_path)
    profile(df)

    # Clean
    print("\n" + "=" * 60)
    print("CLEANING")
    print("=" * 60)
    df = normalize_columns(df)
    df = deduplicate(df)  # TODO: add subset= for your dedup key
    df = handle_missing(df, MISSING_STRATEGIES)
    df = convert_types(df, TYPE_MAP)

    # Validate and save
    print("\n" + "=" * 60)
    print("VALIDATION")
    print("=" * 60)
    is_valid = validate(df)

    # Save
    output = Path(output_path)
    if output.suffix.lower() == ".parquet":
        df.to_parquet(output, index=False)
    else:
        df.to_csv(output, index=False)

    print(f"\nCleaning complete:")
    print(f"  Rows: {len(df)}")
    print(f"  Columns: {len(df.columns)}")
    print(f"  Validation: {'PASSED' if is_valid else 'FAILED'}")
    print(f"  Saved to: {output}")


if __name__ == "__main__":
    main()
