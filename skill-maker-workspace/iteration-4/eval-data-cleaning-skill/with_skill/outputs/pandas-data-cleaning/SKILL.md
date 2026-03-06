---
name: pandas-data-cleaning
description: Apply battle-tested pandas patterns for cleaning tabular data — handling missing values, deduplicating rows, normalizing column names, and converting types. Use when working with CSV or Parquet files, cleaning DataFrames, preprocessing data, handling NaN or null values, removing duplicates, standardizing columns, or doing any data wrangling in Python with pandas.
---

# Pandas Data Cleaning

Consistent, ordered pipeline for cleaning tabular data with pandas. Covers the
four operations that account for ~80% of data cleaning work: normalize columns,
deduplicate, convert types, handle missing values.

## When to use

- When cleaning or preprocessing CSV or Parquet data with pandas
- When handling missing values, NaN, or nulls in a DataFrame
- When deduplicating rows or removing duplicate records
- When normalizing messy column names (spaces, mixed case, special characters)
- When converting column types (datetime, numeric, categorical)

**Do NOT use when:**

- Working with non-tabular data (JSON trees, XML, unstructured text)
- Using a different data library (polars, dask) — patterns differ significantly
- Doing statistical analysis or ML feature engineering (separate concern)

## Workflow

Follow this order because each step depends on the previous one being clean.

### 1. Load and inspect

```python
import pandas as pd

# CSV (most common)
df = pd.read_csv("data.csv")

# Parquet
df = pd.read_parquet("data.parquet")

# Always inspect first — never clean blind
print(df.shape)
print(df.dtypes)
print(df.isnull().sum())
print(df.duplicated().sum())
```

Inspecting first prevents wasted work. If a column has 95% nulls, you drop it
rather than filling it.

### 2. Normalize column names

Do this first because every subsequent step references column names.

```python
import re

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Lowercase, strip, replace non-alphanumeric with underscores."""
    df.columns = [
        re.sub(r'[^a-z0-9]+', '_', col.strip().lower()).strip('_')
        for col in df.columns
    ]
    return df

df = normalize_columns(df)
```

### 3. Deduplicate rows

Deduplicate before type conversion because duplicates can mask type errors.

```python
# Check scope first
print(f"Duplicates: {df.duplicated().sum()}")

# Full-row dedup
df = df.drop_duplicates()

# Key-based dedup (keep most recent)
df = df.drop_duplicates(subset=["user_id", "email"], keep="last")
```

### 4. Convert types

Convert before filling nulls because type-aware fills (e.g., median for numeric)
require correct types.

```python
# Datetime — errors='coerce' turns unparseable values to NaT
df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")

# Numeric — errors='coerce' turns non-numeric to NaN
df["revenue"] = pd.to_numeric(df["revenue"], errors="coerce")

# Categorical (for low-cardinality string columns)
df["status"] = df["status"].astype("category")

# Nullable integer (preserves NaN unlike regular int)
df["count"] = df["count"].astype("Int64")
```

> **Why `errors='coerce'`?** It converts bad values to NaN/NaT instead of
> raising exceptions, letting you handle them in the next step. But always check
> how many values were coerced — if it's more than a few percent, investigate
> the source data.

### 5. Handle missing values

Choose strategy per column based on data semantics. See
[references/cleaning-patterns.md](references/cleaning-patterns.md) for the full
decision tree.

```python
# Drop rows missing required fields
df = df.dropna(subset=["user_id", "email"])

# Fill with domain-appropriate defaults
df["status"] = df["status"].fillna("unknown")

# Numeric: median is robust to outliers (prefer over mean)
df["revenue"] = df["revenue"].fillna(df["revenue"].median())

# Time series: forward-fill for continuity
df["temperature"] = df["temperature"].ffill()
```

### 6. Validate and save

```python
# Final checks
assert df.duplicated().sum() == 0, "Duplicates remain"
assert df["user_id"].isnull().sum() == 0, "Required field has nulls"

# Save
df.to_csv("cleaned_data.csv", index=False)
# or
df.to_parquet("cleaned_data.parquet", index=False)
```

## Checklist

- [ ] Loaded data and inspected shape, dtypes, nulls, duplicates
- [ ] Normalized column names (lowercase, underscores, no special chars)
- [ ] Removed duplicate rows (full-row or key-based as appropriate)
- [ ] Converted column types (datetime, numeric, categorical)
- [ ] Handled missing values with per-column strategy
- [ ] Validated output (no unexpected nulls, no duplicates, correct types)
- [ ] Saved to target format (CSV or Parquet)

## Example

**Input:** A messy CSV with inconsistent column names, duplicate rows, mixed
types, and missing values.

```python
import pandas as pd
import re

def clean_dataframe(
    df: pd.DataFrame,
    key_columns: list[str] | None = None,
    required_columns: list[str] | None = None,
) -> pd.DataFrame:
    """Full cleaning pipeline. Applies all steps in order."""

    # 1. Normalize columns
    df.columns = [
        re.sub(r'[^a-z0-9]+', '_', col.strip().lower()).strip('_')
        for col in df.columns
    ]

    # 2. Deduplicate
    if key_columns:
        df = df.drop_duplicates(subset=key_columns, keep="last")
    else:
        df = df.drop_duplicates()

    # 3. Convert types (caller customizes after this)
    # 4. Drop rows missing required fields
    if required_columns:
        df = df.dropna(subset=required_columns)

    # 5. Reset index
    df = df.reset_index(drop=True)

    return df

# Usage
df = pd.read_csv("sales_data.csv")
df = clean_dataframe(df, key_columns=["order_id"], required_columns=["order_id", "amount"])
df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")
df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
df["amount"] = df["amount"].fillna(df["amount"].median())
df.to_csv("sales_data_cleaned.csv", index=False)
```

## Common mistakes

| Mistake                                            | Fix                                                                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Modifying the original DataFrame without a copy    | Use `df = df.copy()` at the start if you need the original later. Pandas operations often return views, not copies.    |
| Using `errors='ignore'` in type conversion         | Use `errors='coerce'` instead — `'ignore'` silently returns the original column unchanged, hiding data quality issues. |
| Deduplicating without specifying `subset`          | Full-row dedup misses logical duplicates. Identify the business key columns (e.g., `user_id + timestamp`).             |
| Filling numeric nulls with 0                       | Zero is a real value. Use `median()` or `mean()` unless zero is the correct domain default.                            |
| Converting to `int` when column has nulls          | Regular `int` can't hold NaN. Use nullable `Int64` dtype instead: `astype("Int64")`.                                   |
| Normalizing columns after referencing them by name | Normalize first, then reference. Otherwise your column names won't match.                                              |
| Not checking coercion damage                       | After `errors='coerce'`, check `df[col].isnull().sum()` to see how many values were lost.                              |

## Key principles

1. **Order matters** — Normalize names, then deduplicate, then convert types,
   then handle nulls. Each step depends on the previous one being clean.
2. **Inspect before acting** — Always look at shape, dtypes, null counts, and
   duplicate counts before writing cleaning code. Blind cleaning wastes effort.
3. **Per-column strategy** — There is no universal fill strategy. Choose based
   on what the column represents (see
   [references/cleaning-patterns.md](references/cleaning-patterns.md)).
4. **Coerce, don't ignore** — `errors='coerce'` makes bad data visible as
   NaN/NaT. `errors='ignore'` hides problems.
5. **Validate at the end** — Assert your expectations (no nulls in required
   fields, no duplicates, correct dtypes) before saving.
