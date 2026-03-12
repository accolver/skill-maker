---
name: pandas-data-cleaning
description: Clean, normalize, and transform tabular data using pandas. Handles missing values, deduplication, column renaming, type conversion, and outlier detection for CSV and Parquet files. Use when cleaning data, wrangling DataFrames, handling NaN values, deduplicating rows, normalizing column names, converting column types, reading messy CSVs, or preparing data for analysis. Also use when the user mentions pandas, data cleaning, data wrangling, or data preprocessing.
---

# Pandas Data Cleaning

Clean and transform tabular data using pandas with consistent, production-ready
patterns. Every cleaning operation follows a standard pipeline: load, inspect,
clean, validate, export.

## Overview

This skill provides a structured workflow for common pandas data cleaning tasks.
It enforces consistent patterns so you don't have to re-explain the same
approaches each time. The core principle: **inspect before you transform,
validate after you transform.**

## When to use

- When cleaning CSV or Parquet files with pandas
- When handling missing values (NaN, None, empty strings, sentinel values)
- When deduplicating rows (exact or fuzzy)
- When normalizing column names to a consistent format
- When converting column types (string to datetime, object to numeric, etc.)
- When the user says "clean this data", "fix this CSV", "wrangle", or
  "preprocess"
- When dealing with messy real-world data that needs standardization

**Do NOT use when:**

- Working with non-tabular data (JSON APIs, nested documents, images)
- Building ML pipelines (use scikit-learn preprocessing instead)
- Performing complex joins or aggregations (that's analysis, not cleaning)
- The data is already clean and the user needs visualization or statistics

## Workflow

### 1. Load and inspect

Before any transformation, understand what you're working with. This prevents
blind cleaning that destroys valid data.

```python
import pandas as pd

# Load with appropriate reader
df = pd.read_csv("data.csv")       # or pd.read_parquet("data.parquet")

# Inspection block — always run this first
print(f"Shape: {df.shape}")
print(f"\nColumn types:\n{df.dtypes}")
print(f"\nMissing values:\n{df.isnull().sum()}")
print(f"\nSample rows:\n{df.head()}")
print(f"\nBasic stats:\n{df.describe(include='all')}")
```

**Why inspect first:** A column named "age" with dtype `object` tells you there
are non-numeric values mixed in. A column with 90% nulls might need to be
dropped entirely rather than filled. You can't make these decisions without
looking at the data.

### 2. Normalize column names

Standardize column names early because every subsequent step references them.

```python
def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names to snake_case."""
    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(r'[^a-z0-9]+', '_', regex=True)
        .str.strip('_')
    )
    return df

df = normalize_columns(df)
```

This handles `"First Name"`, `"first-name"`, `"firstName"`, and `"FIRST_NAME"`
uniformly. Run it before any column-specific operations.

### 3. Handle missing values

Choose the right strategy per column based on data type and business meaning.
Never use a single `fillna()` across the entire DataFrame.

| Data type   | Strategy               | When to use                              |
| ----------- | ---------------------- | ---------------------------------------- |
| Numeric     | `fillna(median)`       | Skewed distributions                     |
| Numeric     | `fillna(mean)`         | Normal distributions                     |
| Numeric     | `fillna(0)`            | When absence means zero (e.g. count)     |
| Categorical | `fillna("unknown")`    | When missing is a valid category         |
| Categorical | `fillna(mode)`         | When missing is likely the majority      |
| Datetime    | `ffill()` or `bfill()` | Time series with gaps                    |
| Any         | `dropna(subset=[...])` | When rows without this value are useless |

```python
# Per-column strategy — explicit is better than blanket fillna
df["revenue"] = df["revenue"].fillna(0)                          # absence = zero
df["category"] = df["category"].fillna("unknown")                # missing category
df["age"] = df["age"].fillna(df["age"].median())                 # skewed numeric
df = df.dropna(subset=["email"])                                 # required field
```

**Also handle hidden missing values** — sentinel values that aren't NaN:

```python
# Replace sentinel values BEFORE other cleaning
sentinel_values = ["N/A", "n/a", "NA", "null", "NULL", "-", "--", "?", ""]
for col in df.select_dtypes(include="object").columns:
    df[col] = df[col].replace(sentinel_values, pd.NA)
```

### 4. Convert types

Fix column types after handling missing values (because NaN in an int column
forces it to float).

```python
# Numeric conversion with error handling
df["price"] = pd.to_numeric(df["price"], errors="coerce")

# Datetime conversion
df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce", format="mixed")

# Categorical for low-cardinality string columns (saves memory)
if df["status"].nunique() < 20:
    df["status"] = df["status"].astype("category")

# Boolean from string
bool_map = {"yes": True, "no": False, "true": True, "false": False,
            "1": True, "0": False, "y": True, "n": False}
df["is_active"] = df["is_active"].str.lower().map(bool_map)

# Integer with nullable support (avoids float conversion from NaN)
df["quantity"] = df["quantity"].astype("Int64")  # capital I = nullable integer
```

**Why `errors="coerce"`:** It converts unparseable values to NaN instead of
raising an exception. You can then inspect and handle those NaN values in the
missing values step. Never use `errors="ignore"` — it silently keeps bad data.

### 5. Deduplicate

Choose the right deduplication strategy based on what "duplicate" means for your
data.

```python
# Exact duplicates — all columns match
df = df.drop_duplicates()

# Business key duplicates — keep the most recent
df = df.sort_values("updated_at").drop_duplicates(subset=["email"], keep="last")

# Near-duplicates — normalize before comparing
df["name_normalized"] = df["name"].str.lower().str.strip()
df = df.drop_duplicates(subset=["name_normalized", "phone"])
df = df.drop(columns=["name_normalized"])
```

**Always log how many rows were removed:**

```python
before = len(df)
df = df.drop_duplicates(subset=["email"], keep="last")
print(f"Removed {before - len(df)} duplicate rows ({before} -> {len(df)})")
```

### 6. Validate and export

After all transformations, verify the data meets expectations before saving.

```python
# Validation checks
assert df.shape[0] > 0, "DataFrame is empty after cleaning"
assert df["email"].isnull().sum() == 0, "email column still has nulls"
assert df["price"].dtype in ["float64", "Float64"], f"price has wrong type: {df['price'].dtype}"
assert df.duplicated(subset=["email"]).sum() == 0, "Duplicates remain on email"

# Export
df.to_csv("cleaned_data.csv", index=False)
# or for better performance and type preservation:
df.to_parquet("cleaned_data.parquet", index=False)

print(f"Exported {len(df)} rows, {len(df.columns)} columns")
```

**Prefer Parquet for intermediate outputs** because it preserves dtypes
(datetime stays datetime, categories stay categories). CSV loses type
information and requires re-parsing.

## Checklist

- [ ] Loaded data and ran inspection block (shape, dtypes, nulls, sample)
- [ ] Normalized column names to snake_case
- [ ] Replaced sentinel values (N/A, null, -, etc.) with pd.NA
- [ ] Applied per-column missing value strategy (not blanket fillna)
- [ ] Converted column types with `errors="coerce"`
- [ ] Deduplicated with explicit subset and keep strategy
- [ ] Logged row counts before/after each major operation
- [ ] Ran validation assertions before export
- [ ] Exported with appropriate format (CSV or Parquet)

## Examples

**Example: Cleaning a messy customer CSV**

Input: A CSV with inconsistent column names, mixed types, and duplicates.

```csv
"Customer ID","First Name","last_name","EMAIL","Age","signup_date","Revenue","is_active"
1,"Alice","Smith","alice@example.com",30,"2023-01-15",1500.50,"yes"
2,"Bob","Jones","bob@example.com","twenty-five","2023-02-20",,"no"
3,"Alice","Smith","alice@example.com",30,"2023-01-15",1500.50,"yes"
4,"Charlie","Brown","charlie@example.com",45,"invalid-date",3200.00,"Y"
5,"","Davis","","N/A","2023-04-10",0,"true"
```

Output: Complete cleaning script.

```python
import pandas as pd

# 1. Load and inspect
df = pd.read_csv("customers.csv")
print(f"Shape: {df.shape}")
print(f"\nColumn types:\n{df.dtypes}")
print(f"\nMissing values:\n{df.isnull().sum()}")

# 2. Normalize column names
df.columns = (
    df.columns.str.strip().str.lower()
    .str.replace(r'[^a-z0-9]+', '_', regex=True).str.strip('_')
)
# Result: customer_id, first_name, last_name, email, age, signup_date, revenue, is_active

# 3. Replace sentinel values
sentinels = ["N/A", "n/a", "NA", "null", "NULL", "-", "--", "?", ""]
for col in df.select_dtypes(include="object").columns:
    df[col] = df[col].replace(sentinels, pd.NA)

# 4. Handle missing values (per-column strategy)
df = df.dropna(subset=["email"])                    # email is required
df["revenue"] = df["revenue"].fillna(0)             # no revenue = zero
df["first_name"] = df["first_name"].fillna("unknown")

# 5. Convert types
df["age"] = pd.to_numeric(df["age"], errors="coerce")
df["age"] = df["age"].fillna(df["age"].median())
df["signup_date"] = pd.to_datetime(df["signup_date"], errors="coerce", format="mixed")
df["revenue"] = pd.to_numeric(df["revenue"], errors="coerce").fillna(0)
bool_map = {"yes": True, "no": False, "true": True, "false": False,
            "y": True, "n": False}
df["is_active"] = df["is_active"].str.lower().map(bool_map)

# 6. Deduplicate
before = len(df)
df = df.drop_duplicates(subset=["email"], keep="first")
print(f"Removed {before - len(df)} duplicate rows")

# 7. Validate and export
assert df["email"].isnull().sum() == 0
assert df["age"].dtype == "float64"
assert df.duplicated(subset=["email"]).sum() == 0

df.to_csv("customers_cleaned.csv", index=False)
print(f"Exported {len(df)} rows, {len(df.columns)} columns")
```

## Common mistakes

| Mistake                                         | Fix                                                                                                       |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Using `df.fillna(0)` on the entire DataFrame    | Apply fill strategies per column — filling a name column with 0 creates nonsense data                     |
| Using `errors="ignore"` in type conversion      | Use `errors="coerce"` to convert bad values to NaN, then handle them explicitly                           |
| Deduplicating without specifying `subset`       | Always specify which columns define uniqueness — `drop_duplicates()` alone only catches exact row matches |
| Not handling sentinel values before `isnull()`  | Replace "N/A", "null", "", etc. with `pd.NA` first — `isnull()` doesn't catch string sentinels            |
| Converting types before handling missing values | NaN in an integer column forces float dtype — handle nulls or use nullable `Int64`                        |
| Using `inplace=True`                            | Avoid it — it's deprecated in newer pandas, makes code harder to debug, and prevents method chaining      |
| Forgetting to log row counts                    | Always print before/after counts for drops and deduplication — silent data loss is the worst bug          |
| Saving intermediate results as CSV              | Use Parquet for intermediate files — CSV loses type information and is slower to read/write               |

## Quick reference

| Operation          | Code                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Load CSV           | `pd.read_csv("file.csv")`                                                                       |
| Load Parquet       | `pd.read_parquet("file.parquet")`                                                               |
| Inspect nulls      | `df.isnull().sum()`                                                                             |
| Normalize columns  | `df.columns.str.strip().str.lower().str.replace(r'[^a-z0-9]+', '_', regex=True).str.strip('_')` |
| Replace sentinels  | `df[col].replace(["N/A", "", "null"], pd.NA)`                                                   |
| Fill numeric nulls | `df["col"].fillna(df["col"].median())`                                                          |
| Coerce to numeric  | `pd.to_numeric(df["col"], errors="coerce")`                                                     |
| Coerce to datetime | `pd.to_datetime(df["col"], errors="coerce", format="mixed")`                                    |
| Nullable integer   | `df["col"].astype("Int64")`                                                                     |
| Deduplicate by key | `df.drop_duplicates(subset=["key"], keep="last")`                                               |
| Validate no nulls  | `assert df["col"].isnull().sum() == 0`                                                          |
| Export CSV         | `df.to_csv("out.csv", index=False)`                                                             |
| Export Parquet     | `df.to_parquet("out.parquet", index=False)`                                                     |

## Key principles

1. **Inspect before transforming** — Always run the inspection block before any
   cleaning. Blind transformations destroy valid data and miss hidden problems
   like sentinel values masquerading as real data.

2. **Per-column strategies** — Never apply a single cleaning operation across
   the entire DataFrame. Each column has different semantics: a missing revenue
   means zero, a missing email means the row is useless, a missing category
   means "unknown". Treat them differently.

3. **Coerce, don't ignore** — Use `errors="coerce"` for type conversions so bad
   values become NaN (visible and handleable) rather than silently remaining as
   strings. Then handle those NaN values explicitly.

4. **Log every mutation** — Print row counts before and after drops,
   deduplication, and null removal. Silent data loss is the hardest bug to find
   in data pipelines.

5. **Validate before export** — Run assertions on the cleaned DataFrame before
   saving. Check for remaining nulls in required columns, correct dtypes, and no
   remaining duplicates. Catching problems here is cheaper than finding them
   downstream.
