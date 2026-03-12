---
name: pandas-data-cleaning
description: Guide an AI agent through systematic pandas data cleaning workflows for CSV and Parquet files, covering missing value handling, deduplication, column name normalization, type conversion, and data validation with reusable script patterns.
---

# Pandas Data Cleaning

A structured workflow for cleaning tabular data with pandas. Covers the most
common data quality issues: missing values, duplicates, inconsistent column
names, wrong dtypes, and malformed values. Designed for CSV and Parquet files.

## When to Use This Skill

- User asks to clean, preprocess, or prepare a dataset
- User has a CSV or Parquet file with data quality issues
- User needs to standardize column names, handle nulls, or deduplicate
- User mentions "data cleaning", "data wrangling", or "data prep" with pandas

## Workflow

### Step 1: Load and Profile the Data

Before cleaning, understand what you're working with.

```python
import pandas as pd
import numpy as np
from pathlib import Path

def load_data(filepath: str) -> pd.DataFrame:
    """Load CSV or Parquet with appropriate settings."""
    path = Path(filepath)
    if path.suffix == ".csv":
        # Use low_memory=False to avoid mixed type warnings
        df = pd.read_csv(filepath, low_memory=False)
    elif path.suffix in (".parquet", ".pq"):
        df = pd.read_parquet(filepath)
    else:
        raise ValueError(f"Unsupported file format: {path.suffix}")
    return df

def profile_data(df: pd.DataFrame) -> dict:
    """Generate a data quality profile."""
    profile = {
        "shape": df.shape,
        "columns": list(df.columns),
        "dtypes": df.dtypes.to_dict(),
        "missing_counts": df.isnull().sum().to_dict(),
        "missing_pct": (df.isnull().sum() / len(df) * 100).round(2).to_dict(),
        "duplicate_rows": df.duplicated().sum(),
        "memory_mb": df.memory_usage(deep=True).sum() / 1024 / 1024,
    }
    return profile
```

**Always profile first.** Print the profile summary so the user sees what needs
cleaning before any transformations happen.

### Step 2: Normalize Column Names

Standardize column names to snake_case. This prevents downstream KeyError issues
and makes column access consistent.

```python
import re

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names to lowercase snake_case."""
    def to_snake_case(name: str) -> str:
        # Handle camelCase and PascalCase
        s = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1_\2', str(name))
        s = re.sub(r'([a-z\d])([A-Z])', r'\1_\2', s)
        # Replace spaces, hyphens, dots, and other separators with underscore
        s = re.sub(r'[\s\-\.\/\\]+', '_', s)
        # Remove non-alphanumeric characters (except underscore)
        s = re.sub(r'[^a-z0-9_]', '', s.lower())
        # Collapse multiple underscores
        s = re.sub(r'_+', '_', s).strip('_')
        return s

    rename_map = {col: to_snake_case(col) for col in df.columns}

    # Handle collisions: append _1, _2, etc.
    seen = {}
    for old, new in rename_map.items():
        if new in seen:
            seen[new] += 1
            rename_map[old] = f"{new}_{seen[new]}"
        else:
            seen[new] = 0

    df = df.rename(columns=rename_map)
    return df
```

**Key rules:**

- Always convert to snake_case (not camelCase, not kebab-case)
- Handle collision when two columns normalize to the same name
- Strip leading/trailing whitespace before normalizing
- Log the rename mapping so the user can verify

### Step 3: Handle Missing Values

Choose the right strategy per column based on dtype and context.

```python
def handle_missing_values(
    df: pd.DataFrame,
    strategy: dict | None = None
) -> pd.DataFrame:
    """
    Handle missing values with per-column strategies.

    strategy dict maps column names to one of:
      - "drop"       : drop rows where this column is null
      - "mean"       : fill with column mean (numeric only)
      - "median"     : fill with column median (numeric only)
      - "mode"       : fill with most frequent value
      - "ffill"      : forward fill
      - "bfill"      : backward fill
      - "zero"       : fill with 0
      - "empty"      : fill with empty string
      - "unknown"    : fill with "Unknown"
      - <any value>  : fill with that literal value

    If no strategy is provided, applies smart defaults:
      - numeric columns: median
      - string/object columns: "Unknown"
      - boolean columns: False
      - datetime columns: drop
    """
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
```

**Decision guide for missing value strategies:**

| Column Type           | Missing < 5%      | Missing 5-30%  | Missing > 30%            |
| --------------------- | ----------------- | -------------- | ------------------------ |
| Numeric (continuous)  | median            | median or mean | Consider dropping column |
| Numeric (discrete/ID) | mode or drop row  | drop row       | Drop column              |
| Categorical           | mode or "Unknown" | "Unknown"      | "Unknown" or drop column |
| DateTime              | drop row          | drop row       | Drop column              |
| Boolean               | False             | False or mode  | Drop column              |

**Always report** how many values were filled/dropped per column.

### Step 4: Deduplicate Rows

```python
def deduplicate(
    df: pd.DataFrame,
    subset: list[str] | None = None,
    keep: str = "first"
) -> pd.DataFrame:
    """
    Remove duplicate rows.

    Args:
        subset: Columns to consider for identifying duplicates.
                If None, uses all columns.
        keep: Which duplicate to keep - "first", "last", or False (drop all).
    """
    n_before = len(df)
    df = df.drop_duplicates(subset=subset, keep=keep).reset_index(drop=True)
    n_removed = n_before - len(df)
    print(f"Removed {n_removed} duplicate rows ({n_removed/n_before*100:.1f}%)")
    return df
```

**Key rules:**

- Always specify `subset` when rows have unique IDs but duplicate data columns
- Use `keep="first"` as default unless there's a timestamp column (then keep
  latest)
- Reset index after deduplication to avoid gaps
- Report how many rows were removed

### Step 5: Convert Data Types

```python
def convert_types(
    df: pd.DataFrame,
    type_map: dict | None = None
) -> pd.DataFrame:
    """
    Convert column dtypes with safe error handling.

    type_map maps column names to target types:
      - "int", "int64", "Int64" (nullable)
      - "float", "float64"
      - "str", "string"
      - "bool", "boolean" (nullable)
      - "datetime"
      - "category"
    """
    if type_map is None:
        type_map = infer_types(df)

    conversion_report = []

    for col, target in type_map.items():
        if col not in df.columns:
            continue
        old_dtype = str(df[col].dtype)
        try:
            if target in ("datetime", "date"):
                df[col] = pd.to_datetime(df[col], errors="coerce")
            elif target in ("int", "int64"):
                # Use nullable Int64 if there are NaN values
                if df[col].isnull().any():
                    df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")
                else:
                    df[col] = pd.to_numeric(df[col], errors="coerce").astype("int64")
            elif target in ("Int64",):
                df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")
            elif target in ("float", "float64"):
                df[col] = pd.to_numeric(df[col], errors="coerce")
            elif target in ("str", "string"):
                df[col] = df[col].astype("string")
            elif target in ("bool", "boolean"):
                df[col] = df[col].map(
                    {"true": True, "false": False, "1": True, "0": False,
                     "yes": True, "no": False, "True": True, "False": False,
                     True: True, False: False, 1: True, 0: False}
                )
                if df[col].isnull().any():
                    df[col] = df[col].astype("boolean")
                else:
                    df[col] = df[col].astype("bool")
            elif target == "category":
                df[col] = df[col].astype("category")
            else:
                df[col] = df[col].astype(target)

            conversion_report.append({
                "column": col,
                "from": old_dtype,
                "to": str(df[col].dtype),
                "status": "success"
            })
        except (ValueError, TypeError) as e:
            conversion_report.append({
                "column": col,
                "from": old_dtype,
                "to": target,
                "status": f"failed: {e}"
            })

    return df


def infer_types(df: pd.DataFrame) -> dict:
    """Infer better dtypes for object columns."""
    type_map = {}
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
```

**Key rules:**

- Always use `errors="coerce"` for numeric and datetime conversions
- Use nullable `Int64` (capital I) when column has NaN values
- Infer types from a sample first, then let the user confirm before applying
- Report conversion successes and failures

### Step 6: Validate and Export

```python
def validate_cleaned(df: pd.DataFrame, original_shape: tuple) -> dict:
    """Run validation checks on cleaned data."""
    checks = {
        "no_duplicate_columns": len(df.columns) == len(set(df.columns)),
        "no_fully_null_columns": not (df.isnull().all()).any(),
        "no_fully_null_rows": not (df.isnull().all(axis=1)).any(),
        "row_count_reasonable": len(df) > 0 and len(df) <= original_shape[0],
        "columns_are_snake_case": all(
            re.match(r'^[a-z][a-z0-9_]*$', col) for col in df.columns
        ),
        "no_remaining_object_dtypes_for_numeric": True,  # checked below
    }

    # Check no object columns that look numeric
    for col in df.select_dtypes(include=["object"]).columns:
        sample = df[col].dropna().head(50)
        numeric = pd.to_numeric(sample, errors="coerce")
        if numeric.notna().sum() / max(len(sample), 1) > 0.8:
            checks["no_remaining_object_dtypes_for_numeric"] = False
            break

    return checks


def export_data(df: pd.DataFrame, filepath: str, format: str = "csv"):
    """Export cleaned data."""
    path = Path(filepath)
    if format == "csv":
        df.to_csv(path, index=False)
    elif format == "parquet":
        df.to_parquet(path, index=False, engine="pyarrow")
    else:
        raise ValueError(f"Unsupported export format: {format}")
    print(f"Exported {len(df)} rows to {path} ({path.stat().st_size / 1024:.1f} KB)")
```

### Step 7: Generate Cleaning Report

Always produce a summary report at the end.

```python
def generate_report(
    original_profile: dict,
    cleaned_df: pd.DataFrame,
    validation: dict
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
```

## Complete Pipeline Example

Here is the full pipeline applied to a sample CSV:

```python
import pandas as pd
from pathlib import Path

# 1. Load
df = load_data("sales_data.csv")
original_profile = profile_data(df)
original_shape = df.shape

# 2. Normalize columns
df = normalize_columns(df)

# 3. Handle missing values (smart defaults)
df = handle_missing_values(df)

# 4. Deduplicate
df = deduplicate(df, subset=["order_id"])

# 5. Convert types
type_map = infer_types(df)
# Review inferred types, then apply:
df = convert_types(df, type_map)

# 6. Validate
validation = validate_cleaned(df, original_shape)

# 7. Export
export_data(df, "sales_data_cleaned.csv", format="csv")

# 8. Report
report = generate_report(original_profile, df, validation)
print(report)
```

## Common Mistakes

| Mistake                                 | Why It's Wrong                                       | Correct Approach                                       |
| --------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| Using `df.dropna()` with no arguments   | Drops ALL rows with ANY null, often losing most data | Use `df.dropna(subset=[...])` on specific columns      |
| Using `int64` with NaN values           | NaN is a float concept; int64 cannot hold NaN        | Use nullable `Int64` dtype (capital I)                 |
| Not resetting index after drops         | Leaves gaps in index, causes issues with `.iloc`     | Always call `.reset_index(drop=True)` after filtering  |
| Filling numeric nulls with 0            | Zero is a real value; it biases calculations         | Use median or mean unless zero is semantically correct |
| Converting types before handling nulls  | Type conversion fails on NaN/mixed values            | Handle missing values first, then convert types        |
| Using `inplace=True`                    | Makes code harder to debug and chain                 | Always reassign: `df = df.dropna(...)`                 |
| Not checking for duplicate column names | Causes silent data loss on merge/join                | Check `len(df.columns) == len(set(df.columns))`        |
| Ignoring mixed types in object columns  | Leads to subtle bugs in comparisons                  | Profile dtypes first, convert explicitly               |

## Quick Reference: Pandas Cleaning Cheatsheet

```python
# --- Column Names ---
df.columns = df.columns.str.strip().str.lower().str.replace(r'\W+', '_', regex=True)

# --- Missing Values ---
df.isnull().sum()                          # Count nulls per column
df.dropna(subset=["col1", "col2"])         # Drop rows with nulls in specific cols
df["col"].fillna(df["col"].median())       # Fill with median
df["col"].fillna("Unknown")               # Fill with placeholder

# --- Duplicates ---
df.duplicated(subset=["id"]).sum()         # Count duplicates
df.drop_duplicates(subset=["id"], keep="first")  # Remove duplicates

# --- Type Conversion ---
pd.to_numeric(df["col"], errors="coerce") # Safe numeric conversion
pd.to_datetime(df["col"], errors="coerce")# Safe datetime conversion
df["col"].astype("Int64")                 # Nullable integer
df["col"].astype("category")              # Category for low cardinality

# --- String Cleaning ---
df["col"].str.strip()                     # Remove whitespace
df["col"].str.lower()                     # Lowercase
df["col"].str.replace(r'\s+', ' ', regex=True)  # Collapse whitespace

# --- Validation ---
assert df.duplicated().sum() == 0, "Duplicates remain"
assert df.isnull().sum().sum() == 0, "Nulls remain"
assert len(df.columns) == len(set(df.columns)), "Duplicate column names"
```
