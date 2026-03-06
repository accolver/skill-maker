# Cleaning Patterns Reference

Detailed patterns for each cleaning operation. Load on demand — the SKILL.md
overview covers the common cases.

## Missing Value Decision Tree

```
Column has nulls?
├── > 50% null → Drop the column (df.drop(columns=[col]))
├── Required field → Drop rows (df.dropna(subset=[col]))
├── Categorical → fillna("unknown") or fillna(mode)
├── Numeric
│   ├── Has outliers → fillna(median)
│   ├── Normal distribution → fillna(mean)
│   └── Time series → ffill() or interpolate()
├── Datetime → fillna(pd.NaT) and handle downstream
└── Boolean → fillna(False) if absence means false
```

## Fill Strategy by Column Type

| Column Type        | Strategy           | Code                                      |
| ------------------ | ------------------ | ----------------------------------------- |
| ID / primary key   | Drop row           | `df.dropna(subset=["id"])`                |
| Name / label       | Fill "unknown"     | `df["name"].fillna("unknown")`            |
| Numeric (skewed)   | Median             | `df["val"].fillna(df["val"].median())`    |
| Numeric (normal)   | Mean               | `df["val"].fillna(df["val"].mean())`      |
| Numeric (count)    | Zero               | `df["count"].fillna(0)`                   |
| Datetime           | NaT (handle later) | `df["date"].fillna(pd.NaT)`               |
| Boolean            | False              | `df["flag"].fillna(False)`                |
| Categorical        | Mode or "unknown"  | `df["cat"].fillna(df["cat"].mode()[0])`   |
| Time series        | Forward fill       | `df["temp"].ffill()`                      |
| Time series (gaps) | Interpolate        | `df["temp"].interpolate(method="linear")` |

## Type Conversion Patterns

### Datetime edge cases

```python
# Multiple formats in one column
df["date"] = pd.to_datetime(df["date"], format="mixed", dayfirst=False)

# Unix timestamps
df["created"] = pd.to_datetime(df["created"], unit="s")

# Timezone-aware
df["event_time"] = pd.to_datetime(df["event_time"], utc=True)
```

### Numeric edge cases

```python
# Currency strings ("$1,234.56")
df["price"] = df["price"].str.replace(r'[$,]', '', regex=True)
df["price"] = pd.to_numeric(df["price"], errors="coerce")

# Percentage strings ("45.2%")
df["rate"] = df["rate"].str.rstrip('%').astype(float) / 100

# Mixed numeric/text ("N/A", "TBD", "-")
df["value"] = pd.to_numeric(df["value"], errors="coerce")
```

### Categorical optimization

```python
# Convert low-cardinality strings to save memory
for col in df.select_dtypes(include="object"):
    if df[col].nunique() / len(df) < 0.05:  # < 5% unique values
        df[col] = df[col].astype("category")
```

## Deduplication Patterns

### Fuzzy deduplication (near-duplicates)

```python
# Normalize before dedup to catch near-matches
df["name_clean"] = df["name"].str.lower().str.strip()
df = df.drop_duplicates(subset=["name_clean", "email"])
df = df.drop(columns=["name_clean"])
```

### Time-window deduplication

```python
# Remove events from same user within 5 minutes
df = df.sort_values(["user_id", "timestamp"])
df["time_diff"] = df.groupby("user_id")["timestamp"].diff()
df = df[df["time_diff"].isna() | (df["time_diff"] > pd.Timedelta(minutes=5))]
df = df.drop(columns=["time_diff"])
```

### Aggregation-based deduplication

```python
# When duplicates have different values, aggregate
df = df.groupby("order_id").agg({
    "amount": "sum",
    "status": "last",
    "created_at": "first"
}).reset_index()
```

## Column Name Normalization Variants

```python
# Basic (covers 90% of cases)
import re
df.columns = [re.sub(r'[^a-z0-9]+', '_', c.strip().lower()).strip('_') for c in df.columns]

# Preserve camelCase boundaries
import re
def camel_to_snake(name):
    s1 = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1_\2', name)
    return re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

df.columns = [camel_to_snake(c) for c in df.columns]

# Handle numbered columns (col1, col2 → col_1, col_2)
df.columns = [re.sub(r'(\D)(\d)', r'\1_\2', c) for c in df.columns]
```

## Parquet-Specific Patterns

```python
# Read specific columns (faster for wide tables)
df = pd.read_parquet("data.parquet", columns=["id", "name", "value"])

# Read with filters (pushdown predicate — avoids loading unwanted rows)
df = pd.read_parquet("data.parquet", filters=[("year", ">=", 2023)])

# Save with compression
df.to_parquet("output.parquet", compression="snappy", index=False)

# Partitioned writes (for large datasets)
df.to_parquet("output/", partition_cols=["year", "month"], index=False)
```

## Validation Patterns

```python
def validate_cleaned(df: pd.DataFrame, config: dict) -> list[str]:
    """Return list of validation errors. Empty = clean."""
    errors = []

    if "required_columns" in config:
        for col in config["required_columns"]:
            nulls = df[col].isnull().sum()
            if nulls > 0:
                errors.append(f"{col} has {nulls} null values")

    if "no_duplicates_on" in config:
        dupes = df.duplicated(subset=config["no_duplicates_on"]).sum()
        if dupes > 0:
            errors.append(f"{dupes} duplicate rows on {config['no_duplicates_on']}")

    if "expected_dtypes" in config:
        for col, dtype in config["expected_dtypes"].items():
            if col in df.columns and not pd.api.types.is_dtype_equal(df[col].dtype, dtype):
                errors.append(f"{col} is {df[col].dtype}, expected {dtype}")

    return errors
```
