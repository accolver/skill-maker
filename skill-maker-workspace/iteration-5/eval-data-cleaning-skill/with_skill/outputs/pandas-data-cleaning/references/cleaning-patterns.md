# Pandas Cleaning Patterns Reference

## Missing Value Strategies by Column Type

### Numeric Columns

```python
# Skewed distribution → median
df["col"].fillna(df["col"].median())

# Normal distribution → mean
df["col"].fillna(df["col"].mean())

# Time series → interpolate
df["col"].interpolate(method="linear")
```

### Categorical Columns

```python
# Known categories → mode
df["col"].fillna(df["col"].mode()[0])

# Unknown → constant
df["col"].fillna("Unknown")
```

### Date Columns

```python
# Forward fill (ordered data)
df["date"].ffill()

# Drop (no good imputation for dates)
df.dropna(subset=["date"])
```

## Common Sentinel Values

```python
SENTINELS = [
    "N/A", "n/a", "NA", "na", "null", "NULL", "None", "none",
    "NaN", "nan", "-", "--", "?", ".", "missing", "MISSING",
    "undefined", "#N/A", "#REF!", "#VALUE!",
    "not available", "Not Available", ""
]
```

## Type Conversion Patterns

```python
# Currency string → numeric
df["price"] = df["price"].str.replace(r'[$€£¥,]', '', regex=True)
df["price"] = pd.to_numeric(df["price"], errors="coerce")

# Mixed date formats
df["date"] = pd.to_datetime(df["date"], infer_datetime_format=True, errors="coerce")

# Boolean mapping
bool_map = {"yes": True, "no": False, "y": True, "n": False,
            "true": True, "false": False, "1": True, "0": False}
df["flag"] = df["flag"].str.lower().str.strip().map(bool_map)

# Low-cardinality string → category
if df["col"].nunique() < 20:
    df["col"] = df["col"].astype("category")
```

## Deduplication Patterns

```python
# Exact duplicates
df = df.drop_duplicates()

# Key-based (keep first)
df = df.drop_duplicates(subset=["id"], keep="first")

# Near-duplicates (normalize first)
df["email_norm"] = df["email"].str.lower().str.strip()
df = df.drop_duplicates(subset=["email_norm"], keep="first")
df = df.drop(columns=["email_norm"])
```
