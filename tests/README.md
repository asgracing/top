# Frontend verification

Run the complete local baseline with:

```powershell
npm.cmd run verify
```

`check:syntax` validates JavaScript parsing. `check:quality` prevents duplicate IDs and prevents the existing `!important`, inline-style and silent-catch budgets from increasing. `test` runs dependency-free Node unit and contract tests.

Browser and visual scenarios will be added during R01 for widths 1920, 1440, 1024, 768, 414 and 360 pixels. They must use deterministic API fixtures from `tests/fixtures`.
