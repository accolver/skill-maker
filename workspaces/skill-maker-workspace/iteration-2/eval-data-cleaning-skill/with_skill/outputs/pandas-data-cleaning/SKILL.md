---
name: pandas-data-cleaning
description: Guides systematic data cleaning pipelines in pandas — handling missing values, deduplicating rows, normalizing column names, and converting column types for CSV and Parquet files. Use when the user asks to clean data, wrangle a dataset, preprocess a DataFrame, fix messy columns, handle nulls or NaNs, remove duplicates, standardize column names, or convert data types in Python with pandas.
---

# Pandas Data Cleaning

Systematic data cleaning pipeline for pandas DataFrames. Produces clean,
analysis-ready data from messy CSV or Parquet inputs by following a fixed
ordering of operations that prevents common pitfalls.

## When to use

- When cleaning or preprocessing a CSV or Parquet file with pandas
- When handling missing values (NaN, None, empty strings)
- When deduplicating rows in a DataFrame
- When normalizing or standardizing column names
- When converting column types (string to datetime, object to numeric, etc.)
- When the user says "clean this data", "wrangle", "preprocess", or "tidy up"

**Do NOT use when:**

- The task is pure analysis/visualization with already-clean data
- The user needs SQL-based cleaning (use SQL skill instead)
- The task involves streaming data or non-tabular formats (JSON APIs, logs)

## Workflow

Follow this numbered pipeline in order. The ordering matters because later steps
depend on earlier ones (e.g., deduplication is more reliable after column names
are normalized).

### 1. Load and inspect

Load the file and get an immediate picture of data quality.

```python
import pandas as pd

# CSV
df = pd.read_csv("data.csv")

# Parquet
df = pd.read_parquet("data.parquet")

# Inspection — run all of these before making changes
print(df.shape)
print(df.dtypes)
print(df.head())
print(df.isnull().sum())
print(df.describe(include="all"))
print(df.duplicated().sum())
```

**Output:** A summary of shape, types, nulls, and duplicates. This determines
which subsequent steps are needed.

### 2. Normalize column names

Standardize column names early because every subsequent step references columns
by name. Inconsistent names cause KeyError bugs downstream.

```python
df.columns = (
    df.columns
    .str.strip()
    .str.lower()
    .str.replace(r"[^a-z0-9]+", "_", regex=True)
    .str.strip("_")
)
```

This converts `"First Name "`, `"first-name"`, `"First.Name"` all to
`"first_name"`.

### 3. Drop junk columns and rows

Remove columns that are entirely null or contain only a single constant value —
they carry no information. Remove rows that are entirely null.

```python
# Drop columns where every value is null
df = df.dropna(axis=1, how="all")

# Drop rows where every value is null
df = df.dropna(axis=0, how="all")

# Drop constant columns (optional — check with stakeholder first)
nunique = df.nunique()
constant_cols = nunique[nunique <= 1].index.tolist()
if constant_cols:
    print(f"Constant columns (consider dropping): {constant_cols}")
```

### 4. Deduplicate rows

Deduplicate after normalizing names but before type conversion, because type
coercion can mask duplicates (e.g., `"1"` vs `1`).

```python
n_before = len(df)
df = df.drop_duplicates()
n_dropped = n_before - len(df)
print(f"Dropped {n_dropped} duplicate rows")

# For subset-based deduplication (keep latest):
# df = df.drop_duplicates(subset=["id"], keep="last")
```

### 5. Handle missing values

Choose a strategy per column based on its semantics. See
[references/cleaning-patterns.md](references/cleaning-patterns.md) for the full
decision tree.

| Column type           | Default strategy                   | When to use something else            |
| --------------------- | ---------------------------------- | ------------------------------------- |
| Numeric (measurement) | `df[col].fillna(df[col].median())` | Use mean if distribution is symmetric |
| Numeric (ID/code)     | Leave as NaN or drop row           | Never impute IDs                      |
| Categorical           | `df[col].fillna("Unknown")`        | Use mode if missingness is low (<5%)  |
| Boolean               | `df[col].fillna(False)`            | Depends on business logic             |
| Datetime              | Leave as NaT or drop row           | Interpolate for time series           |
| Free text             | `df[col].fillna("")`               | —                                     |

```python
# Example: mixed strategy
df["age"] = df["age"].fillna(df["age"].median())
df["category"] = df["category"].fillna("Unknown")
df["is_active"] = df["is_active"].fillna(False)
```

**Always report** what you filled and how many values were affected:

```python
null_counts = df.isnull().sum()
print(null_counts[null_counts > 0])
```

### 6. Convert types

Convert after handling missing values because NaN in an integer column forces
float dtype, and filling NaN first allows clean integer conversion.

```python
# String to datetime
df["date"] = pd.to_datetime(df["date"], errors="coerce")

# Object to numeric
df["price"] = pd.to_numeric(df["price"], errors="coerce")

# Object to category (saves memory for low-cardinality columns)
df["status"] = df["status"].astype("category")

# Float to nullable integer (use Int64, not int64, to preserve NaN)
df["count"] = df["count"].astype("Int64")
```

**Always use `errors="coerce"`** for `to_datetime` and `to_numeric` — it
converts unparseable values to NaT/NaN instead of raising exceptions. Then check
how many values were coerced:

```python
coerced = df["price"].isna().sum() - original_null_count
print(f"Coerced {coerced} unparseable values to NaN")
```

### 7. Validate and save

Verify the cleaned data meets expectations, then save.

```python
# Final validation
assert df.duplicated().sum() == 0, "Duplicates remain"
assert df.isnull().sum().sum() == 0 or True, "Nulls remain (expected if intentional)"
print(f"Final shape: {df.shape}")
print(df.dtypes)

# Save
df.to_csv("cleaned_data.csv", index=False)
# or
df.to_parquet("cleaned_data.parquet", index=False)
```

## Checklist

- [ ] Loaded data and inspected shape, dtypes, nulls, duplicates
- [ ] Normalized column names to snake_case
- [ ] Dropped all-null columns and all-null rows
- [ ] Deduplicated rows (reported count dropped)
- [ ] Handled missing values with per-column strategy (reported fills)
- [ ] Converted column types (used `errors="coerce"`, checked coercion count)
- [ ] Validated final DataFrame (no unexpected nulls or duplicates)
- [ ] Saved cleaned output in same format as input (CSV or Parquet)

## Common mistakes

| Mistake                                                                                  | Fix                                                                                           |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Converting types before handling nulls — causes `int64` to silently become `float64`     | Always fill or drop NaN before converting to integer types, or use nullable `Int64`           |
| Using `inplace=True` — makes code harder to debug and chain                              | Always reassign: `df = df.dropna()` instead of `df.dropna(inplace=True)`                      |
| Deduplicating on all columns when a subset key exists                                    | Ask the user which columns define uniqueness; use `subset=` parameter                         |
| Filling numeric columns with 0 when median/mean is more appropriate                      | Zero-fill only when 0 has semantic meaning (e.g., "no sales"). Use median for measurements    |
| Using `df.drop_duplicates()` after type conversion — misses duplicates like `"1"` vs `1` | Deduplicate before type conversion, or normalize string representations first                 |
| Forgetting to report what changed — user can't verify correctness                        | Print before/after counts for every mutation (drops, fills, coercions)                        |
| Using `read_csv` defaults for everything — wrong dtypes, wrong parsing                   | Specify `dtype`, `parse_dates`, `na_values` parameters when you know the schema               |
| Overwriting the original file                                                            | Always save to a new filename (e.g., `cleaned_data.csv`) unless explicitly asked to overwrite |

## Quick reference

| Operation           | Code                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| Load CSV            | `pd.read_csv("f.csv")`                                                                                       |
| Load Parquet        | `pd.read_parquet("f.parquet")`                                                                               |
| Normalize columns   | `df.columns = df.columns.str.strip().str.lower().str.replace(r"[^a-z0-9]+", "_", regex=True).str.strip("_")` |
| Drop all-null cols  | `df.dropna(axis=1, how="all")`                                                                               |
| Deduplicate         | `df.drop_duplicates(subset=[...], keep="last")`                                                              |
| Fill NaN (numeric)  | `df[col].fillna(df[col].median())`                                                                           |
| Fill NaN (category) | `df[col].fillna("Unknown")`                                                                                  |
| To datetime         | `pd.to_datetime(df[col], errors="coerce")`                                                                   |
| To numeric          | `pd.to_numeric(df[col], errors="coerce")`                                                                    |
| To nullable int     | `df[col].astype("Int64")`                                                                                    |
| Save CSV            | `df.to_csv("out.csv", index=False)`                                                                          |
| Save Parquet        | `df.to_parquet("out.parquet", index=False)`                                                                  |

## Key principles

1. **Order matters** — Normalize names → drop junk → deduplicate → fill nulls →
   convert types. Each step depends on the previous one being complete.
2. **Report every mutation** — Print before/after counts for drops, fills, and
   coercions. The user must be able to verify that cleaning was correct without
   reading every row.
3. **Never destroy data silently** — Save to a new file, use `errors="coerce"`
   instead of raising, and always explain what was changed and why.
4. **Choose strategies per column, not globally** — Different columns have
   different semantics. A blanket `fillna(0)` or `dropna()` is almost always
   wrong.
5. **Inspect before and after** — Always run `df.info()` / `df.isnull().sum()` /
   `df.shape` at the start and end. Cleaning without inspection is guessing.
