# Pandas Data Cleaning Patterns Reference

Detailed patterns for common cleaning scenarios. The SKILL.md covers the
standard workflow; this file covers edge cases and advanced patterns.

## Table of Contents

1. [Loading tricky CSVs](#loading-tricky-csvs)
2. [Advanced missing value handling](#advanced-missing-value-handling)
3. [Type conversion edge cases](#type-conversion-edge-cases)
4. [Fuzzy deduplication](#fuzzy-deduplication)
5. [String cleaning patterns](#string-cleaning-patterns)
6. [Memory optimization](#memory-optimization)
7. [Parquet-specific patterns](#parquet-specific-patterns)

---

## Loading tricky CSVs

### Non-standard delimiters

```python
# Tab-separated
df = pd.read_csv("data.tsv", sep="\t")

# Semicolon (common in European CSVs)
df = pd.read_csv("data.csv", sep=";")

# Auto-detect delimiter
import csv
with open("data.csv", "r") as f:
    dialect = csv.Sniffer().sniff(f.read(4096))
df = pd.read_csv("data.csv", sep=dialect.delimiter)
```

### Encoding issues

```python
# Try UTF-8 first, fall back to latin-1
try:
    df = pd.read_csv("data.csv", encoding="utf-8")
except UnicodeDecodeError:
    df = pd.read_csv("data.csv", encoding="latin-1")

# For files with BOM (byte order mark)
df = pd.read_csv("data.csv", encoding="utf-8-sig")
```

### Large files

```python
# Read in chunks to avoid memory issues
chunks = pd.read_csv("large.csv", chunksize=100_000)
df = pd.concat([clean_chunk(chunk) for chunk in chunks], ignore_index=True)

# Read only needed columns
df = pd.read_csv("large.csv", usecols=["id", "name", "email", "created_at"])

# Specify dtypes upfront to reduce memory
df = pd.read_csv("large.csv", dtype={
    "id": "int32",
    "name": "string",
    "status": "category",
})
```

### Multi-line fields and quoting

```python
# Handle fields with embedded newlines
df = pd.read_csv("data.csv", quoting=csv.QUOTE_ALL, escapechar="\\")

# Skip bad lines instead of crashing
df = pd.read_csv("data.csv", on_bad_lines="skip")
```

---

## Advanced missing value handling

### Conditional fill strategies

```python
# Fill based on group membership
df["salary"] = df.groupby("department")["salary"].transform(
    lambda x: x.fillna(x.median())
)

# Fill with interpolation for time series
df["temperature"] = df["temperature"].interpolate(method="time")

# Forward fill with a limit (don't propagate too far)
df["status"] = df["status"].ffill(limit=3)
```

### Detecting patterns in missing data

```python
# Check if missing values are correlated
import numpy as np
null_matrix = df.isnull().astype(int)
null_corr = null_matrix.corr()
# High correlation between columns means they tend to be missing together

# Visualize missing patterns (for reporting)
missing_pct = df.isnull().mean().sort_values(ascending=False)
print(missing_pct[missing_pct > 0])
```

### Custom sentinel detection

```python
def detect_sentinels(series: pd.Series, threshold: float = 0.01) -> list[str]:
    """Find values that look like sentinels in a string column."""
    if series.dtype != "object":
        return []
    value_counts = series.value_counts(normalize=True)
    known_sentinels = {"N/A", "n/a", "NA", "null", "NULL", "None", "-",
                       "--", "?", ".", "NaN", "nan", "#N/A", "missing", ""}
    found = []
    for val in value_counts.index:
        if val in known_sentinels:
            found.append(val)
        elif len(str(val)) <= 3 and not str(val).isalnum():
            found.append(val)  # Short non-alphanumeric values are suspicious
    return found
```

---

## Type conversion edge cases

### Mixed numeric formats

```python
# Handle currency symbols and thousands separators
df["price"] = (
    df["price"]
    .str.replace(r"[$,]", "", regex=True)
    .str.replace(r"[()]", "-", regex=True)  # accounting negative format
    .pipe(pd.to_numeric, errors="coerce")
)

# Handle percentage strings
df["rate"] = (
    df["rate"]
    .str.rstrip("%")
    .pipe(pd.to_numeric, errors="coerce")
    .div(100)
)
```

### Datetime with multiple formats

```python
# When a column has mixed date formats
def parse_mixed_dates(series: pd.Series) -> pd.Series:
    """Parse dates trying multiple formats."""
    formats = [
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%d-%m-%Y",
        "%Y-%m-%d %H:%M:%S",
        "%m/%d/%Y %I:%M %p",
    ]
    result = pd.Series(pd.NaT, index=series.index)
    for fmt in formats:
        mask = result.isna() & series.notna()
        result[mask] = pd.to_datetime(series[mask], format=fmt, errors="coerce")
    return result

df["date"] = parse_mixed_dates(df["date"])
```

### Nullable integer types

```python
# Standard int64 can't hold NaN — use nullable types
nullable_int_cols = ["quantity", "count", "age"]
for col in nullable_int_cols:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")

# Nullable boolean
df["is_active"] = df["is_active"].astype("boolean")
```

---

## Fuzzy deduplication

### Normalize before comparing

```python
def normalize_for_dedup(s: str) -> str:
    """Normalize a string for fuzzy matching."""
    if pd.isna(s):
        return ""
    return (
        str(s)
        .lower()
        .strip()
        .replace(".", "")
        .replace(",", "")
        .replace("-", " ")
        .replace("  ", " ")
    )

df["name_norm"] = df["name"].apply(normalize_for_dedup)
df["email_norm"] = df["email"].str.lower().str.strip()

# Deduplicate on normalized values
df = df.drop_duplicates(subset=["name_norm", "email_norm"], keep="last")
df = df.drop(columns=["name_norm", "email_norm"])
```

### Deduplication with priority

```python
# Keep the row with the most complete data
df["completeness"] = df.notna().sum(axis=1)
df = df.sort_values("completeness", ascending=False)
df = df.drop_duplicates(subset=["email"], keep="first")
df = df.drop(columns=["completeness"])
```

---

## String cleaning patterns

### Whitespace and encoding

```python
# Strip all string columns
str_cols = df.select_dtypes(include="object").columns
df[str_cols] = df[str_cols].apply(lambda x: x.str.strip())

# Fix encoding artifacts
df["name"] = (
    df["name"]
    .str.replace("\xa0", " ")       # non-breaking space
    .str.replace("\u200b", "")      # zero-width space
    .str.replace(r"\s+", " ", regex=True)  # collapse multiple spaces
)
```

### Email normalization

```python
df["email"] = (
    df["email"]
    .str.lower()
    .str.strip()
    .str.replace(r"\s+", "", regex=True)  # remove internal spaces
)
```

### Phone number normalization

```python
df["phone"] = (
    df["phone"]
    .str.replace(r"[^\d+]", "", regex=True)  # keep only digits and +
)
```

---

## Memory optimization

```python
def optimize_dtypes(df: pd.DataFrame) -> pd.DataFrame:
    """Downcast numeric types and convert low-cardinality strings to category."""
    for col in df.select_dtypes(include=["int64"]).columns:
        df[col] = pd.to_numeric(df[col], downcast="integer")

    for col in df.select_dtypes(include=["float64"]).columns:
        df[col] = pd.to_numeric(df[col], downcast="float")

    for col in df.select_dtypes(include=["object"]).columns:
        if df[col].nunique() / len(df) < 0.5:  # less than 50% unique
            df[col] = df[col].astype("category")

    return df

# Check memory savings
before = df.memory_usage(deep=True).sum()
df = optimize_dtypes(df)
after = df.memory_usage(deep=True).sum()
print(f"Memory: {before / 1e6:.1f}MB -> {after / 1e6:.1f}MB ({(1 - after/before) * 100:.0f}% reduction)")
```

---

## Parquet-specific patterns

### Reading Parquet

```python
# Read specific columns (much faster than CSV for wide tables)
df = pd.read_parquet("data.parquet", columns=["id", "name", "email"])

# Read with filters (pushdown predicate — only reads matching row groups)
df = pd.read_parquet("data.parquet", filters=[("status", "==", "active")])
```

### Writing Parquet

```python
# Standard write
df.to_parquet("output.parquet", index=False)

# With compression (default is snappy, gzip for smaller files)
df.to_parquet("output.parquet", index=False, compression="gzip")

# Partitioned output for large datasets
df.to_parquet("output/", index=False, partition_cols=["year", "month"])
```

### Why Parquet over CSV for intermediate files

| Feature                | CSV                          | Parquet                              |
| ---------------------- | ---------------------------- | ------------------------------------ |
| Type preservation      | No (everything is string)    | Yes (int, float, datetime, category) |
| Read speed (100M rows) | ~60s                         | ~5s                                  |
| File size (100M rows)  | ~2GB                         | ~400MB                               |
| Column selection       | Must read all                | Reads only requested columns         |
| Missing value handling | Ambiguous ("", "null", etc.) | Native null support                  |
