# Null Handling Strategy Decision Guide

## Choosing the Right Strategy

| Data Type        | Distribution    | Strategy                                    | Example                   |
| ---------------- | --------------- | ------------------------------------------- | ------------------------- |
| Categorical      | Any             | Fill with constant (`"unknown"`, `"other"`) | Status, category, region  |
| Numeric          | Normal          | Fill with mean                              | Test scores, heights      |
| Numeric          | Skewed          | Fill with median                            | Revenue, salary, prices   |
| Time series      | Ordered         | Forward-fill (`ffill`)                      | Stock prices, sensor data |
| Numeric          | Ordered, smooth | Interpolate (linear)                        | Temperature, altitude     |
| Identifier / Key | Any             | **Drop the row**                            | user_id, order_id         |
| Any              | >50% null       | Consider dropping the **column**            | Sparse optional fields    |

## Null Percentage Thresholds

- **<5% null**: Safe to drop rows or fill — minimal data loss
- **5-30% null**: Fill is preferred — dropping loses too much data
- **30-50% null**: Fill carefully, consider if column is reliable enough for
  analysis
- **>50% null**: Consider dropping the column entirely, or flag it as unreliable

## Type Conversion Cheat Sheet

| From      | To           | Function                               | Notes                      |
| --------- | ------------ | -------------------------------------- | -------------------------- |
| `object`  | `datetime64` | `pd.to_datetime(col, errors="coerce")` | Unparseable → `NaT`        |
| `object`  | `float64`    | `pd.to_numeric(col, errors="coerce")`  | Unparseable → `NaN`        |
| `object`  | `int64`      | `col.astype("Int64")`                  | Capital I for nullable int |
| `object`  | `category`   | `col.astype("category")`               | Use for <50 unique values  |
| `object`  | `bool`       | `col.map({"true": True, ...})`         | Explicit mapping is safest |
| `float64` | `Int64`      | `col.astype("Int64")`                  | Handles NaN in int columns |

## Column Name Normalization Rules

Input patterns and expected output:

| Input           | Output       | Rule Applied                    |
| --------------- | ------------ | ------------------------------- |
| `"First Name"`  | `first_name` | Space → underscore, lowercase   |
| `"Revenue ($)"` | `revenue`    | Remove special chars, lowercase |
| `"  Status  "`  | `status`     | Strip whitespace, lowercase     |
| `"user__id"`    | `user_id`    | Collapse multiple underscores   |
| `"OrderDate"`   | `orderdate`  | Lowercase (no camelCase split)  |
| `"AMOUNT"`      | `amount`     | Lowercase                       |
