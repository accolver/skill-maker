# Deduplication Patterns Reference

## Basic Deduplication

```python
# Remove exact duplicate rows (all columns match)
df = df.drop_duplicates().reset_index(drop=True)

# Remove duplicates based on specific columns
df = df.drop_duplicates(subset=["id", "email"]).reset_index(drop=True)

# Keep first occurrence (default)
df = df.drop_duplicates(subset=["id"], keep="first")

# Keep last occurrence
df = df.drop_duplicates(subset=["id"], keep="last")

# Drop ALL duplicates (keep none)
df = df.drop_duplicates(subset=["id"], keep=False)
```

## Advanced Patterns

### Keep the most recent row

When duplicates exist and you want to keep the row with the latest timestamp:

```python
# Sort by timestamp descending, then keep first
df = df.sort_values("updated_at", ascending=False)
df = df.drop_duplicates(subset=["user_id"], keep="first")
df = df.reset_index(drop=True)
```

### Keep the most complete row

When duplicates exist and you want the row with the fewest nulls:

```python
# Add a null count column, sort by it, then dedup
df["_null_count"] = df.isnull().sum(axis=1)
df = df.sort_values("_null_count", ascending=True)
df = df.drop_duplicates(subset=["user_id"], keep="first")
df = df.drop(columns=["_null_count"])
df = df.reset_index(drop=True)
```

### Merge duplicate rows

When duplicates have complementary data (one row has field A, another has field
B):

```python
def merge_duplicates(df: pd.DataFrame, key_cols: list[str]) -> pd.DataFrame:
    """Merge duplicate rows, preferring non-null values."""
    def merge_group(group):
        if len(group) == 1:
            return group.iloc[0]
        # For each column, take the first non-null value
        merged = {}
        for col in group.columns:
            non_null = group[col].dropna()
            merged[col] = non_null.iloc[0] if len(non_null) > 0 else None
        return pd.Series(merged)

    return df.groupby(key_cols, as_index=False).apply(merge_group).reset_index(drop=True)
```

### Fuzzy deduplication

When duplicates aren't exact (e.g., "John Smith" vs "john smith" vs "JOHN
SMITH"):

```python
# Normalize before dedup
df["_name_normalized"] = (
    df["name"]
    .str.strip()
    .str.lower()
    .str.replace(r"\s+", " ", regex=True)
)
df = df.drop_duplicates(subset=["_name_normalized", "email"], keep="first")
df = df.drop(columns=["_name_normalized"])
```

### Dedup with priority rules

When you want to keep specific rows based on a priority:

```python
# Define priority (lower = higher priority)
priority_map = {"verified": 0, "pending": 1, "unverified": 2}
df["_priority"] = df["status"].map(priority_map).fillna(99)
df = df.sort_values("_priority", ascending=True)
df = df.drop_duplicates(subset=["user_id"], keep="first")
df = df.drop(columns=["_priority"])
```

## Detecting Duplicates

```python
# Count duplicates
n_dupes = df.duplicated(subset=["id"]).sum()
print(f"Found {n_dupes} duplicate rows")

# View duplicate rows
dupes = df[df.duplicated(subset=["id"], keep=False)]
print(dupes.sort_values("id"))

# Count duplicates per key
dupe_counts = df.groupby("id").size().reset_index(name="count")
dupe_counts = dupe_counts[dupe_counts["count"] > 1]
print(f"Keys with duplicates: {len(dupe_counts)}")
```

## Always Reset Index

After any deduplication, always reset the index:

```python
df = df.drop_duplicates(subset=["id"]).reset_index(drop=True)
```

Why:

- `.iloc` indexing breaks with gaps in the index
- Downstream operations may assume contiguous indices
- Serialization (to_csv, to_parquet) works better with clean indices

## Reporting

Always report deduplication results:

```python
n_before = len(df)
df = df.drop_duplicates(subset=["id"]).reset_index(drop=True)
n_after = len(df)
n_removed = n_before - n_after
print(f"Deduplication: {n_before} -> {n_after} rows ({n_removed} removed, {n_removed/n_before*100:.1f}%)")
```
