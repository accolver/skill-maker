# Missing Value Strategy Decision Guide

Detailed reference for choosing the right missing value strategy based on column
characteristics. Load this when the profiling step reveals complex missing value
patterns.

## Decision Tree

```
Is the column an identifier (ID, email, phone)?
├── YES → Drop rows with missing values (can't impute identifiers)
└── NO → Continue

Is >50% of the column missing?
├── YES → Consider dropping the entire column
│         (or flag for domain expert review)
└── NO → Continue

Is the column numeric?
├── YES → Is it time-series ordered?
│         ├── YES → Use interpolate() or ffill()
│         └── NO → Is the distribution skewed?
│                   ├── YES → Use median (robust to outliers)
│                   └── NO → Use median (safe default) or mean
└── NO → Is it categorical?
          ├── YES → Few categories (<10)?
          │         ├── YES → Use mode (most frequent value)
          │         └── NO → Use fill_value with "unknown"/"other"
          └── NO → Is it free text?
                    └── Use fill_value with "" or drop
```

## Strategy Details

### fill_median

**When:** Numeric columns with <20% missing, any distribution shape.

**Why median over mean:** The median is robust to outliers. If a revenue column
has values [10, 12, 15, 11, 10000], the mean is 2009.4 but the median is 12.
Filling with the mean introduces values that don't represent typical data.

```python
df["revenue"] = df["revenue"].fillna(df["revenue"].median())
```

### fill_mean

**When:** Numeric columns with symmetric distributions and no outliers. Rarely
the best choice — median is almost always safer.

```python
df["temperature"] = df["temperature"].fillna(df["temperature"].mean())
```

### fill_mode

**When:** Categorical columns with a clear dominant category.

**Caution:** If the mode represents 90% of values, filling with mode is fine. If
the mode represents 30% of values, you're making a weaker assumption.

```python
mode_val = df["status"].mode()
if len(mode_val) > 0:
    df["status"] = df["status"].fillna(mode_val.iloc[0])
```

### fill_value

**When:** You have a domain-specific default value.

Common defaults:

- Categorical: `"unknown"`, `"other"`, `"not_specified"`
- Numeric: `0` (only when 0 is meaningful, e.g., count of events)
- Boolean: `False` (only when absence implies false)

```python
df["category"] = df["category"].fillna("unknown")
df["event_count"] = df["event_count"].fillna(0)
```

### drop

**When:** The column is required and imputation would be misleading.

Identifier columns (email, user_id, phone) should never be imputed. A made-up
email is worse than a missing row.

```python
df = df.dropna(subset=["email", "user_id"])
```

### ffill (Forward Fill)

**When:** Time-series data where the last known value is the best estimate.

Common for: sensor readings, stock prices, status fields that persist until
changed.

```python
df["sensor_reading"] = df["sensor_reading"].ffill()
```

**Caution:** ffill at the start of a series leaves NaN (no previous value).
Consider combining with bfill or a fill_value fallback.

### interpolate

**When:** Time-series numeric data where values change gradually.

```python
df["temperature"] = df["temperature"].interpolate(method="linear")
```

Methods:

- `linear`: Straight line between known points (default, usually sufficient)
- `time`: Accounts for irregular time intervals (requires datetime index)
- `polynomial`: For curved trends (specify `order=`)

## Grouped Imputation

When data has natural groups, impute within groups for better accuracy:

```python
# Fill missing revenue with median revenue for that product category
df["revenue"] = df.groupby("category")["revenue"].transform(
    lambda x: x.fillna(x.median())
)

# Fallback: if an entire group is NaN, fill with global median
df["revenue"] = df["revenue"].fillna(df["revenue"].median())
```

## Sentinel Value Detection

Common sentinel values that should be treated as NaN but aren't by default:

| Value               | Common in                     |
| ------------------- | ----------------------------- |
| `""` (empty string) | CSV exports                   |
| `"N/A"`, `"n/a"`    | Manual data entry             |
| `"NULL"`, `"null"`  | Database exports              |
| `"None"`            | Python string repr            |
| `"-"`, `"--"`       | Report formatting             |
| `"?"`               | Survey data                   |
| `0`                 | Sometimes (context-dependent) |
| `9999`, `99999`     | Legacy systems                |
| `"1900-01-01"`      | Default date in old systems   |
| `"1970-01-01"`      | Unix epoch default            |

Specify these at read time:

```python
df = pd.read_csv(
    "data.csv",
    na_values=["", "N/A", "n/a", "NULL", "null", "None", "-", "--", "?"],
    keep_default_na=True,  # Also keep pandas defaults (NA, NaN, etc.)
)
```

## Documenting Your Strategy

Always document which strategy was applied to which column and why:

```python
cleaning_log = {
    "revenue": {"method": "fill_median", "reason": "Numeric, 8% missing, right-skewed"},
    "category": {"method": "fill_value", "value": "unknown", "reason": "Categorical, 3% missing"},
    "email": {"method": "drop", "reason": "Identifier, cannot impute"},
    "temperature": {"method": "interpolate", "reason": "Time series, gradual changes"},
}
```

This log should be printed or saved alongside the cleaned data for
reproducibility.
