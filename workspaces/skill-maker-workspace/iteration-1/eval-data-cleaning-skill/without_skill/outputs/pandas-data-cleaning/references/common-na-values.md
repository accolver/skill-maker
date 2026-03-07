# Common NA / Null Sentinel Values

When loading CSV files, these string values should be treated as missing data.
Pass them via the `na_values` parameter of `pd.read_csv()`.

## Standard list

```python
NA_VALUES = [
    "",
    "NA",
    "N/A",
    "n/a",
    "null",
    "NULL",
    "None",
    "none",
    "-",
    "--",
    "nan",
    "NaN",
    "NAN",
    ".",
    "?",
    "missing",
    "MISSING",
    "#N/A",
    "#NA",
    "#VALUE!",
    "#REF!",
]
```

## Notes

- pandas already recognises many of these by default, but explicitly listing
  them avoids surprises across pandas versions.
- Add domain-specific sentinels as needed (e.g., `"9999"`, `"TBD"`,
  `"not available"`).
- When in doubt, load with `keep_default_na=True` **and** pass your custom list
  via `na_values` — they are additive.
