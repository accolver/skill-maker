# Missing Value Strategies — Decision Tree

Use this reference when choosing how to handle missing values per column. The
right strategy depends on the column's data type, its role in the dataset, and
the downstream use case.

## Decision flowchart

```
Is the column a required identifier (ID, primary key)?
  → YES: Drop the row. A record without an ID is unusable.
         df.dropna(subset=["id_column"])

Is the column the analysis target (what you're predicting/measuring)?
  → YES: Drop the row. Imputing the target variable introduces bias.
         df.dropna(subset=["target_column"])

Is the column numeric?
  → Is the distribution skewed? (check with df["col"].skew())
    → YES (|skew| > 1): Use median. Mean is pulled by outliers.
      df["col"].fillna(df["col"].median())
    → NO (roughly symmetric): Use mean.
      df["col"].fillna(df["col"].mean())
  → Is it a count or discrete value?
    → Fill with 0 if zero is a valid value, otherwise use median.
  → Is it time-series data?
    → Use forward-fill within groups:
      df["col"] = df.groupby("group_col")["col"].ffill()
    → Or interpolate:
      df["col"] = df.groupby("group_col")["col"].transform(
          lambda x: x.interpolate(method="linear")
      )

Is the column categorical?
  → Does one category dominate (>70% of values)?
    → Use mode: df["col"].fillna(df["col"].mode()[0])
  → Is missingness meaningful? (e.g., "no response" is informative)
    → Use explicit label: df["col"].fillna("Not Provided")
  → Otherwise:
    → Use "Unknown": df["col"].fillna("Unknown")

Is the column a datetime?
  → Is it part of a regular time series?
    → Forward-fill: df["col"].ffill()
  → Is it an event timestamp (irregular)?
    → Leave as NaT or drop, depending on whether the event matters.

Is the missing rate very high (>50%)?
  → Consider dropping the column entirely.
    → Check correlation with other columns first — it may be redundant.
    → df.drop(columns=["col"])
```

## Strategy summary table

| Scenario                             | Strategy              | Code                                                          |
| ------------------------------------ | --------------------- | ------------------------------------------------------------- |
| Required ID/key                      | Drop row              | `df.dropna(subset=["id"])`                                    |
| Prediction target                    | Drop row              | `df.dropna(subset=["target"])`                                |
| Numeric, skewed                      | Median                | `df["col"].fillna(df["col"].median())`                        |
| Numeric, symmetric                   | Mean                  | `df["col"].fillna(df["col"].mean())`                          |
| Numeric, time-series                 | Forward-fill by group | `df.groupby("g")["col"].ffill()`                              |
| Numeric, time-series                 | Linear interpolation  | `df.groupby("g")["col"].transform(lambda x: x.interpolate())` |
| Categorical, dominant mode           | Mode                  | `df["col"].fillna(df["col"].mode()[0])`                       |
| Categorical, informative missingness | Explicit label        | `df["col"].fillna("Not Provided")`                            |
| Categorical, general                 | Unknown               | `df["col"].fillna("Unknown")`                                 |
| Datetime, regular series             | Forward-fill          | `df["col"].ffill()`                                           |
| Datetime, irregular events           | Leave NaT or drop     | Depends on context                                            |
| >50% missing                         | Drop column           | `df.drop(columns=["col"])`                                    |

## Advanced: multiple imputation

For ML pipelines where imputation quality matters, consider `sklearn`:

```python
from sklearn.impute import KNNImputer

imputer = KNNImputer(n_neighbors=5)
df[numeric_cols] = imputer.fit_transform(df[numeric_cols])
```

Only use this when simple strategies aren't sufficient and the user is building
a model. For exploratory analysis and reporting, simple strategies are preferred
because they're transparent and explainable.

## Red flags

- **Filling everything with 0:** Distorts distributions, creates false signals.
- **Using mean on skewed data:** Outliers pull the mean, creating unrealistic
  fill values.
- **Forward-fill without grouping:** Bleeds values across unrelated groups
  (e.g., different sensors, different customers).
- **Imputing the target variable:** Introduces circular reasoning in ML models.
- **Ignoring missingness patterns:** If data is missing not-at-random (MNAR),
  imputation introduces bias. Check if missingness correlates with other
  columns.
