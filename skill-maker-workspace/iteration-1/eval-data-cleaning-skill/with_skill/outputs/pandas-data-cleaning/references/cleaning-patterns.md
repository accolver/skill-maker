# Pandas Data Cleaning Patterns Reference

Quick-lookup patterns for common data cleaning scenarios. Load this file when
you need specific syntax for an edge case.

## Missing Value Patterns

### Detect all forms of missing data

```python
import pandas as pd
import numpy as np

# Standard missing
missing_standard = df.isnull().sum()

# Sentinel values (common in real-world CSVs)
sentinels = ['', 'N/A', 'n/a', 'NA', 'null', 'NULL', 'None', '-', '--',
             '?', 'missing', 'MISSING', 'nan', 'NaN', '#N/A', '#NA']

# Count sentinels per column
for col in df.select_dtypes(include='object').columns:
    sentinel_count = df[col].isin(sentinels).sum()
    if sentinel_count > 0:
        print(f"  {col}: {sentinel_count} sentinel values")

# Replace all sentinels with pd.NA
df = df.replace(sentinels, pd.NA)
```

### Percentage-based missing value report

```python
def missing_report(df: pd.DataFrame) -> pd.DataFrame:
    """Generate a missing value report sorted by percentage."""
    missing = df.isnull().sum()
    percent = (missing / len(df)) * 100
    report = pd.DataFrame({
        'missing_count': missing,
        'missing_percent': percent.round(2),
        'dtype': df.dtypes
    })
    return report[report.missing_count > 0].sort_values(
        'missing_percent', ascending=False
    )
```

### Conditional fill strategies

```python
# Fill numeric columns with median, categorical with mode
for col in df.columns:
    if df[col].isnull().sum() == 0:
        continue
    if pd.api.types.is_numeric_dtype(df[col]):
        df[col] = df[col].fillna(df[col].median())
    else:
        df[col] = df[col].fillna(df[col].mode().iloc[0] if not df[col].mode().empty else 'Unknown')
```

## Deduplication Patterns

### Fuzzy deduplication on string columns

```python
# Normalize strings before dedup to catch near-duplicates
df['name_normalized'] = (
    df['name']
    .str.strip()
    .str.lower()
    .str.replace(r'\s+', ' ', regex=True)
)
df = df.drop_duplicates(subset=['name_normalized', 'date'], keep='first')
df = df.drop(columns=['name_normalized']).reset_index(drop=True)
```

### Keep the most complete row among duplicates

```python
# Sort by completeness (fewer NaNs first), then dedup
df['_null_count'] = df.isnull().sum(axis=1)
df = df.sort_values('_null_count').drop_duplicates(
    subset=['id'], keep='first'
).drop(columns=['_null_count']).reset_index(drop=True)
```

## Column Name Normalization

### Full normalization function

```python
import re

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalize column names:
    - Strip whitespace
    - Convert to lowercase
    - Replace non-alphanumeric chars with underscores
    - Collapse consecutive underscores
    - Strip leading/trailing underscores
    - Handle duplicates by appending _1, _2, etc.
    """
    df = df.copy()
    cols = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(r'[^a-z0-9]+', '_', regex=True)
        .str.strip('_')
    )

    # Handle duplicate column names
    seen = {}
    new_cols = []
    for col in cols:
        if col in seen:
            seen[col] += 1
            new_cols.append(f"{col}_{seen[col]}")
        else:
            seen[col] = 0
            new_cols.append(col)

    df.columns = new_cols
    return df
```

## Type Conversion Patterns

### Safe numeric conversion with reporting

```python
def safe_to_numeric(df: pd.DataFrame, col: str) -> pd.DataFrame:
    """Convert column to numeric, reporting coerced values."""
    original_non_null = df[col].notna().sum()
    df[col] = pd.to_numeric(df[col], errors='coerce')
    new_non_null = df[col].notna().sum()
    coerced = original_non_null - new_non_null
    if coerced > 0:
        print(f"  Warning: {coerced} values in '{col}' could not be converted to numeric")
    return df
```

### Date parsing with multiple format attempts

```python
def parse_dates(series: pd.Series, formats: list[str] | None = None) -> pd.Series:
    """Try multiple date formats, falling back gracefully."""
    if formats is None:
        formats = ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d %H:%M:%S',
                   '%m/%d/%Y %H:%M', '%d-%b-%Y', '%B %d, %Y']

    result = pd.Series(pd.NaT, index=series.index)
    remaining = series.notna()

    for fmt in formats:
        if not remaining.any():
            break
        parsed = pd.to_datetime(series[remaining], format=fmt, errors='coerce')
        mask = parsed.notna()
        result[remaining & mask.reindex(result.index, fill_value=False)] = parsed[mask]
        remaining = remaining & result.isna() & series.notna()

    unparsed = remaining.sum()
    if unparsed > 0:
        print(f"  Warning: {unparsed} date values could not be parsed")
    return result
```

## File I/O Patterns

### Read CSV with common options

```python
df = pd.read_csv(
    path,
    dtype_backend='numpy_nullable',  # Better NA handling
    na_values=['', 'N/A', 'null', 'NULL', 'None', 'NA'],
    keep_default_na=True,
    encoding='utf-8',  # Try 'latin-1' if utf-8 fails
    low_memory=False,   # Prevents mixed type inference
)
```

### Read Parquet

```python
df = pd.read_parquet(path, engine='pyarrow')
```

### Save with type preservation

```python
# Parquet preserves types natively
df.to_parquet('output.parquet', index=False, engine='pyarrow')

# CSV with explicit type hints in a sidecar
import json
type_map = {col: str(dtype) for col, dtype in df.dtypes.items()}
with open('output_types.json', 'w') as f:
    json.dump(type_map, f, indent=2)
df.to_csv('output.csv', index=False)
```
