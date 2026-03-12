# Type Conversion Reference

Detailed reference for pandas type conversions with error handling. Load this
when dealing with complex type coercion scenarios.

## Nullable vs Numpy Dtypes

| Numpy dtype | Nullable dtype | When to use nullable                    |
| ----------- | -------------- | --------------------------------------- |
| `int64`     | `Int64`        | Always — numpy int can't hold NaN       |
| `float64`   | `Float64`      | When you need explicit NaN tracking     |
| `bool`      | `boolean`      | When column has missing values          |
| `object`    | `string`       | Always — string dtype is more efficient |

**The Int64 problem explained:**

```python
# This SILENTLY corrupts your data:
s = pd.Series([1, 2, None, 4])
s.astype("int64")  # Raises or silently converts to float64

# This works correctly:
s = pd.Series([1, 2, None, 4], dtype="Int64")
# Result: [1, 2, <NA>, 4] — NaN preserved as NA, integers stay integers
```

When you have an ID column like `user_id` with values [1001, 1002, NaN, 1004]:

- numpy `int64`: Converts to [1001.0, 1002.0, NaN, 1004.0] — IDs are now floats
- nullable `Int64`: Keeps as [1001, 1002, <NA>, 1004] — IDs stay integers

## Numeric Conversion

### String to numeric

```python
# Safe conversion — unparseable values become NaN
df["amount"] = pd.to_numeric(df["amount"], errors="coerce")

# Check what was coerced
mask = pd.to_numeric(df["amount_original"], errors="coerce").isna() & df["amount_original"].notna()
bad_values = df.loc[mask, "amount_original"].unique()
print(f"Could not parse: {bad_values}")
```

### Common numeric gotchas

| Input value   | `pd.to_numeric` result | Fix                                  |
| ------------- | ---------------------- | ------------------------------------ |
| `"$1,234.56"` | NaN                    | Strip `$` and `,` first              |
| `"1 234"`     | NaN                    | Replace space separator              |
| `"12.34%"`    | NaN                    | Strip `%`, divide by 100             |
| `"(100)"`     | NaN                    | Accounting negative — replace parens |
| `"1,234.56"`  | NaN                    | Strip `,` first                      |
| `"1.234,56"`  | NaN                    | European format — swap `.` and `,`   |

```python
# Clean currency strings before conversion
df["amount"] = (
    df["amount"]
    .astype(str)
    .str.replace(r"[$,]", "", regex=True)
    .str.replace(r"\((.+)\)", r"-\1", regex=True)  # Accounting negatives
    .str.replace("%", "", regex=False)
)
df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
```

## Datetime Conversion

### Basic parsing

```python
# Let pandas infer the format (slower but handles mixed formats)
df["date"] = pd.to_datetime(df["date"], errors="coerce", infer_datetime_format=True)

# Specify format for speed and precision (10x faster on large datasets)
df["date"] = pd.to_datetime(df["date"], format="%Y-%m-%d", errors="coerce")
```

### Common date formats

| Format string        | Example              | Notes                  |
| -------------------- | -------------------- | ---------------------- |
| `%Y-%m-%d`           | 2024-03-15           | ISO 8601 — preferred   |
| `%m/%d/%Y`           | 03/15/2024           | US format              |
| `%d/%m/%Y`           | 15/03/2024           | European format        |
| `%Y-%m-%d %H:%M:%S`  | 2024-03-15 14:30:00  | With time              |
| `%Y-%m-%dT%H:%M:%SZ` | 2024-03-15T14:30:00Z | ISO 8601 with timezone |
| `%B %d, %Y`          | March 15, 2024       | Long month name        |
| `%d-%b-%Y`           | 15-Mar-2024          | Abbreviated month      |

### Mixed date formats

When a column has mixed formats (some US, some European), parse in stages:

```python
# Try ISO first, then US, then European
df["date"] = pd.to_datetime(df["date"], format="%Y-%m-%d", errors="coerce")

# Fill remaining NaTs with US format attempt
mask = df["date"].isna()
df.loc[mask, "date"] = pd.to_datetime(
    df.loc[mask, "date_original"], format="%m/%d/%Y", errors="coerce"
)
```

### Timezone handling

```python
# Parse with timezone
df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

# Convert timezone
df["timestamp_local"] = df["timestamp"].dt.tz_convert("US/Eastern")

# Remove timezone (for storage systems that don't support it)
df["timestamp_naive"] = df["timestamp"].dt.tz_localize(None)
```

## Boolean Conversion

Booleans in real data come in many forms:

```python
true_values = {"true", "1", "yes", "y", "t", "on", "active", "enabled"}
false_values = {"false", "0", "no", "n", "f", "off", "inactive", "disabled"}

def to_boolean(series: pd.Series) -> pd.Series:
    """Convert a column to nullable boolean, handling common representations."""
    s = series.astype(str).str.strip().str.lower()
    result = pd.array([pd.NA] * len(s), dtype="boolean")
    result[s.isin(true_values)] = True
    result[s.isin(false_values)] = False
    return pd.Series(result, index=series.index)

df["is_active"] = to_boolean(df["is_active"])
```

## Categorical Conversion

Use categorical dtype for columns with a small number of repeated values.
Benefits: 50-90% memory reduction, faster groupby/sort.

```python
# Simple conversion
df["status"] = df["status"].astype("category")

# With explicit category order (for ordinal data)
from pandas import CategoricalDtype
status_type = CategoricalDtype(
    categories=["pending", "active", "completed", "cancelled"],
    ordered=True,
)
df["status"] = df["status"].astype(status_type)

# Now comparisons work: df[df["status"] > "active"]
```

## Post-Conversion Validation

After converting types, always check for unexpected NaN introduction:

```python
def check_coercion_loss(
    df_before: pd.DataFrame,
    df_after: pd.DataFrame,
    columns: list[str],
) -> dict[str, int]:
    """Report how many non-null values became null after conversion."""
    losses = {}
    for col in columns:
        was_valid = df_before[col].notna().sum()
        is_valid = df_after[col].notna().sum()
        lost = was_valid - is_valid
        if lost > 0:
            losses[col] = lost
            pct = lost / was_valid * 100
            print(f"  WARNING: {col} lost {lost} values ({pct:.1f}%) during conversion")
    return losses
```
