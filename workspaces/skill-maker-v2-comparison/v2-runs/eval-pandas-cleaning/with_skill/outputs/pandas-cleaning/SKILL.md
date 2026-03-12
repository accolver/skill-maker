---
name: pandas-cleaning
description: Guides systematic data cleaning workflows in pandas for CSV and Parquet files, covering missing value strategies, deduplication with composite keys, column name normalization, type coercion with error handling, and reproducible cleaning pipelines. Use when cleaning data, handling missing values, deduplicating rows, normalizing columns, converting dtypes, reading CSV or Parquet files, or when the user mentions pandas data cleaning, data wrangling, data preprocessing, NaN handling, or messy data.
---

# Pandas Data Cleaning

## Overview

Apply a systematic, reproducible data cleaning workflow to tabular data using
pandas. Every cleaning operation follows a strict order — profile first, then
clean in a deterministic sequence — because cleaning steps interact:
deduplication before type conversion avoids converting garbage rows, and column
normalization before everything else ensures consistent column references
throughout.

## When to use

- When cleaning CSV or Parquet data with pandas
- When handling missing values (NaN, None, empty strings, sentinel values)
- When deduplicating rows based on single or composite keys
- When normalizing messy column names (spaces, mixed case, special characters)
- When converting column types (string-to-numeric, date parsing, categorical)
- When the user says "clean this data", "handle missing values", "remove
  duplicates", "fix column names", or "convert types"
- When building a reusable cleaning pipeline or function

**Do NOT use when:**

- Doing exploratory data analysis (EDA) or visualization — clean first, then
  analyze
- Building ML feature engineering pipelines (cleaning is a prerequisite, not the
  same thing)
- Working with non-tabular data (JSON APIs, unstructured text)

## Workflow

### 1. Load and Profile

Before cleaning anything, understand what you're working with. Skipping
profiling leads to wrong assumptions about data types, missing value patterns,
and duplicates.

```python
import pandas as pd

# Load with explicit parameters — never rely on defaults for real data
df = pd.read_csv(
    "data.csv",
    dtype_backend="numpy_nullable",  # Use nullable dtypes from the start
    na_values=["", "N/A", "n/a", "NULL", "null", "None", "-", "--", "?"],
    keep_default_na=True,
)
# For Parquet: df = pd.read_parquet("data.parquet")

# Profile: shape, dtypes, missing, duplicates
print(f"Shape: {df.shape}")
print(f"\nDtypes:\n{df.dtypes}")
print(f"\nMissing values:\n{df.isna().sum()}")
print(f"\nMissing %:\n{(df.isna().mean() * 100).round(1)}")
print(f"\nDuplicate rows: {df.duplicated().sum()}")
print(f"\nSample:\n{df.head(3)}")
```

**Key decisions from profiling:**

| Observation                                | Action                                                 |
| ------------------------------------------ | ------------------------------------------------------ |
| Column has >50% missing                    | Consider dropping column, or flag for domain expert    |
| Column has <5% missing                     | Impute (median for numeric, mode for categorical)      |
| Column dtype is `object` but looks numeric | Type coercion needed — check for non-numeric sentinels |
| Duplicate rows exist                       | Determine dedup key (all columns vs subset)            |
| Column names have spaces/special chars     | Normalize before any other operations                  |

**Output:** A profiling summary printed to stdout. Do NOT proceed to cleaning
until you understand the data shape.

### 2. Normalize Column Names

Do this FIRST because every subsequent step references columns by name. If you
clean data first and normalize names later, your code breaks or becomes
inconsistent.

```python
def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names to snake_case.

    Handles: spaces, camelCase, PascalCase, kebab-case, special chars,
    leading/trailing whitespace, consecutive underscores.
    """
    import re

    def to_snake(name: str) -> str:
        s = str(name).strip()
        # Insert underscore before uppercase letters (camelCase/PascalCase)
        s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s)
        # Replace non-alphanumeric with underscore
        s = re.sub(r"[^a-z0-9]+", "_", s.lower())
        # Collapse consecutive underscores and strip edges
        s = re.sub(r"_+", "_", s).strip("_")
        return s

    df.columns = [to_snake(c) for c in df.columns]

    # Check for collisions after normalization
    dupes = df.columns[df.columns.duplicated()].tolist()
    if dupes:
        raise ValueError(f"Column name collision after normalization: {dupes}")

    return df

df = normalize_columns(df)
```

### 3. Deduplicate Rows

Deduplicate BEFORE type conversion because duplicate detection on raw string
values is more reliable than on coerced values (where conversion errors might
mask real duplicates).

```python
def deduplicate(
    df: pd.DataFrame,
    subset: list[str] | None = None,
    keep: str = "first",
) -> pd.DataFrame:
    """Remove duplicate rows, logging what was removed.

    Args:
        subset: Columns to consider for duplicates. None = all columns.
        keep: 'first', 'last', or False (drop all duplicates).
    """
    n_before = len(df)
    # Always sort before dedup so 'first'/'last' is deterministic
    if subset:
        df = df.sort_values(subset).reset_index(drop=True)
    df = df.drop_duplicates(subset=subset, keep=keep).reset_index(drop=True)
    n_removed = n_before - len(df)
    if n_removed > 0:
        print(f"Removed {n_removed} duplicate rows ({n_removed/n_before:.1%})")
    return df

# Use composite key when rows aren't exact duplicates
# Example: same customer + same date = duplicate order
df = deduplicate(df, subset=["customer_id", "order_date"], keep="last")
```

**Choosing the dedup key:**

- **All columns** (`subset=None`): Only removes exact duplicate rows
- **Composite key** (`subset=["col_a", "col_b"]`): Removes rows with same key,
  keeps one. Use when you have a natural/business key.
- **Single column** (`subset=["id"]`): Use for primary key dedup

### 4. Handle Missing Values

Apply a strategy per column based on the profiling results. Never use a single
strategy for the entire DataFrame — numeric columns need different treatment
than categorical ones.

```python
def handle_missing(
    df: pd.DataFrame,
    strategies: dict[str, dict],
) -> pd.DataFrame:
    """Apply per-column missing value strategies.

    Strategy format:
        {"column_name": {"method": "fill_median"}}
        {"column_name": {"method": "fill_value", "value": 0}}
        {"column_name": {"method": "fill_mode"}}
        {"column_name": {"method": "drop"}}
        {"column_name": {"method": "ffill"}}
        {"column_name": {"method": "interpolate"}}
    """
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

# Example usage — choose strategy based on profiling
df = handle_missing(df, {
    "revenue": {"method": "fill_median"},
    "category": {"method": "fill_value", "value": "unknown"},
    "email": {"method": "drop"},  # Can't impute emails
    "temperature": {"method": "interpolate"},  # Time series
})
```

**Strategy selection guide:**

| Column type                    | Missing % | Recommended strategy                             |
| ------------------------------ | --------- | ------------------------------------------------ |
| Numeric, roughly symmetric     | <20%      | `fill_median`                                    |
| Numeric, skewed                | <20%      | `fill_median` (NOT mean — outliers distort mean) |
| Numeric, time series           | <30%      | `interpolate` or `ffill`                         |
| Categorical, few categories    | <20%      | `fill_mode`                                      |
| Categorical, many categories   | <20%      | `fill_value` with "unknown"                      |
| Any column                     | >50%      | Consider dropping the column entirely            |
| Identifier columns (email, ID) | Any       | `drop` rows — can't impute identifiers           |

### 5. Convert Types

Type conversion is the most error-prone step. Always use `errors="coerce"` to
convert unparseable values to NaN rather than crashing, then handle the new
NaNs.

```python
def convert_types(
    df: pd.DataFrame,
    type_map: dict[str, str],
) -> pd.DataFrame:
    """Convert column types with error handling.

    Supported types: int, float, datetime, category, bool, string
    """
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
            df[col] = pd.to_datetime(df[col], errors="coerce", infer_datetime_format=True)
        elif target_type == "category":
            df[col] = df[col].astype("category")
        elif target_type == "bool":
            true_vals = {"true", "1", "yes", "y", "t"}
            false_vals = {"false", "0", "no", "n", "f"}
            df[col] = df[col].astype(str).str.lower().map(
                lambda x: True if x in true_vals else (False if x in false_vals else pd.NA)
            ).astype("boolean")
        elif target_type == "string":
            df[col] = df[col].astype("string")
        else:
            raise ValueError(f"Unknown target type: {target_type}")

        n_after_na = df[col].isna().sum()
        n_coerced = n_after_na - n_before_na
        if n_coerced > 0:
            print(f"  Warning: {col} had {n_coerced} values coerced to NaN during {target_type} conversion")

    return df

df = convert_types(df, {
    "order_id": "Int64",
    "revenue": "Float64",
    "order_date": "datetime",
    "status": "category",
    "is_active": "bool",
})
```

**Critical:** Use nullable dtypes (`Int64`, `Float64`, `boolean`, `string`)
instead of numpy dtypes (`int64`, `float64`). Nullable dtypes handle NaN
properly — numpy `int64` cannot represent NaN, forcing an implicit upcast to
`float64` that silently corrupts integer IDs.

### 6. Validate and Save

After cleaning, validate the result and save with a clear record of what
changed.

```python
def validate_cleaned(df: pd.DataFrame, checks: dict) -> bool:
    """Run validation checks on cleaned DataFrame.

    checks format:
        {"no_duplicates": ["col_a", "col_b"]}
        {"no_nulls": ["required_col"]}
        {"value_range": {"col": [min, max]}}
    """
    passed = True

    if "no_duplicates" in checks:
        cols = checks["no_duplicates"]
        n_dupes = df.duplicated(subset=cols).sum()
        if n_dupes > 0:
            print(f"FAIL: {n_dupes} duplicates remain on {cols}")
            passed = False
        else:
            print(f"PASS: No duplicates on {cols}")

    if "no_nulls" in checks:
        for col in checks["no_nulls"]:
            n_null = df[col].isna().sum()
            if n_null > 0:
                print(f"FAIL: {col} has {n_null} nulls")
                passed = False
            else:
                print(f"PASS: {col} has no nulls")

    if "value_range" in checks:
        for col, (lo, hi) in checks["value_range"].items():
            out = ((df[col] < lo) | (df[col] > hi)).sum()
            if out > 0:
                print(f"FAIL: {col} has {out} values outside [{lo}, {hi}]")
                passed = False
            else:
                print(f"PASS: {col} values in [{lo}, {hi}]")

    return passed

# Validate
is_valid = validate_cleaned(df, {
    "no_duplicates": ["customer_id", "order_date"],
    "no_nulls": ["customer_id", "revenue"],
    "value_range": {"revenue": [0, 1_000_000]},
})

# Save
df.to_csv("cleaned_data.csv", index=False)
# Or: df.to_parquet("cleaned_data.parquet", index=False)

# Print summary
print(f"\nCleaning complete:")
print(f"  Rows: {len(df)}")
print(f"  Columns: {len(df.columns)}")
print(f"  Dtypes: {dict(df.dtypes.value_counts())}")
print(f"  Validation: {'PASSED' if is_valid else 'FAILED'}")
```

## Checklist

- [ ] Loaded data with explicit `na_values` and `dtype_backend="numpy_nullable"`
- [ ] Profiled: shape, dtypes, missing counts, duplicate count printed
- [ ] Column names normalized to snake_case (checked for collisions)
- [ ] Duplicates removed with explicit subset key and keep strategy
- [ ] Missing values handled per-column with documented strategy choice
- [ ] Types converted using nullable dtypes and `errors="coerce"`
- [ ] Coercion warnings printed (new NaNs from failed conversions)
- [ ] Validation checks run on cleaned output
- [ ] Saved to CSV or Parquet with `index=False`
- [ ] Cleaning summary printed (row count, column count, dtypes)

## Common Mistakes

| Mistake                                         | Fix                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Using `df.dropna()` on entire DataFrame         | Drop per-column with `subset=` — blanket dropna loses good data                    |
| Using numpy `int64` with missing values         | Use nullable `Int64` — numpy int can't hold NaN, silently upcasts to float         |
| Normalizing column names AFTER referencing them | Normalize FIRST — all subsequent code uses normalized names                        |
| Using `fillna(df.mean())` on skewed data        | Use `fillna(df.median())` — mean is distorted by outliers                          |
| Deduplicating after type conversion             | Deduplicate FIRST — type coercion can mask real duplicates                         |
| Not specifying `na_values` on read              | Sentinel values like "N/A", "NULL", "-" stay as strings, not NaN                   |
| Using `inplace=True`                            | Avoid — it's deprecated-trending, breaks method chains, and makes debugging harder |
| Converting dates without `errors="coerce"`      | One bad date crashes the whole conversion — always coerce and check for new NaNs   |
| Saving with default index                       | Use `index=False` — the default integer index is meaningless and wastes space      |
| Not logging what changed                        | Print counts at each step — silent cleaning is undebuggable                        |

## Quick Reference

| Operation                  | Code                                                                            |
| -------------------------- | ------------------------------------------------------------------------------- |
| Read CSV with NaN handling | `pd.read_csv(f, na_values=["", "N/A", "NULL"], dtype_backend="numpy_nullable")` |
| Read Parquet               | `pd.read_parquet(f)`                                                            |
| Normalize columns          | `df.columns = [to_snake(c) for c in df.columns]`                                |
| Deduplicate                | `df.drop_duplicates(subset=[...], keep="first")`                                |
| Fill median                | `df[col].fillna(df[col].median())`                                              |
| Fill with value            | `df[col].fillna("unknown")`                                                     |
| Drop rows with NaN         | `df.dropna(subset=["col"])`                                                     |
| To numeric (safe)          | `pd.to_numeric(df[col], errors="coerce")`                                       |
| To datetime (safe)         | `pd.to_datetime(df[col], errors="coerce")`                                      |
| To nullable int            | `.astype("Int64")` (capital I)                                                  |
| Validate no nulls          | `assert df[col].isna().sum() == 0`                                              |
| Save CSV                   | `df.to_csv("out.csv", index=False)`                                             |
| Save Parquet               | `df.to_parquet("out.parquet", index=False)`                                     |

## Key Principles

1. **Profile before you clean** — Never assume data shape. Print shape, dtypes,
   missing counts, and duplicate counts before writing any cleaning code. Wrong
   assumptions lead to silent data corruption.

2. **Order matters: normalize → deduplicate → handle missing → convert types →
   validate** — Each step depends on the previous one. Deduplicating after type
   conversion can miss duplicates. Converting types before handling missing
   values creates spurious NaNs you can't distinguish from real ones.

3. **Use nullable dtypes everywhere** — `Int64`, `Float64`, `boolean`, `string`
   instead of numpy equivalents. This prevents the silent int-to-float
   corruption that happens when numpy `int64` encounters NaN.

4. **Log every transformation** — Print how many rows were removed, how many
   values were filled, how many coercion failures occurred. Silent cleaning
   pipelines are undebuggable and untrustworthy.

5. **Validate at the end** — Run explicit checks (no nulls in required columns,
   no duplicates on keys, values in expected ranges) and print PASS/FAIL. Never
   assume cleaning worked — verify it.
