# Fixtures

Golden inputs for unit and agent tests. **Test shape and behavior, not verbatim LLM output.**

## Files

| File | Use |
|------|-----|
| `fintech-chatbot.json` | Canonical app description for generator/scorer tests |

## Adding fixtures

1. Add JSON under `fixtures/`
2. Document in this README
3. Import in tests — do not duplicate inline in test files

## Policy

- Snapshots allowed for Zod-parsed objects
- No snapshots of raw model strings
- Mock AI via `lib/test/mock-ai.ts` in CI
