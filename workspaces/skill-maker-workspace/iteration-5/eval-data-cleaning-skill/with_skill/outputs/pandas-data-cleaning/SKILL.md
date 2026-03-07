---
name: pandas-data-cleaning
description: Guide Python data cleaning workflows using pandas for CSV and Parquet files, covering missing values, deduplication, column normalization, and type conversion. Use when cleaning datasets, preprocessing data, handling missing or null values, deduplicating rows, normalizing column names, converting data types in pandas, or working with messy CSV or Parquet files.
---

# Pandas Data Cleaning

Standardized pandas patterns for cleaning messy datasets. Covers the four core
operations: missing values, deduplication, column normalization, and type
conversion.

## Overview

This skill provides battle-tested pandas patterns for data cleaning tasks. It
eliminates guesswork by prescribing specific approaches for common data quality
issues, with scripts to automate column analysis and cleaning plan generation.

## When to use

- When loading CSV or Parquet files that need cleaning before analysis
- When handling missing values (NaN, None, empty strings, sentinel values)
- When deduplicating rows based on subsets of columns
- When normalizing messy column names (spaces, mixed case, special chars)
- When converting column types (strings to dates, objects to numeric, etc.)
- When building a data pipeline that needs a cleaning stage

**Do NOT use when:**

- Working with already-clean, well-typed DataFrames
- Doing feature engineering (that's transformation, not cleaning)
- Working with non-tabular data (JSON APIs, images, etc.)

## Workflow

### 1. Load and inspect the data

```python
import pandas as pd

# CSV
df = pd.read_csv("data.csv")

# Parquet
df = pd.read_parquet("data.parquet")

# Initial inspection
print(df.shape)
print(df.dtypes)
print(df.isnull().sum())
print(df.describe(include="all"))
```

Use `scripts/analyze-columns.ts` to generate a structured column report:

```bash
bun run scripts/analyze-columns.ts --file data.csv
```

This outputs JSON with column types, null counts, unique counts, and suggested
cleaning actions.

### 2. Normalize column names

Always normalize column names first — it prevents KeyError bugs downstream.

```python
def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Lowercase, strip whitespace, replace spaces/special chars with underscores."""
    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(r'[^\w]', '_', regex=True)
        .str.replace(r'_+', '_', regex=True)
        .str.strip('_')
    )
    return df

df = normalize_columns(df)
```

### 3. Handle missing values

Choose the right strategy per column based on data type and business context:

| Strategy           | When to use                             | Code                                     |
| ------------------ | --------------------------------------- | ---------------------------------------- |
| Drop rows          | < 5% missing, no pattern to missingness | `df.dropna(subset=["col"])`              |
| Fill with median   | Numeric, skewed distribution            | `df["col"].fillna(df["col"].median())`   |
| Fill with mean     | Numeric, normal distribution            | `df["col"].fillna(df["col"].mean())`     |
| Fill with mode     | Categorical columns                     | `df["col"].fillna(df["col"].mode()[0])`  |
| Fill with constant | Known default value                     | `df["col"].fillna("Unknown")`            |
| Forward fill       | Time series, ordered data               | `df["col"].ffill()`                      |
| Interpolate        | Numeric time series with regular gaps   | `df["col"].interpolate(method="linear")` |

**Important:** Replace sentinel values BEFORE handling NaN:

```python
# Common sentinel values that should be treated as missing
sentinels = ["N/A", "n/a", "NA", "null", "NULL", "None", "-", "--", "?", ""]
df = df.replace(sentinels, pd.NA)
```

### 4. Deduplicate rows

```python
# Check for duplicates
dup_count = df.duplicated().sum()
print(f"Found {dup_count} duplicate rows")

# Drop exact duplicates
df = df.drop_duplicates()

# Drop duplicates based on key columns (keep first occurrence)
df = df.drop_duplicates(subset=["id", "email"], keep="first")

# For near-duplicates, normalize before comparing
df["email_clean"] = df["email"].str.lower().str.strip()
df = df.drop_duplicates(subset=["email_clean"], keep="first")
df = df.drop(columns=["email_clean"])
```

### 5. Convert types

```python
# String to datetime
df["date"] = pd.to_datetime(df["date"], format="%Y-%m-%d", errors="coerce")

# Object to numeric (handles commas, currency symbols)
df["price"] = df["price"].str.replace(r'[,$]', '', regex=True)
df["price"] = pd.to_numeric(df["price"], errors="coerce")

# Object to category (for low-cardinality string columns)
if df["status"].nunique() < 20:
    df["status"] = df["status"].astype("category")

# Boolean conversion
bool_map = {"yes": True, "no": False, "true": True, "false": False,
            "1": True, "0": False, "y": True, "n": False}
df["active"] = df["active"].str.lower().map(bool_map)
```

### 6. Validate and export

```python
# Final validation
assert df.duplicated().sum() == 0, "Duplicates remain"
assert df.isnull().sum().sum() == 0 or "intentional NaN columns documented"
print(f"Clean dataset: {df.shape[0]} rows, {df.shape[1]} columns")

# Export
df.to_csv("data_clean.csv", index=False)
df.to_parquet("data_clean.parquet", index=False)
```

## Checklist

- [ ] Data loaded and inspected (shape, dtypes, null counts)
- [ ] Column names normalized (lowercase, underscores, no special chars)
- [ ] Sentinel values replaced with pd.NA
- [ ] Missing value strategy chosen per column
- [ ] Duplicates identified and removed
- [ ] Types converted (dates, numerics, categories, booleans)
- [ ] Final validation passed (no unexpected nulls, no duplicates)
- [ ] Clean data exported

## Examples

**Example: Cleaning a messy CSV**

Input: `sales_data.csv` with columns `"Customer Name "`, `"Order Date"`,
`"Total $"`, `"Status"` — has nulls, duplicates, and mixed types.

```python
import pandas as pd

df = pd.read_csv("sales_data.csv")

# 1. Normalize columns
df.columns = df.columns.str.strip().str.lower().str.replace(r'[^\w]', '_', regex=True).str.replace(r'_+', '_', regex=True).str.strip('_')

# 2. Replace sentinels
df = df.replace(["N/A", "n/a", "", "-"], pd.NA)

# 3. Handle missing values
df["customer_name"] = df["customer_name"].fillna("Unknown")
df["total"] = df["total"].str.replace(r'[$,]', '', regex=True)
df["total"] = pd.to_numeric(df["total"], errors="coerce")
df["total"] = df["total"].fillna(df["total"].median())

# 4. Deduplicate
df = df.drop_duplicates(subset=["customer_name", "order_date"], keep="first")

# 5. Convert types
df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")
df["status"] = df["status"].astype("category")

# 6. Export
df.to_csv("sales_data_clean.csv", index=False)
```

## Common mistakes

| Mistake                                     | Fix                                                                                           |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Filling numeric NaN with 0 blindly          | Use median/mean — 0 is a real value that skews analysis                                       |
| Not replacing sentinel values before fillna | Replace "N/A", "", "-" etc. with pd.NA first                                                  |
| Using inplace=True                          | Assign back instead: `df = df.dropna()` not `df.dropna(inplace=True)` — inplace is deprecated |
| Deduplicating without specifying subset     | Always specify key columns to avoid dropping valid similar rows                               |
| Converting types before cleaning strings    | Clean string values (strip, replace) before pd.to_numeric/to_datetime                         |
| Ignoring errors="coerce" in type conversion | Always use errors="coerce" to avoid crashes on bad data                                       |
| Normalizing columns after referencing them  | Normalize columns FIRST — avoids KeyError on original names                                   |

## Quick reference

| Operation          | Code                                                 |
| ------------------ | ---------------------------------------------------- |
| Load CSV           | `pd.read_csv("f.csv")`                               |
| Load Parquet       | `pd.read_parquet("f.parquet")`                       |
| Null summary       | `df.isnull().sum()`                                  |
| Normalize columns  | `df.columns = df.columns.str.strip().str.lower()...` |
| Replace sentinels  | `df.replace(["N/A", ""], pd.NA)`                     |
| Drop duplicates    | `df.drop_duplicates(subset=[...], keep="first")`     |
| String to datetime | `pd.to_datetime(df["col"], errors="coerce")`         |
| String to numeric  | `pd.to_numeric(df["col"], errors="coerce")`          |
| Analyze columns    | `bun run scripts/analyze-columns.ts --file data.csv` |

## Key principles

1. **Order matters** — Always normalize columns → replace sentinels → handle
   missing → deduplicate → convert types. Doing these out of order causes
   cascading errors.
2. **Never mutate silently** — Avoid `inplace=True`. Always assign results back
   to the DataFrame so changes are explicit and traceable.
3. **Coerce, don't crash** — Use `errors="coerce"` for type conversions. Bad
   data should become NaN, not raise exceptions that halt the pipeline.
4. **Strategy per column** — There is no universal fill strategy. Choose median,
   mean, mode, constant, or drop based on the column's type and business
   meaning.
5. **Validate at the end** — Always check shape, null counts, and duplicate
   counts after cleaning. Silent data loss is worse than a crash.
