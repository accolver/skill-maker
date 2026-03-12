# Missing Value Strategies Reference

## Decision Matrix

| Column Type             | Missing < 5%     | Missing 5-30%     | Missing > 30%            | Missing > 70% |
| ----------------------- | ---------------- | ----------------- | ------------------------ | ------------- |
| Numeric (continuous)    | median           | median or mean    | Consider dropping column | Drop column   |
| Numeric (discrete/ID)   | mode or drop row | drop row          | Drop column              | Drop column   |
| Categorical (low card)  | mode             | mode or "Unknown" | "Unknown"                | Drop column   |
| Categorical (high card) | "Unknown"        | "Unknown"         | Drop column              | Drop column   |
| DateTime                | drop row         | drop row          | Drop column              | Drop column   |
| Boolean                 | False or mode    | False or mode     | Drop column              | Drop column   |
| Free text               | "N/A" or empty   | "N/A" or empty    | Drop column              | Drop column   |

## When to Use Each Strategy

### Median (numeric)

- **Best for:** Continuous numeric data with potential outliers
- **Why not mean:** Mean is sensitive to outliers; a few extreme values skew it
- **Example:** Income, age, price columns

### Mean (numeric)

- **Best for:** Normally distributed numeric data without outliers
- **When to use:** Only when you've verified the distribution is roughly
  symmetric
- **Example:** Standardized test scores, temperature readings

### Mode (categorical or discrete)

- **Best for:** Categorical columns where the most common value is a safe
  default
- **Caution:** If the mode represents 90%+ of values, filling with mode is fine.
  If the distribution is more uniform, "Unknown" is safer.
- **Example:** Country (if 80% are "US"), status (if 90% are "active")

### Forward Fill (ffill)

- **Best for:** Time series data where the previous value is a reasonable proxy
- **Caution:** Only use when data is sorted by time and gaps are small
- **Example:** Stock prices, sensor readings, daily metrics

### Backward Fill (bfill)

- **Best for:** Time series where the next value is more relevant than the
  previous
- **Caution:** Same as ffill — requires sorted data
- **Example:** Rare; sometimes used for end-of-period reporting

### Drop Row

- **Best for:** When the missing value makes the entire row unusable
- **Caution:** Only drop if < 5% of rows are affected, otherwise you lose too
  much data
- **Example:** Missing primary key, missing target variable in ML

### Drop Column

- **Best for:** Columns with > 50-70% missing values
- **Caution:** Check if the column is important for downstream analysis first
- **Example:** Optional survey fields, deprecated data fields

### Placeholder ("Unknown", "N/A", empty string)

- **Best for:** Categorical columns where missingness is informative
- **Why "Unknown" over empty:** Empty strings cause issues in groupby and
  comparisons
- **Example:** Referrer (missing = direct traffic), category (missing =
  uncategorized)

## Anti-Patterns

### Don't fill numeric with 0

Zero is a real value. If you fill missing ages with 0, your average age drops.
If you fill missing revenue with 0, your total revenue is wrong. Use median or
mean instead.

### Don't use mean for skewed data

If income ranges from $20K to $10M with a few billionaires, the mean is
misleading. Median is robust to outliers.

### Don't forward-fill unsorted data

`ffill()` fills with the previous row's value. If your data isn't sorted by
time, "previous" is meaningless.

### Don't drop rows when > 5% are affected

Dropping 20% of your data introduces selection bias. Use imputation instead.

### Don't fill everything with the same strategy

Each column has different semantics. A one-size-fits-all approach (e.g.,
`df.fillna(0)`) is almost always wrong.

## Pandas Code Patterns

```python
# Check missing values
df.isnull().sum()
df.isnull().sum() / len(df) * 100  # percentages

# Fill strategies
df["price"].fillna(df["price"].median())          # median
df["price"].fillna(df["price"].mean())             # mean
df["category"].fillna(df["category"].mode().iloc[0])  # mode
df["category"].fillna("Unknown")                   # placeholder
df["reading"].ffill()                              # forward fill
df["reading"].bfill()                              # backward fill

# Drop strategies
df.dropna(subset=["required_col"])                 # drop rows with null in specific col
df.dropna(thresh=len(df) * 0.5, axis=1)           # drop columns with >50% null

# Conditional fill
df["col"] = df["col"].where(df["col"].notna(), df["col"].median())

# Fill with group statistics
df["price"] = df.groupby("category")["price"].transform(
    lambda x: x.fillna(x.median())
)
```
