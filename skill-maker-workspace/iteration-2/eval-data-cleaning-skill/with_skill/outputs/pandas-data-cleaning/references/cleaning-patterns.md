# Cleaning Patterns Reference

Detailed patterns for pandas data cleaning operations. Loaded on demand from
SKILL.md.

## Missing Value Decision Tree

```
Is the column an ID or primary key?
├── Yes → Drop the row (never impute IDs)
└── No → What is the column type?
    ├── Numeric (measurement)
    │   ├── Distribution symmetric? → fillna(mean)
    │   ├── Distribution skewed? → fillna(median)
    │   └── Missingness > 50%? → Consider dropping the column
    ├── Categorical
    │   ├── Missingness < 5%? → fillna(mode)
    │   └── Missingness >= 5%? → fillna("Unknown")
    ├── Boolean
    │   └── fillna(False) or fillna(True) based on business logic
    ├── Datetime
    │   ├── Time series? → interpolate or forward-fill
    │   └── Not time series? → Leave as NaT or drop row
    └── Free text
        └── fillna("")
```

## Column Name Normalization Patterns

### Standard normalization (recommended)

```python
df.columns = (
    df.columns
    .str.strip()
    .str.lower()
    .str.replace(r"[^a-z0-9]+", "_", regex=True)
    .str.strip("_")
)
```

### Handling name collisions

After normalization, check for duplicate column names:

```python
dupes = df.columns[df.columns.duplicated()].tolist()
if dupes:
    print(f"WARNING: Duplicate column names after normalization: {dupes}")
    # Option 1: Suffix with position
    cols = pd.Series(df.columns)
    for dup in cols[cols.duplicated()].unique():
        idxs = cols[cols == dup].index.tolist()
        for i, idx in enumerate(idxs[1:], start=1):
            cols[idx] = f"{dup}_{i}"
    df.columns = cols
```

### Preserving a column name mapping

```python
name_map = dict(zip(df.columns, normalized_columns))
# Save for reference
pd.Series(name_map).to_csv("column_name_mapping.csv")
```

## Type Conversion Patterns

### Safe numeric conversion

```python
def safe_to_numeric(series, name=""):
    """Convert to numeric, reporting coercion count."""
    original_nulls = series.isna().sum()
    result = pd.to_numeric(series, errors="coerce")
    coerced = result.isna().sum() - original_nulls
    if coerced > 0:
        print(f"  {name}: {coerced} values coerced to NaN")
    return result
```

### Safe datetime conversion

```python
def safe_to_datetime(series, name="", fmt=None):
    """Convert to datetime, reporting coercion count."""
    original_nulls = series.isna().sum()
    result = pd.to_datetime(series, format=fmt, errors="coerce")
    coerced = result.isna().sum() - original_nulls
    if coerced > 0:
        print(f"  {name}: {coerced} values coerced to NaT")
    return result
```

### Boolean conversion from string

```python
bool_map = {
    "true": True, "yes": True, "1": True, "y": True, "t": True,
    "false": False, "no": False, "0": False, "n": False, "f": False,
}
df["is_active"] = df["is_active"].str.strip().str.lower().map(bool_map)
```

### Currency string to numeric

```python
df["price"] = (
    df["price"]
    .str.replace(r"[$,]", "", regex=True)
    .pipe(pd.to_numeric, errors="coerce")
)
```

## Deduplication Patterns

### Exact deduplication

```python
n_before = len(df)
df = df.drop_duplicates()
print(f"Dropped {n_before - len(df)} exact duplicate rows")
```

### Key-based deduplication

```python
# Keep the last occurrence (most recent)
df = df.drop_duplicates(subset=["user_id", "email"], keep="last")

# Keep the first occurrence
df = df.drop_duplicates(subset=["user_id"], keep="first")
```

### Fuzzy deduplication (advanced)

For near-duplicates (typos, whitespace differences), normalize first:

```python
# Normalize before deduplicating
df["name_normalized"] = df["name"].str.strip().str.lower()
df = df.drop_duplicates(subset=["name_normalized", "email"])
df = df.drop(columns=["name_normalized"])
```

## Parquet-Specific Patterns

### Reading with specific columns (memory optimization)

```python
df = pd.read_parquet("data.parquet", columns=["id", "name", "value"])
```

### Handling Parquet type preservation

Parquet preserves types better than CSV. After cleaning, prefer saving as
Parquet to avoid re-parsing types on next load:

```python
# Parquet preserves: datetime, categorical, nullable int, etc.
df.to_parquet("cleaned.parquet", index=False, engine="pyarrow")
```

### Reading partitioned Parquet

```python
df = pd.read_parquet("data/", engine="pyarrow")  # reads all partitions
```

## CSV-Specific Patterns

### Handling encoding issues

```python
# Try UTF-8 first, fall back to latin-1
try:
    df = pd.read_csv("data.csv", encoding="utf-8")
except UnicodeDecodeError:
    df = pd.read_csv("data.csv", encoding="latin-1")
```

### Handling custom delimiters

```python
df = pd.read_csv("data.csv", sep=";")  # semicolon-delimited
df = pd.read_csv("data.tsv", sep="\t")  # tab-delimited
```

### Handling messy CSV headers

```python
# Skip metadata rows at top of file
df = pd.read_csv("data.csv", skiprows=3)

# Custom NA values
df = pd.read_csv("data.csv", na_values=["N/A", "n/a", "-", "", "NULL", "null"])
```

## Validation Patterns

### Post-cleaning validation

```python
def validate_cleaned(df, expected_cols=None):
    """Run standard validation checks on cleaned DataFrame."""
    issues = []

    # Check for remaining duplicates
    n_dupes = df.duplicated().sum()
    if n_dupes > 0:
        issues.append(f"{n_dupes} duplicate rows remain")

    # Check for unexpected nulls
    null_cols = df.columns[df.isnull().any()].tolist()
    if null_cols:
        issues.append(f"Nulls remain in: {null_cols}")

    # Check expected columns exist
    if expected_cols:
        missing = set(expected_cols) - set(df.columns)
        if missing:
            issues.append(f"Missing expected columns: {missing}")

    if issues:
        print("VALIDATION WARNINGS:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("Validation passed: no duplicates, no nulls, all columns present")

    return len(issues) == 0
```
