# Missing Value Strategies Reference

## Decision Matrix

Use this matrix to choose the right missing value strategy based on column
characteristics.

### By Column Role

| Column Role      | Strategy              | Rationale                               |
| ---------------- | --------------------- | --------------------------------------- |
| Primary key / ID | Drop row              | Row is unusable without identity        |
| Foreign key      | Drop row or "Unknown" | Depends on whether the join is required |
| Required field   | Drop row              | Business logic requires this value      |
| Optional field   | Impute or placeholder | Row is still useful without this value  |
| Derived/computed | Recompute             | Calculate from source columns           |

### By Data Type and Missing Percentage

| Type        | Missing % | Strategy                    | Notes                                |
| ----------- | --------- | --------------------------- | ------------------------------------ |
| Numeric     | < 5%      | Mean or median              | Median is more robust to outliers    |
| Numeric     | 5-30%     | Median                      | Mean gets skewed by outlier patterns |
| Numeric     | 30-50%    | Median + add indicator col  | `col_missing = col.isna()`           |
| Numeric     | > 50%     | Drop column                 | Too sparse to be useful              |
| Categorical | < 10%     | Mode                        | Most common value                    |
| Categorical | 10-30%    | "Unknown" / "Other"         | Explicit missing category            |
| Categorical | > 50%     | Drop column                 | Too sparse                           |
| Boolean     | Any       | False / 0                   | Absence usually means "no"           |
| DateTime    | < 10%     | Drop row or interpolate     | Depends on time series needs         |
| DateTime    | > 10%     | Drop column                 | Too many gaps for time analysis      |
| Time series | Any       | Forward fill then back fill | Preserves temporal continuity        |
| Text/free   | Any       | Empty string or "N/A"       | Depends on downstream use            |

## Sentinel Values

These strings should be converted to `pd.NA` before any imputation:

```python
SENTINEL_VALUES = [
    "",           # empty string
    " ",          # whitespace
    "N/A",        # common placeholder
    "n/a",
    "NA",
    "na",
    "NULL",       # database export artifact
    "null",
    "None",       # Python repr leak
    "none",
    "NaN",        # string NaN (not float NaN)
    "nan",
    "-",          # dash placeholder
    "--",
    ".",          # dot placeholder
    "?",          # unknown marker
    "#N/A",       # Excel error
    "#REF!",      # Excel error
    "#VALUE!",    # Excel error
    "undefined",  # JavaScript leak
    "missing",    # explicit missing marker
    "not available",
    "not applicable",
]
```

## Adding Missing Indicator Columns

When missing data is informative (e.g., a missing income field might correlate
with other features), add an indicator column:

```python
def add_missing_indicators(df, columns):
    """Add boolean columns indicating where values were missing."""
    for col in columns:
        df[f"{col}_was_missing"] = df[col].isna()
    return df
```

## Imputation Order

When multiple columns have missing values, the order of imputation matters:

1. **Drop rows** for required fields first (reduces dataset size)
2. **Drop columns** that are too sparse (> 50% missing)
3. **Forward/back fill** time series columns
4. **Impute numeric** columns (median/mean)
5. **Impute categorical** columns (mode/placeholder)
6. **Add indicator columns** for columns where missingness is informative
