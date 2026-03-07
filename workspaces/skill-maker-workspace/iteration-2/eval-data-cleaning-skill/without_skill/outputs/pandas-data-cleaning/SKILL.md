---
name: Cleaning-DataFrames-with-Pandas
description: Use when cleaning, preprocessing, or standardizing tabular data in Python with pandas. Covers missing values, deduplication, column normalization, type conversion, and loading CSV or Parquet files.
---

# Cleaning DataFrames with Pandas

## Overview

Reusable patterns for the most common pandas data cleaning operations: handling
missing values, deduplicating rows, normalizing column names, and converting
column types. Targets CSV and Parquet workflows.

## When to Use

- Loading and cleaning CSV or Parquet files
- Handling NaN/null values (drop, fill, interpolate)
- Removing duplicate rows
- Standardizing messy column names
- Converting column dtypes (strings to dates, objects to numerics, etc.)
- Building a reusable cleaning pipeline

## Quick Reference

| Task              | Pattern                                          | Key Function                          |
| ----------------- | ------------------------------------------------ | ------------------------------------- |
| Load CSV          | `pd.read_csv(path, na_values=[...])`             | `read_csv`                            |
| Load Parquet      | `pd.read_parquet(path)`                          | `read_parquet`                        |
| Inspect nulls     | `df.isnull().sum()`                              | `isnull`                              |
| Drop null rows    | `df.dropna(subset=[...])`                        | `dropna`                              |
| Fill nulls        | `df.fillna(value)` / `df.fillna(method='ffill')` | `fillna`                              |
| Drop duplicates   | `df.drop_duplicates(subset=[...], keep='first')` | `drop_duplicates`                     |
| Normalize columns | `df.columns = normalize(df.columns)`             | See pattern below                     |
| Convert types     | `df['col'].astype(dtype)` / `pd.to_datetime()`   | `astype`, `to_datetime`, `to_numeric` |

## Loading Data

```python
import pandas as pd

# CSV with explicit NA markers and encoding
df = pd.read_csv(
    "data.csv",
    na_values=["", "N/A", "n/a", "NULL", "null", "-", "missing"],
    encoding="utf-8",
    low_memory=False,
)

# Parquet (types are preserved, no na_values needed)
df = pd.read_parquet("data.parquet")
```

**Tip:** Parquet preserves dtypes and handles nulls natively. Prefer it over CSV
when possible.

## Handling Missing Values

### Inspect first

```python
# Count nulls per column
print(df.isnull().sum())

# Percentage of nulls per column
print(df.isnull().mean().mul(100).round(1))
```

### Strategy selection

Choose based on context:

```python
# 1. Drop rows where critical columns are null
df = df.dropna(subset=["id", "created_at"])

# 2. Fill with a constant (categorical columns)
df["status"] = df["status"].fillna("unknown")

# 3. Fill with column median (numeric, skewed data)
df["revenue"] = df["revenue"].fillna(df["revenue"].median())

# 4. Fill with column mean (numeric, normal distribution)
df["score"] = df["score"].fillna(df["score"].mean())

# 5. Forward-fill time series data
df["price"] = df["price"].ffill()

# 6. Interpolate (numeric, ordered data)
df["temperature"] = df["temperature"].interpolate(method="linear")
```

**When to drop vs fill:**

- **Drop** when the column is a required identifier or key, or when <5% of rows
  are affected
- **Fill with constant** for categorical columns where "unknown" is meaningful
- **Fill with median/mean** for numeric columns you need for analysis
- **Forward-fill** for time series where the last known value is the best
  estimate

## Deduplicating Rows

```python
# Check for duplicates
n_dupes = df.duplicated().sum()
print(f"Found {n_dupes} duplicate rows")

# Check duplicates on specific columns (composite key)
n_dupes_key = df.duplicated(subset=["user_id", "timestamp"]).sum()

# Drop duplicates, keeping the first occurrence
df = df.drop_duplicates(subset=["user_id", "timestamp"], keep="first")

# Drop duplicates keeping the last (e.g., most recent record wins)
df = df.drop_duplicates(subset=["user_id"], keep="last")
```

**Tip:** Always specify `subset` — full-row deduplication misses logical
duplicates where only key columns matter.

## Normalizing Column Names

```python
import re

def normalize_columns(columns):
    """Normalize column names to snake_case."""
    result = []
    for col in columns:
        col = str(col).strip()
        col = re.sub(r"[^\w\s]", "", col)       # Remove special chars
        col = re.sub(r"\s+", "_", col)           # Spaces to underscores
        col = re.sub(r"_+", "_", col)            # Collapse multiple underscores
        col = col.strip("_").lower()
        result.append(col)
    return result

df.columns = normalize_columns(df.columns)
```

This handles inputs like `"First Name"`, `"revenue ($)"`, `"  Status  "`,
`"user__id"` and produces `first_name`, `revenue`, `status`, `user_id`.

## Converting Types

```python
# String to datetime
df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")

# Object to numeric (coerce turns unparseable values to NaN)
df["amount"] = pd.to_numeric(df["amount"], errors="coerce")

# Object to category (saves memory for low-cardinality columns)
df["status"] = df["status"].astype("category")

# Float to nullable integer (handles NaN in integer columns)
df["count"] = df["count"].astype("Int64")  # capital I = nullable

# Boolean from string
df["is_active"] = df["is_active"].map({"true": True, "false": False, "yes": True, "no": False})
```

**Always use `errors="coerce"`** with `to_datetime` and `to_numeric` — it
converts unparseable values to `NaT`/`NaN` instead of raising exceptions,
letting you handle bad data downstream.

## Full Cleaning Pipeline

Combine all patterns into a reusable function:

```python
import pandas as pd
import re

def clean_dataframe(
    df: pd.DataFrame,
    required_columns: list[str] | None = None,
    dedup_columns: list[str] | None = None,
    datetime_columns: list[str] | None = None,
    numeric_columns: list[str] | None = None,
    fill_defaults: dict | None = None,
) -> pd.DataFrame:
    """Clean a DataFrame with standard operations.

    Args:
        df: Input DataFrame.
        required_columns: Drop rows where these columns are null.
        dedup_columns: Deduplicate on these columns (keep first).
        datetime_columns: Convert these columns to datetime.
        numeric_columns: Convert these columns to numeric.
        fill_defaults: Dict of {column: fill_value} for null filling.

    Returns:
        Cleaned DataFrame.
    """
    df = df.copy()

    # 1. Normalize column names
    df.columns = [
        re.sub(r"_+", "_", re.sub(r"\s+", "_", re.sub(r"[^\w\s]", "", str(c).strip())))
        .strip("_")
        .lower()
        for c in df.columns
    ]

    # 2. Drop rows missing required columns
    if required_columns:
        df = df.dropna(subset=required_columns)

    # 3. Deduplicate
    if dedup_columns:
        df = df.drop_duplicates(subset=dedup_columns, keep="first")

    # 4. Convert types
    for col in datetime_columns or []:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    for col in numeric_columns or []:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # 5. Fill nulls
    if fill_defaults:
        df = df.fillna(fill_defaults)

    # 6. Reset index
    df = df.reset_index(drop=True)

    return df
```

**Usage:**

```python
df = pd.read_csv("sales.csv", na_values=["", "N/A", "NULL"])

df_clean = clean_dataframe(
    df,
    required_columns=["order_id", "customer_id"],
    dedup_columns=["order_id"],
    datetime_columns=["order_date"],
    numeric_columns=["amount", "quantity"],
    fill_defaults={"status": "unknown", "discount": 0.0},
)
```

## Common Mistakes

| Mistake                                            | Fix                                                                     |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| Modifying original DataFrame                       | Always `df = df.copy()` at the start of cleaning                        |
| Using `errors="ignore"` in type conversion         | Use `errors="coerce"` — ignore silently hides bad data                  |
| Deduplicating without specifying `subset`          | Always specify key columns for logical deduplication                    |
| Forgetting to reset index after drops              | Call `df.reset_index(drop=True)` after dropping rows                    |
| Filling numeric nulls with 0 without thinking      | 0 is a real value — use `NaN`, median, or mean if 0 would skew analysis |
| Not checking null counts before and after cleaning | Always print `df.isnull().sum()` before and after to verify             |
