---
name: pandas-data-cleaning
description: Guides pandas data cleaning workflows for CSV and Parquet files, including handling missing values, deduplicating rows, normalizing column names, and converting column types. Use when the user mentions data cleaning, data wrangling, pandas cleanup, missing values, NaN handling, deduplication, column renaming, type conversion, CSV cleaning, or Parquet preprocessing in Python. Also use when the user has messy tabular data that needs standardization before analysis.
compatibility: Python 3.9+, pandas 1.5+, pyarrow (for Parquet)
---

# Pandas Data Cleaning

Standardize messy tabular data using pandas with consistent, production-ready
patterns. This skill encodes best practices so you don't reinvent cleaning logic
for every dataset.

## When to use

- When cleaning CSV or Parquet files with pandas
- When handling missing values (NaN, None, empty strings, sentinel values)
- When deduplicating rows based on subsets of columns
- When normalizing column names to a consistent format
- When converting column types (strings to dates, objects to numerics, etc.)
- When the user says "clean this data" or "prepare this for analysis"

**Do NOT use when:**

- Working with non-tabular data (JSON APIs, text files, images)
- The task is pure analysis/visualization with already-clean data
- Using a different library (polars, dask) unless the user wants pandas
  specifically

## Workflow

### 1. Assess the data

Before writing any cleaning code, understand what you're working with. Load the
file and run a diagnostic pass. This prevents wasted effort cleaning things that
don't need it.

```python
import pandas as pd

# Load the data
df = pd.read_csv("input.csv")  # or pd.read_parquet("input.parquet")

# Diagnostic summary
print(f"Shape: {df.shape}")
print(f"\nColumn types:\n{df.dtypes}")
print(f"\nMissing values:\n{df.isnull().sum()}")
print(f"\nDuplicate rows: {df.duplicated().sum()}")
print(f"\nSample:\n{df.head()}")
```

Report findings to the user before proceeding. Ask which issues to address if
the scope is ambiguous.

### 2. Normalize column names

Do this first because all subsequent steps reference column names. Consistent
names prevent KeyError bugs downstream.

```python
def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names to snake_case."""
    df = df.copy()
    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(r'[^a-z0-9]+', '_', regex=True)
        .str.strip('_')
    )
    return df
```

**Why copy first:** Avoid mutating the original DataFrame. This makes debugging
easier and prevents subtle bugs when the same DataFrame is referenced elsewhere.

### 3. Handle missing values

Choose the right strategy based on the column's role and data type. Never
blindly drop rows — explain the tradeoff to the user.

| Strategy           | When to use                                 | Code                                   |
| ------------------ | ------------------------------------------- | -------------------------------------- |
| Drop rows          | Missing values are rare (<5%) and random    | `df.dropna(subset=[cols])`             |
| Fill with constant | Categorical columns with a sensible default | `df[col].fillna("Unknown")`            |
| Fill with median   | Numeric columns with outliers               | `df[col].fillna(df[col].median())`     |
| Fill with mean     | Numeric columns, normally distributed       | `df[col].fillna(df[col].mean())`       |
| Forward/back fill  | Time series data                            | `df[col].ffill()` or `df[col].bfill()` |
| Interpolate        | Numeric time series with regular intervals  | `df[col].interpolate(method='linear')` |

**Important:** Always report how many rows/values were affected:

```python
missing_before = df[col].isnull().sum()
df[col] = df[col].fillna(df[col].median())
print(f"Filled {missing_before} missing values in '{col}' with median ({df[col].median():.2f})")
```

**Sentinel values:** Check for disguised missing values before standard NaN
handling. These are common in real-world data:

```python
sentinel_values = ['', 'N/A', 'n/a', 'NA', 'null', 'NULL', 'None', '-', '--', '?', 'missing']
df = df.replace(sentinel_values, pd.NA)
```

### 4. Deduplicate rows

Always specify the subset of columns that define uniqueness — full-row
deduplication misses partial duplicates.

```python
# Check for duplicates on key columns
key_cols = ['id', 'date']  # adjust to the dataset
dupes = df.duplicated(subset=key_cols, keep=False)
print(f"Found {dupes.sum()} duplicate rows based on {key_cols}")

# Keep the first occurrence (or last, depending on requirements)
df = df.drop_duplicates(subset=key_cols, keep='first').reset_index(drop=True)
```

**Why reset_index:** After dropping rows, the index has gaps. Reset it to
prevent confusing iloc/loc mismatches later.

### 5. Convert types

Convert columns to their correct types after cleaning missing values (because
NaN forces columns to float64 or object).

```python
# Numeric conversion (coerce errors to NaN instead of crashing)
df['price'] = pd.to_numeric(df['price'], errors='coerce')

# Date parsing (specify format for speed and correctness)
df['date'] = pd.to_datetime(df['date'], format='%Y-%m-%d', errors='coerce')

# Categorical (reduces memory for low-cardinality string columns)
df['status'] = df['status'].astype('category')

# Boolean
df['is_active'] = df['is_active'].map({'yes': True, 'no': False, 'true': True, 'false': False})
```

**Always use `errors='coerce'`** for `to_numeric` and `to_datetime`. This
converts unparseable values to NaN instead of raising exceptions, letting you
handle them in the missing values step.

### 6. Save the cleaned data

```python
# CSV output
df.to_csv("cleaned_output.csv", index=False)

# Parquet output (preserves types, smaller file size)
df.to_parquet("cleaned_output.parquet", index=False, engine='pyarrow')
```

**Prefer Parquet for intermediate outputs** because it preserves column types
(dates stay dates, categories stay categories). CSV loses type information.

### 7. Generate a cleaning report

Summarize what was done so the user has an audit trail:

```python
report = f"""
Data Cleaning Report
====================
Input:  {original_shape[0]} rows x {original_shape[1]} columns
Output: {df.shape[0]} rows x {df.shape[1]} columns

Columns renamed: {renamed_count}
Missing values filled: {filled_count}
Rows deduplicated: {deduped_count}
Type conversions: {converted_count}
"""
print(report)
```

## Checklist

- [ ] Data loaded and diagnostic summary reviewed
- [ ] Column names normalized to snake_case
- [ ] Sentinel values replaced with pd.NA
- [ ] Missing value strategy chosen per column (not blanket dropna)
- [ ] Duplicates checked on meaningful key columns
- [ ] Types converted with errors='coerce'
- [ ] Cleaned data saved (CSV or Parquet)
- [ ] Cleaning report generated with row/column counts

## Common mistakes

| Mistake                               | Fix                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| Using `df.dropna()` without subset    | Specify `subset=` to only drop rows missing critical columns                                |
| Forgetting sentinel values like "N/A" | Replace sentinels with `pd.NA` before `isnull()` checks                                     |
| Converting types before handling NaN  | Handle missing values first, then convert types                                             |
| Using `inplace=True`                  | Assign results instead: `df = df.dropna()`. Inplace is deprecated-track and harder to debug |
| Not resetting index after dedup       | Always `reset_index(drop=True)` after `drop_duplicates`                                     |
| Hardcoding date formats               | Use `format=` parameter for speed; fall back to `infer_datetime_format` only if needed      |
| Mutating the original DataFrame       | Work on `df.copy()` or chain operations to preserve the original                            |

## Quick reference

| Operation              | Pattern                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| Load CSV               | `pd.read_csv(path, dtype_backend='numpy_nullable')`                    |
| Load Parquet           | `pd.read_parquet(path, engine='pyarrow')`                              |
| Snake_case columns     | `df.columns.str.lower().str.replace(r'[^a-z0-9]+', '_', regex=True)`   |
| Replace sentinels      | `df.replace(['N/A', '', 'null', 'NULL'], pd.NA)`                       |
| Fill NaN (numeric)     | `df[col].fillna(df[col].median())`                                     |
| Fill NaN (categorical) | `df[col].fillna('Unknown')`                                            |
| Deduplicate            | `df.drop_duplicates(subset=keys, keep='first').reset_index(drop=True)` |
| To numeric             | `pd.to_numeric(df[col], errors='coerce')`                              |
| To datetime            | `pd.to_datetime(df[col], format='%Y-%m-%d', errors='coerce')`          |
| Save CSV               | `df.to_csv(path, index=False)`                                         |
| Save Parquet           | `df.to_parquet(path, index=False, engine='pyarrow')`                   |

## Key principles

1. **Diagnose before cleaning** — Always inspect the data first. Blind cleaning
   wastes effort and can silently destroy valid data.

2. **Explicit over implicit** — Specify column subsets for dropna/dedup, use
   format strings for dates, use errors='coerce' for type conversion. Never rely
   on pandas defaults when the behavior matters.

3. **Report what changed** — Every cleaning step should log how many rows or
   values were affected. Silent data loss is the worst kind of bug.

4. **Preserve the original** — Work on copies or new assignments. The user
   should be able to compare before/after.

5. **Order matters** — Normalize columns first, then handle missing values, then
   deduplicate, then convert types. This order prevents cascading errors.
