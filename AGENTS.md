# ff

## Testing

```bash
# Run all 12 Playwright tests (auto-starts dev server on 5173)
python3 tests/test_pomotask.py

# Run individual test files
python3 tests/test_today.py
python3 tests/test_other_days.py
```

### Notes
- Uses `playwright-cli` + Firefox, not `@playwright/test` (no system browser deps)
- Dev server auto-starts/stops (Vite on port 5173)
- Test habits auto-clean before/after each run
- Snapshot YAMLs land in `.playwright-cli/`
- `find`/`grep` banned. Use `fd`/`rg` only.

