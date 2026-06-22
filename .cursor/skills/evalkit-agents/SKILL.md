---
name: evalkit-agents
description: EvalKit AI agent patterns — lib/ai.ts tiers, AI SDK v6 structured output, prompt hashing, mock-ai testing. Use when editing agents/, workflows/, lib/ai.ts, or lib/prompts.ts.
---

# EvalKit agent patterns

## Model routing

All LLM calls through `lib/ai.ts`:

```typescript
await generateWithTier({
  tier: 'fast', // or 'strong'
  step: 'generate-test-cases',
  // ...
});
```

Never hardcode model IDs in `agents/` or `workflows/`.

## Structured output (AI SDK v6)

Use `generateText` with `Output.object({ schema: zodSchema })` — not raw string parsing.

## Prompts

- Templates live in `lib/prompts.ts`
- Bump version when changing system prompts; store SHA-256 hash on run — see `docs/PROMPTS.md`

## Tests

Use `lib/test/mock-ai.ts` — assert output shape, category coverage, and flags — not verbatim model text.

## Pipeline order

`generate-cases` → `run-sandbox` → `score-results` → `build-report` → approval → `suggest-fixes`

Each workflow step updates KV progress via `updateRun`.
