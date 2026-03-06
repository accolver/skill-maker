---
name: pandas-data-cleaning
description: Reusable patterns for cleaning tabular data with pandas — handling missing values, deduplication, column normalization, type conversion, and file I/O for CSV and Parquet formats.
---

# Pandas Data Cleaning Skill

Use this skill whenever a task involves cleaning, normalizing, or preparing
tabular data using Python and pandas. It covers the most common data-cleaning
operations and produces consistent, production-quality code.

## When to Use

- Loading and inspecting CSV or Parquet files
- Handling missing / null values
- Removing duplicate rows
- Normalizing column names
- Converting column data types
- General pre-processing before analysis or ML pipelines

## Standard Imports

Always start cleaning scripts with these imports:

```python
import pandas as pd
import numpy as np
from pathlib import Path
```

---

## 1. Loading Data

### CSV

```python
df = pd.read_csv(
    path,
    dtype_backend="numpy_nullable",  # use nullable dtypes by default
    na_values=["", "NA", "N/A", "n/a", "null", "NULL", "None", "none", "-"],
)
```

### Parquet

```python
df = pd.read_parquet(path)
```

### Post-load inspection

Always run an initial inspection after loading:

```python
print(f"Shape: {df.shape}")
print(f"Dtypes:\n{df.dtypes}")
print(f"Null counts:\n{df.isnull().sum()}")
print(f"Duplicates: {df.duplicated().sum()}")
df.head()
```

---

## 2. Normalizing Column Names

Normalize column names to `snake_case` immediately after loading. This prevents
downstream key errors caused by inconsistent casing, whitespace, or special
characters.

```python
def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names to clean snake_case."""
    import re
    def _clean(col: str) -> str:
        col = str(col).strip()
        col = re.sub(r"[^\w\s]", "", col)       # remove special chars
        col = re.sub(r"\s+", "_", col)           # spaces to underscores
        col = re.sub(r"_+", "_", col)            # collapse multiple underscores
        return col.lower().strip("_")
    df.columns = [_clean(c) for c in df.columns]
    return df
```

### Rules

- Always apply column normalization before any other transformation.
- If the original column names are needed later, store a mapping first:
  ```python
  original_names = dict(zip(normalize_columns(df.copy()).columns, df.columns))
  ```

---

## 3. Handling Missing Values

Choose a strategy based on the column's role and data type. Apply strategies
**per-column**, not globally.

### Strategy Selection Guide

| Scenario                      | Strategy                           | Code                               |
| ----------------------------- | ---------------------------------- | ---------------------------------- |
| Numeric column, < 5% missing  | Fill with median                   | `df[col].fillna(df[col].median())` |
| Numeric column, >= 5% missing | Keep as nullable or drop rows      | `df.dropna(subset=[col])`          |
| Categorical / string column   | Fill with `"unknown"` or mode      | `df[col].fillna("unknown")`        |
| Boolean column                | Fill with `False` or keep nullable | `df[col].fillna(False)`            |
| Date/time column              | Leave as `NaT` or forward-fill     | `df[col].ffill()`                  |
| Column is > 50% null          | Consider dropping the column       | `df.drop(columns=[col])`           |
| Row is mostly null            | Drop the row                       | `df.dropna(thresh=min_non_null)`   |

### Reusable helper

```python
def handle_missing(
    df: pd.DataFrame,
    numeric_strategy: str = "median",   # "median", "mean", "zero", "drop"
    categorical_fill: str = "unknown",
    drop_thresh: float = 0.5,           # drop columns with > this fraction null
) -> pd.DataFrame:
    """Handle missing values with per-dtype strategies."""
    # Drop columns that are mostly null
    null_frac = df.isnull().mean()
    drop_cols = null_frac[null_frac > drop_thresh].index.tolist()
    if drop_cols:
        print(f"Dropping columns (>{drop_thresh:.0%} null): {drop_cols}")
        df = df.drop(columns=drop_cols)

    for col in df.columns:
        if df[col].isnull().sum() == 0:
            continue

        if pd.api.types.is_numeric_dtype(df[col]):
            if numeric_strategy == "median":
                df[col] = df[col].fillna(df[col].median())
            elif numeric_strategy == "mean":
                df[col] = df[col].fillna(df[col].mean())
            elif numeric_strategy == "zero":
                df[col] = df[col].fillna(0)
            elif numeric_strategy == "drop":
                df = df.dropna(subset=[col])
        elif pd.api.types.is_string_dtype(df[col]) or df[col].dtype == "object":
            df[col] = df[col].fillna(categorical_fill)
        elif pd.api.types.is_bool_dtype(df[col]):
            df[col] = df[col].fillna(False)

    return df
```

### Rules

- **Never** use a single global `df.fillna(0)` — it silently corrupts string and
  boolean columns.
- Always log which columns had nulls and what strategy was applied.
- After filling, assert no unexpected nulls remain:
  ```python
  remaining = df.isnull().sum()
  remaining = remaining[remaining > 0]
  if not remaining.empty:
      print(f"Warning — remaining nulls:\n{remaining}")
  ```

---

## 4. Deduplicating Rows

### Full-row duplicates

```python
before = len(df)
df = df.drop_duplicates()
print(f"Removed {before - len(df)} exact duplicate rows")
```

### Key-based deduplication

When rows should be unique by a subset of columns (e.g., a natural key):

```python
def deduplicate(
    df: pd.DataFrame,
    subset: list[str] | None = None,
    keep: str = "last",        # "first", "last", or False (drop all)
    sort_by: str | None = None,
    ascending: bool = False,
) -> pd.DataFrame:
    """Deduplicate rows, optionally keeping the most recent by a sort column."""
    before = len(df)
    if sort_by and sort_by in df.columns:
        df = df.sort_values(sort_by, ascending=ascending)
    df = df.drop_duplicates(subset=subset, keep=keep)
    print(f"Deduplication: {before} -> {len(df)} rows (removed {before - len(df)})")
    return df.reset_index(drop=True)
```

### Rules

- Always report how many rows were removed.
- If the dataset has a natural key, prefer key-based dedup over full-row dedup.
- When keeping one row from a group of duplicates, sort first so the "best" row
  is kept (e.g., most recent timestamp).

---

## 5. Converting Data Types

### Common conversions

```python
def convert_types(df: pd.DataFrame, type_map: dict[str, str]) -> pd.DataFrame:
    """
    Convert columns to specified types.

    type_map example:
        {"price": "float", "quantity": "int", "date": "datetime", "active": "bool"}
    """
    for col, target in type_map.items():
        if col not in df.columns:
            print(f"Warning: column '{col}' not found, skipping")
            continue
        try:
            if target == "datetime":
                df[col] = pd.to_datetime(df[col], errors="coerce")
            elif target == "float":
                df[col] = pd.to_numeric(df[col], errors="coerce").astype("Float64")
            elif target == "int":
                df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")
            elif target == "bool":
                truthy = {"true", "1", "yes", "y", "t"}
                df[col] = df[col].astype(str).str.strip().str.lower().isin(truthy)
            elif target == "category":
                df[col] = df[col].astype("category")
            elif target == "string":
                df[col] = df[col].astype("string")
            else:
                df[col] = df[col].astype(target)
            print(f"  Converted '{col}' -> {target}")
        except Exception as e:
            print(f"  Failed to convert '{col}' to {target}: {e}")
    return df
```

### Rules

- Use **nullable dtypes** (`Int64`, `Float64`, `string`, `boolean`) instead of
  numpy primitives so that nulls are preserved without silent coercion.
- Always use `errors="coerce"` for numeric and datetime conversions — never let
  a bad value crash the pipeline.
- Log every conversion and every failure.

---

## 6. Saving Cleaned Data

### CSV

```python
df.to_csv(output_path, index=False)
```

### Parquet (preferred for intermediate/analytical data)

```python
df.to_parquet(output_path, index=False, engine="pyarrow")
```

### Rules

- Default to **Parquet** for intermediate outputs — it preserves dtypes and is
  much faster to read/write.
- Use CSV only when the consumer requires it (e.g., Excel users, external APIs).
- Always set `index=False` unless the index carries meaningful data.

---

## 7. Full Cleaning Pipeline Template

When asked to clean a dataset end-to-end, follow this order:

```python
def clean_dataset(
    input_path: str | Path,
    output_path: str | Path | None = None,
    type_map: dict[str, str] | None = None,
    dedup_keys: list[str] | None = None,
) -> pd.DataFrame:
    """Full cleaning pipeline."""
    path = Path(input_path)

    # 1. Load
    if path.suffix == ".parquet":
        df = pd.read_parquet(path)
    else:
        df = pd.read_csv(path, na_values=["", "NA", "N/A", "n/a", "null", "NULL", "None", "-"])
    print(f"Loaded {path.name}: {df.shape[0]} rows x {df.shape[1]} cols")

    # 2. Normalize columns
    df = normalize_columns(df)

    # 3. Deduplicate
    df = deduplicate(df, subset=dedup_keys)

    # 4. Handle missing values
    df = handle_missing(df)

    # 5. Convert types
    if type_map:
        df = convert_types(df, type_map)

    # 6. Final report
    print(f"\nCleaned dataset: {df.shape[0]} rows x {df.shape[1]} cols")
    print(f"Remaining nulls:\n{df.isnull().sum()[df.isnull().sum() > 0]}")

    # 7. Save
    if output_path:
        out = Path(output_path)
        if out.suffix == ".parquet":
            df.to_parquet(out, index=False, engine="pyarrow")
        else:
            df.to_csv(out, index=False)
        print(f"Saved to {out}")

    return df
```

### Pipeline order matters

1. **Load** — get raw data in
2. **Normalize columns** — so all subsequent code uses consistent names
3. **Deduplicate** — remove junk rows before filling nulls (avoids filling then
   deduping)
4. **Handle missing** — fill or drop nulls
5. **Convert types** — cast to final types after nulls are handled
6. **Save** — write the clean result

---

## 8. Common Pitfalls to Avoid

| Pitfall                                              | Why it's bad                        | Do this instead                    |
| ---------------------------------------------------- | ----------------------------------- | ---------------------------------- |
| `df.fillna(0)` globally                              | Corrupts strings and bools          | Fill per-dtype (see section 3)     |
| `df.drop_duplicates()` without logging               | Silent data loss                    | Always print before/after counts   |
| `astype(int)` with nulls                             | Crashes or silently drops nulls     | Use `Int64` nullable dtype         |
| Cleaning before normalizing columns                  | Column name mismatches              | Normalize columns first            |
| Saving cleaned data as CSV when Parquet is available | Loses dtype info, slower            | Default to Parquet                 |
| Chained indexing (`df[col][mask] = val`)             | SettingWithCopyWarning, silent bugs | Use `df.loc[mask, col] = val`      |
| Ignoring `errors="coerce"`                           | One bad value crashes the pipeline  | Always coerce for numeric/datetime |

---

## 9. String Cleaning Extras

When string columns need additional cleaning beyond null handling:

```python
def clean_string_columns(df: pd.DataFrame, columns: list[str] | None = None) -> pd.DataFrame:
    """Strip whitespace and normalize string columns."""
    cols = columns or df.select_dtypes(include=["object", "string"]).columns.tolist()
    for col in cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().str.replace(r"\s+", " ", regex=True)
    return df
```

Use this when data comes from user input, web scraping, or systems with
inconsistent formatting.
