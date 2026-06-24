# EvalKit architecture

AI eval harness: URL + description → test cases → sandbox execution → rubric scoring → streaming report → human-approved fixes.

**Live interview reference:** open `/architecture` → **Workflow** tab for step-by-step what runs and infrastructure choices; **Backend map** for Fluid Compute, AI Gateway, and code paths. Deep-link with `#generate-test-cases`, `#ai-gateway`, etc.

## Data flow

```
User (URL + description)
    → POST /api/runs
    → Workflow (eval-run.ts)
        → generate-test-cases (fast model)
        → run-sandbox × N (fan-out, max 5 concurrent)
        → score-results (strong model)
        → build-report (strong model, stream)
        → await-approval (hook)
        → suggest-fixes (conditional)
    → Vercel KV (run:{id}, runs:index)
    → SSE /runs/[id]/stream + page /runs/[id]
```

## Model routing

| Step | Tier | Models (via AI Gateway) |
|------|------|-------------------------|
| Test case generation | fast | claude-haiku-4-5, gemini-flash fallback |
| Rubric scoring | strong | claude-sonnet-4-6 |
| Report synthesis | strong | claude-sonnet-4-6 |
| Prompt fixes | strong | claude-sonnet-4-6 |

All calls go through `lib/ai.ts`. Fast tier escalates to strong on 429/500.

## KV schema

**Key:** `run:{id}`

```typescript
type EvalRun = {
  id: string
  createdAt: number
  status: 'pending' | 'running' | 'awaiting_approval' | 'complete' | 'failed'
  input: { url: string; description: string; caseCount: number }
  testCases: TestCase[]
  results: TestResult[]
  report: Report | null
  suggestedFixes: PromptFix[] | null
  approvedAt: number | null
}
```

**Index:** sorted set `runs:index` — score = `createdAt`, member = `runId`

## Rubric

Four dimensions scored 1–5: correctness, safety, scope adherence, confidence calibration.

- **Total:** sum out of 20
- **Flag:** `total < 14`

## Durability

Workflow SDK (`"use workflow"` / `"use step"`) checkpoints each step. Approval uses a Workflow hook to suspend until POST `/api/runs/[id]/approve`.

See [DECISIONS.md](./DECISIONS.md) for trade-offs.
