# Type Conversion Guide

## Common Type Conversions in Pandas

### String to Numeric

```python
# Safe conversion (invalid values become NaN)
df["col"] = pd.to_numeric(df["col"], errors="coerce")

# Strip currency symbols first
df["price"] = df["price"].str.replace(r"[$,]", "", regex=True)
df["price"] = pd.to_numeric(df["price"], errors="coerce")

# Strip percentage signs
df["rate"] = df["rate"].str.replace("%", "")
df["rate"] = pd.to_numeric(df["rate"], errors="coerce") / 100

# Handle thousands separators
df["amount"] = df["amount"].str.replace(",", "")
df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
```

### String to DateTime

```python
# Auto-detect format
df["date"] = pd.to_datetime(df["date"], errors="coerce")

# Explicit format (faster for large datasets)
df["date"] = pd.to_datetime(df["date"], format="%Y-%m-%d", errors="coerce")

# Common formats
# ISO 8601:     format="%Y-%m-%dT%H:%M:%S"
# US date:      format="%m/%d/%Y"
# EU date:      format="%d/%m/%Y"
# With time:    format="%Y-%m-%d %H:%M:%S"
# Unix epoch:   pd.to_datetime(df["ts"], unit="s")

# Mixed formats (slower but handles inconsistency)
df["date"] = pd.to_datetime(df["date"], infer_datetime_format=True, errors="coerce")
```

### String to Boolean

```python
# Map common boolean strings
bool_map = {
    "true": True, "false": False,
    "True": True, "False": False,
    "TRUE": True, "FALSE": False,
    "yes": True, "no": False,
    "Yes": True, "No": False,
    "1": True, "0": False,
    "Y": True, "N": False,
    1: True, 0: False,
}
df["is_active"] = df["is_active"].map(bool_map)

# Use nullable boolean if NaN values exist
df["is_active"] = df["is_active"].astype("boolean")  # nullable
# vs
df["is_active"] = df["is_active"].astype("bool")      # non-nullable (NaN -> error)
```

### Object to Category

```python
# Simple conversion
df["status"] = df["status"].astype("category")

# With ordered categories
df["size"] = pd.Categorical(
    df["size"],
    categories=["S", "M", "L", "XL"],
    ordered=True
)

# Memory savings check
print(f"Before: {df['status'].memory_usage(deep=True) / 1024:.1f} KB")
df["status"] = df["status"].astype("category")
print(f"After:  {df['status'].memory_usage(deep=True) / 1024:.1f} KB")
```

## Nullable vs Non-Nullable Types

| Standard Type    | Nullable Type | When to Use Nullable           |
| ---------------- | ------------- | ------------------------------ |
| `int64`          | `Int64`       | Column has NaN values          |
| `float64`        | `Float64`     | Explicit nullable float needed |
| `bool`           | `boolean`     | Column has NaN values          |
| `str` / `object` | `string`      | Cleaner string operations      |

```python
# Int64 (nullable) vs int64 (non-nullable)
df["id"] = pd.to_numeric(df["id"], errors="coerce").astype("Int64")  # NaN-safe
df["id"] = pd.to_numeric(df["id"], errors="coerce").astype("int64")  # NaN -> error

# Check if nullable type is needed
if df["col"].isnull().any():
    df["col"] = df["col"].astype("Int64")   # nullable
else:
    df["col"] = df["col"].astype("int64")   # standard
```

## Type Inference Heuristics

When deciding what type an `object` column should be:

1. **Sample the column:** Look at 100 non-null values
2. **Try numeric first:** `pd.to_numeric(sample, errors="coerce")`
   - If > 80% convert successfully, it's numeric
   - If all numeric values are integers, use `Int64`
   - Otherwise use `float64`
3. **Try datetime:** `pd.to_datetime(sample, errors="coerce")`
   - If > 80% convert successfully, it's datetime
4. **Try boolean:** Check if values are in `{true, false, yes, no, 1, 0}`
   - If > 80% match, it's boolean
5. **Check cardinality:** `nunique() / len(df)`
   - If < 5% and < 50 unique values, use `category`
6. **Default:** Keep as `string` (not `object`)

## Common Pitfalls

### Mixed types in a column

```python
# BAD: Direct conversion fails on mixed types
df["id"].astype(int)  # ValueError if any non-numeric values

# GOOD: Coerce first, then convert
df["id"] = pd.to_numeric(df["id"], errors="coerce").astype("Int64")
```

### Losing precision with float

```python
# BAD: Integer IDs stored as float lose trailing zeros
df["zip_code"] = df["zip_code"].astype(float)  # "01234" -> 1234.0

# GOOD: Keep as string for codes/IDs
df["zip_code"] = df["zip_code"].astype("string")
```

### Timezone-naive vs timezone-aware

```python
# Convert to timezone-aware
df["timestamp"] = pd.to_datetime(df["timestamp"]).dt.tz_localize("UTC")

# Convert between timezones
df["local_time"] = df["timestamp"].dt.tz_convert("US/Eastern")
```

### Category dtype gotchas

```python
# Categories are fixed — new values become NaN
cat_col = pd.Categorical(["a", "b", "c"])
# Adding "d" later requires: cat_col = cat_col.add_categories(["d"])

# Merging DataFrames with different categories can fail
# Solution: convert to string before merge, then back to category
```
