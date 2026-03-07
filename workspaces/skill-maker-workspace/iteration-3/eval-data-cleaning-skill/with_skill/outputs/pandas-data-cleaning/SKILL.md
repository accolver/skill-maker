---
name: pandas-data-cleaning
description: Clean and prepare tabular data using pandas — handles missing values, deduplication, column name normalization, type conversion, and outlier detection for CSV and parquet files. Use when the user mentions data cleaning, data wrangling, data prep, messy data, missing values, NaN handling, duplicates, column renaming, type casting, or preparing a dataset for analysis. Also use when working with dirty CSV or parquet files that need standardization before downstream use.
---

# Pandas Data Cleaning

Systematic workflow for cleaning tabular data with pandas. Produces clean,
analysis-ready DataFrames from messy CSV or parquet inputs.

## Overview

Most data cleaning follows the same sequence: load, inspect, fix columns, handle
missing values, deduplicate, convert types, validate. This skill encodes that
sequence with battle-tested pandas patterns so you don't reinvent them each
time.

## When to use

- When loading a CSV or parquet file that needs cleaning before analysis
- When the user mentions missing values, NaN, nulls, or incomplete data
- When deduplicating rows or handling duplicate records
- When column names need normalization (spaces, casing, special characters)
- When converting column types (strings to dates, objects to numeric, etc.)
- When preparing a dataset for machine learning or reporting

**Do NOT use when:**

- Data is already clean and the task is pure analysis or visualization
- Working with non-tabular data (JSON APIs, text files, images)
- The user needs SQL database operations, not pandas

## Workflow

### 1. Load and inspect

Load the file and immediately assess its condition. This determines which
cleaning steps are needed.

```python
import pandas as pd

# CSV — always check encoding and separator
df = pd.read_csv("data.csv", encoding="utf-8")  # try "latin-1" if utf-8 fails

# Parquet — needs pyarrow or fastparquet
df = pd.read_parquet("data.parquet")

# Inspection — run ALL of these before cleaning
print(f"Shape: {df.shape}")
print(f"\nColumn types:\n{df.dtypes}")
print(f"\nMissing values:\n{df.isnull().sum()}")
print(f"\nDuplicate rows: {df.duplicated().sum()}")
print(f"\nSample:\n{df.head()}")
```

**Decision point:** Based on inspection output, determine which of steps 2-5
apply. Skip steps that aren't needed — don't clean what's already clean.

### 2. Normalize column names

Standardize column names to snake_case. This prevents downstream KeyError bugs
from inconsistent naming.

```python
df.columns = (
    df.columns
    .str.strip()
    .str.lower()
    .str.replace(r"[^a-z0-9]+", "_", regex=True)
    .str.strip("_")
)
```

**Why snake_case:** It's the Python convention, avoids quoting in attribute
access (`df.column_name` vs `df["Column Name"]`), and eliminates whitespace
bugs.

### 3. Handle missing values

Choose the right strategy per column based on data type and business meaning.
See
[references/missing-value-strategies.md](references/missing-value-strategies.md)
for the full decision tree.

**Quick reference:**

| Column type            | Default strategy                       | When to use something else                     |
| ---------------------- | -------------------------------------- | ---------------------------------------------- |
| Numeric (measurements) | `df["col"].fillna(df["col"].median())` | Use mean if distribution is symmetric          |
| Numeric (counts/IDs)   | Drop rows or fill with 0               | Never interpolate IDs                          |
| Categorical            | `df["col"].fillna("Unknown")`          | Use mode if one category dominates             |
| Datetime               | `df["col"].fillna(method="ffill")`     | Only for time series with regular intervals    |
| Critical fields        | `df.dropna(subset=["col"])`            | When the row is meaningless without this value |

**Always report what you did:**

```python
missing_before = df.isnull().sum().sum()
# ... apply strategies ...
missing_after = df.isnull().sum().sum()
print(f"Resolved {missing_before - missing_after} missing values ({missing_after} remaining)")
```

### 4. Deduplicate

```python
n_dupes = df.duplicated().sum()
if n_dupes > 0:
    # Exact duplicates — safe to drop
    df = df.drop_duplicates()

    # Near-duplicates — deduplicate on key columns, keep latest
    # df = df.sort_values("updated_at").drop_duplicates(subset=["id"], keep="last")

    print(f"Removed {n_dupes} duplicate rows")
```

**Key decision:** Exact duplicates (all columns match) are always safe to drop.
Near-duplicates (same ID, different values) require a merge strategy — ask the
user which record to keep if unclear.

### 5. Convert types

Fix columns that pandas inferred incorrectly. Common conversions:

```python
# String dates → datetime
df["date_col"] = pd.to_datetime(df["date_col"], format="%Y-%m-%d", errors="coerce")

# Object → numeric (handles commas, currency symbols)
df["price"] = df["price"].replace(r"[\$,]", "", regex=True).astype(float)

# Object → category (saves memory for low-cardinality columns)
for col in df.select_dtypes("object"):
    if df[col].nunique() / len(df) < 0.05:  # <5% unique values
        df[col] = df[col].astype("category")

# Boolean-like strings → bool
df["active"] = df["active"].map({"yes": True, "no": False, "true": True, "false": False})
```

**Always use `errors="coerce"`** for type conversions on dirty data. This
converts unparseable values to NaN instead of crashing, letting you handle them
in the missing values step.

### 6. Validate and save

```python
# Final validation
assert df.duplicated().sum() == 0, "Duplicates remain"
assert df.isnull().sum().sum() == 0 or print("Warning: some nulls remain — intentional?")
print(f"\nCleaned data: {df.shape[0]} rows, {df.shape[1]} columns")
print(f"Column types:\n{df.dtypes}")

# Save
df.to_csv("cleaned_data.csv", index=False)
# or df.to_parquet("cleaned_data.parquet", index=False)
```

## Checklist

- [ ] Loaded file and ran full inspection (shape, dtypes, nulls, duplicates)
- [ ] Column names normalized to snake_case
- [ ] Missing values handled with documented strategy per column
- [ ] Duplicates removed (exact and/or near-duplicates)
- [ ] Column types corrected (dates, numerics, categories)
- [ ] Cleaning summary printed (before/after counts)
- [ ] Cleaned file saved in requested format

## Example

**Input:** User says "Clean this sales CSV — it has messy column names, some
missing prices, and duplicate order IDs"

**Output:**

```python
import pandas as pd

# 1. Load and inspect
df = pd.read_csv("sales.csv")
print(f"Shape: {df.shape}")
print(f"Missing:\n{df.isnull().sum()}")
print(f"Duplicates: {df.duplicated().sum()}")

# 2. Normalize columns
df.columns = (
    df.columns.str.strip().str.lower()
    .str.replace(r"[^a-z0-9]+", "_", regex=True)
    .str.strip("_")
)

# 3. Handle missing prices — median fill for skewed sales data
df["price"] = df["price"].fillna(df["price"].median())

# 4. Deduplicate on order_id, keeping the most recent entry
df = df.sort_values("date").drop_duplicates(subset=["order_id"], keep="last")

# 5. Fix types
df["date"] = pd.to_datetime(df["date"], errors="coerce")
df["price"] = pd.to_numeric(df["price"], errors="coerce")

# 6. Validate and save
print(f"\nCleaned: {df.shape[0]} rows, {df.shape[1]} columns")
print(f"Remaining nulls: {df.isnull().sum().sum()}")
df.to_csv("sales_cleaned.csv", index=False)
```

## Common mistakes

| Mistake                                                                        | Fix                                                                                                                                |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Filling ALL missing values with 0 or mean without considering column semantics | Choose strategy per column — median for skewed numeric, "Unknown" for categorical, drop for critical fields                        |
| Using `inplace=True` everywhere                                                | Avoid `inplace=True` — it's deprecated-trending, harder to debug, and prevents method chaining. Use assignment: `df = df.dropna()` |
| Dropping duplicates without specifying subset columns                          | For near-duplicates, always specify `subset=` with the key columns and `keep=` with the retention strategy                         |
| Converting types before handling missing values                                | Handle NaN first, then convert types. Otherwise `astype(int)` crashes on NaN values                                                |
| Not inspecting data before cleaning                                            | Always run the full inspection block first. Blind cleaning misses problems and creates new ones                                    |
| Forgetting `errors="coerce"` on dirty data                                     | Without it, one malformed value crashes the entire conversion. Coerce to NaN, then handle                                          |
| Hardcoding file encoding as utf-8                                              | Try utf-8 first, fall back to latin-1 or cp1252. Use `chardet` for unknown encodings                                               |

## Quick reference

| Operation                   | Pattern                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Load CSV                    | `pd.read_csv("f.csv", encoding="utf-8")`                                                                     |
| Load parquet                | `pd.read_parquet("f.parquet")`                                                                               |
| Snake_case columns          | `df.columns = df.columns.str.strip().str.lower().str.replace(r"[^a-z0-9]+", "_", regex=True).str.strip("_")` |
| Fill numeric nulls          | `df["col"].fillna(df["col"].median())`                                                                       |
| Fill categorical nulls      | `df["col"].fillna("Unknown")`                                                                                |
| Drop rows missing key field | `df.dropna(subset=["key_col"])`                                                                              |
| Exact dedup                 | `df.drop_duplicates()`                                                                                       |
| Key-based dedup             | `df.sort_values("ts").drop_duplicates(subset=["id"], keep="last")`                                           |
| String → datetime           | `pd.to_datetime(df["col"], format="%Y-%m-%d", errors="coerce")`                                              |
| String → numeric            | `pd.to_numeric(df["col"].str.replace(r"[\$,]", "", regex=True), errors="coerce")`                            |
| Object → category           | `df["col"] = df["col"].astype("category")`                                                                   |
| Save CSV                    | `df.to_csv("out.csv", index=False)`                                                                          |
| Save parquet                | `df.to_parquet("out.parquet", index=False)`                                                                  |

## Key principles

1. **Inspect before you clean** — Never apply cleaning blindly. The inspection
   step reveals what's actually wrong and prevents unnecessary transformations.
2. **Strategy per column, not per DataFrame** — Different columns need different
   missing value strategies. A blanket `fillna(0)` corrupts categorical data and
   distorts distributions.
3. **Order matters: columns → nulls → duplicates → types** — Normalize names
   first so you can reference columns reliably. Handle nulls before type
   conversion to avoid crashes. Deduplicate before expensive operations to
   reduce work.
4. **Always report what changed** — Print before/after counts for every cleaning
   step. Silent cleaning hides data loss and makes debugging impossible.
5. **Preserve the original** — Never overwrite the source file. Save cleaned
   output to a new file so the user can compare and verify.
