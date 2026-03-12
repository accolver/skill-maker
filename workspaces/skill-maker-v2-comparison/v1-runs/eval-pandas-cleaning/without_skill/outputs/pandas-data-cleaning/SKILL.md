---
name: pandas-data-cleaning
description: Clean and prepare tabular data using pandas. Handles missing values, deduplication, column name normalization, type conversion, and outlier detection for CSV and Parquet files. Use when the user mentions data cleaning, data wrangling, missing values, duplicates, column renaming, type casting, or preparing messy data for analysis. Produces clean output files with a cleaning report.
---

# Pandas Data Cleaning

Clean messy tabular data using pandas with consistent, repeatable patterns.
Handles CSV and Parquet files through a structured pipeline: load, profile,
clean, validate, export.

## When to use

- When cleaning CSV or Parquet files with messy data
- When handling missing values (NaN, None, empty strings, sentinel values)
- When deduplicating rows (exact or fuzzy)
- When normalizing column names to snake_case
- When converting column types (strings to dates, objects to numerics)
- When the user says "clean this data", "fix missing values", "remove
  duplicates", "normalize columns", or "prepare this dataset"

**Do NOT use when:**

- Building ML models or doing statistical analysis (use after cleaning)
- Working with databases directly (use SQL or an ORM)
- Processing non-tabular data (JSON APIs, XML, unstructured text)
- The file is already clean and the user just needs to query it

## Prerequisites

- Python 3.9+
- pandas (`pip install pandas`)
- pyarrow (`pip install pyarrow`) — for Parquet support
- Optional: `pip install openpyxl` for Excel,
  `pip install fuzzywuzzy
  python-Levenshtein` for fuzzy dedup

## Workflow

### 1. Load and Profile the Data

Before cleaning anything, understand what you have.

```python
import pandas as pd

# Load CSV
df = pd.read_csv("data.csv")

# Load Parquet
df = pd.read_parquet("data.parquet")

# Profile the dataset
print(f"Shape: {df.shape}")
print(f"Columns: {list(df.columns)}")
print(f"\nData types:\n{df.dtypes}")
print(f"\nMissing values:\n{df.isnull().sum()}")
print(f"\nMissing %:\n{(df.isnull().sum() / len(df) * 100).round(2)}")
print(f"\nDuplicate rows: {df.duplicated().sum()}")
print(f"\nSample:\n{df.head()}")
```

**Key decisions from profiling:**

| Observation                   | Action                               |
| ----------------------------- | ------------------------------------ |
| Column names have spaces/caps | Normalize to snake_case (Step 2)     |
| Missing values > 50%          | Consider dropping the column         |
| Missing values < 5%           | Impute with median/mode or drop rows |
| Duplicate rows exist          | Deduplicate (Step 4)                 |
| Object columns with numbers   | Convert types (Step 5)               |
| Date strings                  | Parse to datetime (Step 5)           |

### 2. Normalize Column Names

Always normalize column names first — it makes every subsequent step easier.

```python
import re

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names to lowercase snake_case."""
    df = df.copy()
    df.columns = [
        re.sub(r'[^a-z0-9]+', '_',
               col.strip().lower()
        ).strip('_')
        for col in df.columns
    ]
    # Handle duplicate column names after normalization
    seen = {}
    new_cols = []
    for col in df.columns:
        if col in seen:
            seen[col] += 1
            new_cols.append(f"{col}_{seen[col]}")
        else:
            seen[col] = 0
            new_cols.append(col)
    df.columns = new_cols
    return df

df = normalize_columns(df)
```

**Common column name issues and fixes:**

| Original           | Normalized           |
| ------------------ | -------------------- |
| `First Name`       | `first_name`         |
| `Amount (USD)`     | `amount_usd`         |
| `customer-ID`      | `customer_id`        |
| `Date/Time`        | `date_time`          |
| `% Complete`       | `complete`           |
| `Column`, `column` | `column`, `column_1` |

### 3. Handle Missing Values

Choose a strategy based on the column's role and missing percentage.

```python
def handle_missing(df: pd.DataFrame, strategies: dict) -> pd.DataFrame:
    """
    Apply per-column missing value strategies.

    strategies: dict mapping column names to one of:
      - "drop"       : drop rows where this column is null
      - "mean"       : fill with column mean (numeric only)
      - "median"     : fill with column median (numeric only)
      - "mode"       : fill with most frequent value
      - "ffill"      : forward fill
      - "bfill"      : backward fill
      - "zero"       : fill with 0
      - "empty"      : fill with empty string
      - "unknown"    : fill with "Unknown"
      - any value    : fill with that literal value
    """
    df = df.copy()

    # First, normalize common sentinel values to NaN
    sentinel_values = ["", "N/A", "n/a", "NA", "na", "NULL", "null",
                       "None", "none", "-", "--", ".", "?", "NaN"]
    df = df.replace(sentinel_values, pd.NA)

    for col, strategy in strategies.items():
        if col not in df.columns:
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

# Example usage
df = handle_missing(df, {
    "email": "drop",          # Can't use a row without email
    "age": "median",          # Numeric — use median to avoid outlier skew
    "city": "unknown",        # Categorical — fill with placeholder
    "score": "zero",          # Numeric — zero is a valid default
})
```

**Strategy selection guide:**

| Column Type     | Missing % | Recommended Strategy           |
| --------------- | --------- | ------------------------------ |
| Primary key     | Any       | `"drop"` — row is useless      |
| Numeric feature | < 5%      | `"median"` or `"mean"`         |
| Numeric feature | 5-30%     | `"median"` (less outlier bias) |
| Numeric feature | > 50%     | Drop the column entirely       |
| Categorical     | < 10%     | `"mode"` or `"unknown"`        |
| Categorical     | > 30%     | `"unknown"` or drop column     |
| Time series     | Any       | `"ffill"` then `"bfill"`       |
| Boolean/flag    | Any       | `False` or `0`                 |

### 4. Deduplicate Rows

```python
def deduplicate(
    df: pd.DataFrame,
    subset: list[str] | None = None,
    keep: str = "first"
) -> pd.DataFrame:
    """
    Remove duplicate rows.

    Args:
        subset: columns to consider for duplicates. None = all columns.
        keep: "first", "last", or False (drop all duplicates).
    """
    before = len(df)
    df = df.drop_duplicates(subset=subset, keep=keep).reset_index(drop=True)
    after = len(df)
    print(f"Deduplication: {before} -> {after} rows ({before - after} removed)")
    return df

# Exact dedup on all columns
df = deduplicate(df)

# Dedup on specific key columns (e.g., same email = same person)
df = deduplicate(df, subset=["email"], keep="last")
```

**When to use subset dedup vs full-row dedup:**

- **Full-row** (`subset=None`): Safe default. Only removes truly identical rows.
- **Subset** (`subset=["email"]`): Use when a business key identifies unique
  entities. Keep `"last"` if later records are more current.

### 5. Convert Types

```python
def convert_types(df: pd.DataFrame, type_map: dict) -> pd.DataFrame:
    """
    Convert column types safely.

    type_map: dict mapping column names to target types:
      - "int"       : integer (nullable Int64)
      - "float"     : float64
      - "str"       : string
      - "bool"      : boolean
      - "datetime"  : datetime64 (auto-parse)
      - "category"  : pandas Categorical
      - a format str: datetime with explicit format (e.g., "%Y-%m-%d")
    """
    df = df.copy()
    for col, target in type_map.items():
        if col not in df.columns:
            continue
        try:
            if target == "int":
                df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")
            elif target == "float":
                df[col] = pd.to_numeric(df[col], errors="coerce")
            elif target == "str":
                df[col] = df[col].astype(str).replace("nan", pd.NA)
            elif target == "bool":
                true_vals = {"true", "yes", "1", "t", "y"}
                false_vals = {"false", "no", "0", "f", "n"}
                df[col] = df[col].astype(str).str.lower().map(
                    lambda x: True if x in true_vals
                    else (False if x in false_vals else pd.NA)
                )
            elif target == "datetime":
                df[col] = pd.to_datetime(df[col], errors="coerce")
            elif target == "category":
                df[col] = df[col].astype("category")
            elif target.startswith("%"):
                # Explicit datetime format
                df[col] = pd.to_datetime(df[col], format=target, errors="coerce")
            else:
                df[col] = df[col].astype(target)
        except Exception as e:
            print(f"Warning: Could not convert {col} to {target}: {e}")
    return df

# Example
df = convert_types(df, {
    "age": "int",
    "price": "float",
    "created_at": "datetime",
    "signup_date": "%Y-%m-%d",
    "is_active": "bool",
    "category": "category",
})
```

**Type conversion pitfalls:**

| Pitfall                              | Solution                                    |
| ------------------------------------ | ------------------------------------------- |
| `int` with NaN raises error          | Use `"Int64"` (nullable integer), not `int` |
| `"nan"` strings after `.astype(str)` | Replace `"nan"` with `pd.NA`                |
| Mixed date formats in one column     | Use `pd.to_datetime(errors="coerce")`       |
| `"$1,234.56"` won't parse as float   | Strip `$` and `,` first                     |
| Boolean column has `"yes"/"no"`      | Map explicitly, don't use `.astype(bool)`   |

### 6. Additional Cleaning (Optional)

Apply these as needed based on the data profile.

#### Strip whitespace from string columns

```python
str_cols = df.select_dtypes(include=["object", "string"]).columns
for col in str_cols:
    df[col] = df[col].str.strip()
```

#### Remove currency symbols and parse as numeric

```python
def clean_currency(series: pd.Series) -> pd.Series:
    """Remove $, commas, and parse as float."""
    return pd.to_numeric(
        series.astype(str)
        .str.replace(r'[$,]', '', regex=True)
        .str.strip(),
        errors="coerce"
    )

df["price"] = clean_currency(df["price"])
```

#### Clip outliers using IQR

```python
def clip_outliers_iqr(df: pd.DataFrame, columns: list[str],
                      factor: float = 1.5) -> pd.DataFrame:
    """Clip values outside IQR * factor to the boundary values."""
    df = df.copy()
    for col in columns:
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        lower = q1 - factor * iqr
        upper = q3 + factor * iqr
        clipped = df[col].clip(lower, upper)
        n_clipped = (df[col] != clipped).sum()
        if n_clipped > 0:
            print(f"Clipped {n_clipped} outliers in {col} "
                  f"(range: [{lower:.2f}, {upper:.2f}])")
        df[col] = clipped
    return df
```

#### Standardize categorical values

```python
def standardize_categories(series: pd.Series,
                           mapping: dict) -> pd.Series:
    """Map variant spellings to canonical values."""
    return series.str.lower().str.strip().map(
        lambda x: mapping.get(x, x)
    )

df["status"] = standardize_categories(df["status"], {
    "active": "active",
    "act": "active",
    "inactive": "inactive",
    "inact": "inactive",
    "deactivated": "inactive",
})
```

### 7. Generate Cleaning Report

Always produce a report summarizing what changed.

```python
def cleaning_report(original: pd.DataFrame,
                    cleaned: pd.DataFrame) -> dict:
    """Generate a summary of all cleaning operations."""
    report = {
        "original_shape": list(original.shape),
        "cleaned_shape": list(cleaned.shape),
        "rows_removed": len(original) - len(cleaned),
        "columns_removed": len(original.columns) - len(cleaned.columns),
        "columns_renamed": [
            {"from": orig, "to": clean}
            for orig, clean in zip(original.columns, cleaned.columns)
            if orig != clean
        ] if len(original.columns) == len(cleaned.columns) else [],
        "missing_values_before": int(original.isnull().sum().sum()),
        "missing_values_after": int(cleaned.isnull().sum().sum()),
        "duplicate_rows_before": int(original.duplicated().sum()),
        "duplicate_rows_after": int(cleaned.duplicated().sum()),
        "dtypes_changed": [
            {"column": col,
             "from": str(original[col].dtype),
             "to": str(cleaned[col].dtype)}
            for col in cleaned.columns
            if col in original.columns
            and str(original[col].dtype) != str(cleaned[col].dtype)
        ],
    }
    return report

import json
report = cleaning_report(df_original, df)
print(json.dumps(report, indent=2))
```

### 8. Export Clean Data

```python
# CSV (most compatible)
df.to_csv("cleaned_data.csv", index=False)

# Parquet (preserves types, smaller file size)
df.to_parquet("cleaned_data.parquet", index=False)

# Both
df.to_csv("cleaned_data.csv", index=False)
df.to_parquet("cleaned_data.parquet", index=False)

print(f"Exported {len(df)} rows to cleaned_data.csv and cleaned_data.parquet")
```

**Format selection:**

| Format  | Use when                                               |
| ------- | ------------------------------------------------------ |
| CSV     | Sharing with non-Python tools, Excel users             |
| Parquet | Preserving types, large files, downstream pandas/Spark |

## Common Mistakes

| Mistake                                  | Why it's wrong                                               | Fix                                                 |
| ---------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| Cleaning before profiling                | You don't know what to fix                                   | Always profile first (Step 1)                       |
| Using `.astype(int)` with NaN values     | Raises `IntCastingNaNError`                                  | Use `"Int64"` (nullable) or fill NaN first          |
| Forgetting to normalize sentinels        | `"N/A"`, `"null"`, `""` aren't treated as missing            | Replace sentinels with `pd.NA` before imputation    |
| Deduplicating on all columns by default  | Misses logical duplicates (same email, different whitespace) | Normalize first, then dedup on business keys        |
| Using `.astype(bool)` for yes/no columns | Any non-empty string becomes `True`                          | Map explicitly: `{"yes": True, "no": False}`        |
| Not saving the original DataFrame        | Can't generate a cleaning report or compare                  | `df_original = df.copy()` before any mutations      |
| Modifying DataFrame in-place             | Hard to debug, can't undo                                    | Always use `df = df.copy()` in functions            |
| Dropping columns with any missing values | Loses useful data                                            | Use the strategy guide — only drop if > 50% missing |
| Not resetting index after dropping rows  | Index has gaps, causes issues with `.iloc`                   | Use `.reset_index(drop=True)` after drops           |
| Exporting to CSV then re-importing       | Loses datetime types, nullable ints revert to float          | Use Parquet for intermediate storage                |

## Quick Reference

### Full pipeline template

```python
import pandas as pd
import json
import re

# 1. Load
df = pd.read_csv("input.csv")
df_original = df.copy()

# 2. Normalize columns
df = normalize_columns(df)

# 3. Handle missing values
df = handle_missing(df, {
    "id": "drop",
    "value": "median",
    "name": "unknown",
})

# 4. Deduplicate
df = deduplicate(df, subset=["id"], keep="last")

# 5. Convert types
df = convert_types(df, {
    "id": "int",
    "value": "float",
    "created_at": "datetime",
})

# 6. Export
df.to_csv("cleaned.csv", index=False)
df.to_parquet("cleaned.parquet", index=False)

# 7. Report
report = cleaning_report(df_original, df)
print(json.dumps(report, indent=2))
```
