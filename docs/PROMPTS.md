# Prompt versioning

EvalKit prompts are versioned for reproducibility. Each run stores a hash of the prompt set used.

## Location

- Templates: `lib/prompts.ts`
- Reconstruction for UI: `lib/run-prompts.ts` (`buildRunPromptCalls`)
- Display: `components/run-prompts-panel.tsx` on `/runs/[id]`
- Policy: this document

## Current versions (post-v1)

| Step | Key in `promptVersions` | Version | Notes |
|------|-------------------------|---------|-------|
| Generate (standard) | `generateCases` | 1.2.0 | Fast tier; agent-matrix + fast-chat constraints |
| Generate (adversarial) | `generateCases` | 1.2.0 | Strong tier; same version string, different system hash |
| Score results | `scoreResults` | 1.3.0 | Harness validation vs hallucination calibration |
| Build report | `buildReport` | 1.1.0 | Persona matrix table when multi-agent |
| Suggest fixes | `suggestFixes` | 1.0.0 | Unified diffs for flagged cases |

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
  generateCases: { version: '1.2.0', hash: 'sha256:…' }
  scoreResults: { version: '1.3.0', hash: 'sha256:…' }
  buildReport: { version: '1.1.0', hash: 'sha256:…' }
  suggestFixes: { version: '1.0.0', hash: 'sha256:…' }
}
```

Hash = SHA-256 of normalized **system** prompt string (trimmed, consistent newlines). User prompts are built at runtime from run input and are reconstructed in the UI — not hashed individually.

## Prompt inspection (report UI)

`lib/run-prompts.ts` rebuilds the exact system + user messages sent to the Gateway:

1. **Generate** — one call (fast or strong)
2. **Score** — one call per test case (×2 when `scoringMode: dual`)
3. **Build report** — when results are scored
4. **Suggest fixes** — when `suggestedFixes` is set (including `[]`)

Messages are tagged `text`, `json`, or `markdown` for display. This is **reconstruction**, not KV storage — keeps run documents small and stays aligned with templates.

## Testing

When bumping a prompt version:

1. Run `npm run test:eval` after Slice 10
2. If alignment drops below 85%, update ground truth or rubric anchors — do not silently lower the gate
3. Update `lib/run-prompts.test.ts` if builder inputs change

## Agent rules

- Never inline large prompts in `agents/*.ts` — import from `lib/prompts.ts`
- Document rationale for prompt changes in PR description and `CHANGELOG.md`
