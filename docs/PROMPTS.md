# Prompt versioning

EvalKit prompts are versioned for reproducibility. Each run stores a hash of the prompt set used.

## Location

- Templates: `lib/prompts.ts`
- Policy: this document

## Version bumps

Bump the prompt `version` string when changing:

- System instructions for any agent step
- Rubric definitions or score anchors
- Output schema instructions

Do **not** bump for typo fixes that don't change behavior (optional patch note in CHANGELOG only).

## Hash storage

On each run, store:

```typescript
promptVersions: {
  generateCases: { version: '1.0.0', hash: 'sha256:…' }
  scoreResults: { version: '1.0.0', hash: 'sha256:…' }
  // …
}
```

Hash = SHA-256 of normalized prompt string (trimmed, consistent newlines).

## Testing

When bumping a prompt version:

1. Run `npm run test:eval` after Slice 10
2. If alignment drops below 85%, update ground truth or rubric anchors — do not silently lower the gate

## Agent rules

- Never inline large prompts in `agents/*.ts` — import from `lib/prompts.ts`
- Document rationale for prompt changes in PR description
