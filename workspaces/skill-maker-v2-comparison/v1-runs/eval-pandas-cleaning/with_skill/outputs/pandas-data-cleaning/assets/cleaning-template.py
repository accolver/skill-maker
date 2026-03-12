"""
Pandas Data Cleaning Template
==============================
Copy this file and fill in the sections marked with TODO.
Each section corresponds to a step in the cleaning workflow.
"""

import pandas as pd

# ==============================================================================
# 1. LOAD AND INSPECT
# ==============================================================================

# TODO: Update the file path and reader
df = pd.read_csv("TODO_INPUT_FILE.csv")
# df = pd.read_parquet("TODO_INPUT_FILE.parquet")

print(f"Shape: {df.shape}")
print(f"\nColumn types:\n{df.dtypes}")
print(f"\nMissing values:\n{df.isnull().sum()}")
print(f"\nSample rows:\n{df.head()}")
print(f"\nBasic stats:\n{df.describe(include='all')}")

# ==============================================================================
# 2. NORMALIZE COLUMN NAMES
# ==============================================================================

df.columns = (
    df.columns
    .str.strip()
    .str.lower()
    .str.replace(r'[^a-z0-9]+', '_', regex=True)
    .str.strip('_')
)
print(f"\nNormalized columns: {list(df.columns)}")

# ==============================================================================
# 3. REPLACE SENTINEL VALUES
# ==============================================================================

sentinel_values = ["N/A", "n/a", "NA", "null", "NULL", "-", "--", "?", ""]
for col in df.select_dtypes(include="object").columns:
    df[col] = df[col].replace(sentinel_values, pd.NA)

print(f"\nMissing values after sentinel replacement:\n{df.isnull().sum()}")

# ==============================================================================
# 4. HANDLE MISSING VALUES (per-column strategy)
# ==============================================================================

# TODO: Define your per-column strategies
# Examples:
# df["revenue"] = df["revenue"].fillna(0)                    # absence = zero
# df["category"] = df["category"].fillna("unknown")          # missing category
# df["age"] = df["age"].fillna(df["age"].median())           # skewed numeric
# df = df.dropna(subset=["email"])                           # required field

before_drop = len(df)
# TODO: Add your dropna/fillna calls here
print(f"Rows after null handling: {len(df)} (dropped {before_drop - len(df)})")

# ==============================================================================
# 5. CONVERT TYPES
# ==============================================================================

# TODO: Convert columns to correct types
# Examples:
# df["price"] = pd.to_numeric(df["price"], errors="coerce")
# df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce", format="mixed")
# df["is_active"] = df["is_active"].str.lower().map({"yes": True, "no": False})
# df["quantity"] = df["quantity"].astype("Int64")  # nullable integer

print(f"\nColumn types after conversion:\n{df.dtypes}")

# ==============================================================================
# 6. DEDUPLICATE
# ==============================================================================

before_dedup = len(df)
# TODO: Specify your deduplication key
# df = df.drop_duplicates(subset=["email"], keep="last")
df = df.drop_duplicates()
print(f"Removed {before_dedup - len(df)} duplicate rows ({before_dedup} -> {len(df)})")

# ==============================================================================
# 7. VALIDATE
# ==============================================================================

# TODO: Add your validation assertions
assert df.shape[0] > 0, "DataFrame is empty after cleaning"
# assert df["email"].isnull().sum() == 0, "email still has nulls"
# assert df.duplicated(subset=["email"]).sum() == 0, "duplicates remain"

print("\nAll validations passed!")

# ==============================================================================
# 8. EXPORT
# ==============================================================================

# TODO: Update the output path and format
output_path = "TODO_OUTPUT_FILE_cleaned.csv"
df.to_csv(output_path, index=False)
# df.to_parquet("TODO_OUTPUT_FILE_cleaned.parquet", index=False)

print(f"\nExported {len(df)} rows, {len(df.columns)} columns to {output_path}")
