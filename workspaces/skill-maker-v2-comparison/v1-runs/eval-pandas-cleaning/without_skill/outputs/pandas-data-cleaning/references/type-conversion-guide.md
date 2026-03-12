# Type Conversion Guide

## Pandas Type Reference

### Recommended types for clean data

| Data Kind         | Pandas Type      | Why                                      |
| ----------------- | ---------------- | ---------------------------------------- |
| Integer (no NaN)  | `int64`          | Standard integer                         |
| Integer (has NaN) | `Int64`          | Nullable integer — capital I             |
| Float             | `float64`        | Standard float                           |
| String            | `string`         | Pandas StringDtype, better than `object` |
| Boolean (no NaN)  | `bool`           | Standard boolean                         |
| Boolean (has NaN) | `boolean`        | Nullable boolean                         |
| DateTime          | `datetime64[ns]` | Nanosecond precision datetime            |
| Category          | `category`       | Low-cardinality strings, saves memory    |
| Timedelta         | `timedelta64`    | Duration between datetimes               |

### Common conversion patterns

#### Integers with NaN gaps

```python
# WRONG — raises IntCastingNaNError
df["id"] = df["id"].astype(int)

# RIGHT — nullable integer
df["id"] = pd.to_numeric(df["id"], errors="coerce").astype("Int64")
```

#### Currency strings to float

```python
# Input: "$1,234.56", "($500.00)", "€1.234,56"

# US format
df["amount"] = (
    df["amount"]
    .str.replace(r'[$,]', '', regex=True)
    .str.replace(r'\((.+)\)', r'-\1', regex=True)  # parenthetical negatives
    .pipe(pd.to_numeric, errors="coerce")
)

# European format (dot as thousands, comma as decimal)
df["amount_eur"] = (
    df["amount_eur"]
    .str.replace(r'[€.]', '', regex=True)
    .str.replace(',', '.', regex=False)
    .pipe(pd.to_numeric, errors="coerce")
)
```

#### Percentage strings to float

```python
# Input: "45.2%", "100%", "3.5 %"
df["rate"] = (
    df["rate"]
    .str.replace('%', '', regex=False)
    .str.strip()
    .pipe(pd.to_numeric, errors="coerce")
    / 100
)
```

#### Mixed date formats

```python
# pd.to_datetime handles most formats automatically
df["date"] = pd.to_datetime(df["date"], errors="coerce")

# If you know the format, specify it (faster)
df["date"] = pd.to_datetime(df["date"], format="%Y-%m-%d", errors="coerce")

# Multiple known formats — parse in sequence
def parse_dates(series):
    formats = ["%Y-%m-%d", "%m/%d/%Y", "%d-%b-%Y", "%B %d, %Y"]
    result = pd.Series(pd.NaT, index=series.index)
    for fmt in formats:
        mask = result.isna() & series.notna()
        result[mask] = pd.to_datetime(
            series[mask], format=fmt, errors="coerce"
        )
    return result
```

#### Boolean strings

```python
# WRONG — any non-empty string becomes True
df["flag"] = df["flag"].astype(bool)  # "no" -> True!

# RIGHT — explicit mapping
BOOL_MAP = {
    "true": True, "false": False,
    "yes": True, "no": False,
    "y": True, "n": False,
    "t": True, "f": False,
    "1": True, "0": False,
}
df["flag"] = df["flag"].str.lower().str.strip().map(BOOL_MAP)
```

#### String to category (low cardinality)

```python
# Good for columns with < 50 unique values
# Saves memory and enables faster groupby
df["status"] = df["status"].astype("category")

# With explicit ordering
from pandas import CategoricalDtype
status_type = CategoricalDtype(
    categories=["low", "medium", "high", "critical"],
    ordered=True
)
df["priority"] = df["priority"].str.lower().astype(status_type)
```

## Type Verification

After conversion, always verify:

```python
# Check dtypes
print(df.dtypes)

# Check for conversion failures (NaT for dates, NaN for numerics)
for col in df.columns:
    n_null = df[col].isna().sum()
    if n_null > 0:
        print(f"{col}: {n_null} null values after conversion")
```

## Parquet Type Preservation

Parquet preserves pandas types including:

- Nullable integers (`Int64`)
- Datetime with timezone
- Categorical with ordering
- String vs object distinction

CSV does NOT preserve:

- Nullable integers (become float64 on re-read)
- Datetime (become strings on re-read)
- Categorical (become object on re-read)
- Boolean (become object if mixed with NaN)

**Rule:** Use Parquet for intermediate storage between cleaning steps. Use CSV
only for final export when sharing with non-Python tools.
