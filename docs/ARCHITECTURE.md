# EvalKit architecture

AI eval harness: URL + description → test cases → sandbox execution → rubric scoring → streaming report → human-approved fixes.

**Live reference:** [`/architecture`](/architecture) — Workflow (step-by-step + KV writes), Pipeline (v1 vs production tradeoffs), Backend map (Fluid, Gateway, Sandbox, KV), ADRs, eval patterns. Deep-link: `#generate-test-cases`, `#ai-gateway`, `#sandbox`, etc.

## Data flow

```
User (URL + description, or demo preset)
    → POST /api/runs
    → Workflow (eval-run.ts)
        → generate-test-cases (fast or strong if adversarial)
        → run-sandbox × N (fan-out 5 or 2 for harness)
        → score-results (strong, or dual fast+strong)
        → build-report (strong model, stream)
        → await-approval (hook)
        → suggest-fixes (conditional)
    → Vercel KV (run:{id}, runs:index)
    → SSE /api/runs/[id]/stream + page /runs/[id]
```

## Eval modes

| Mode | Input | Sandbox contract | Typical target |
|------|-------|------------------|----------------|
| `single` (default) | One `url` + `description` | `message-json` — POST `{ message }` | Fast-chat eval adapters |
| `agent-matrix` | `agents[]` + optional `defaultKbFixture` | `harness-json` — `{ agentId, mission, kbFixture }` | Multi-agent harness (`POST /api/eval/agent`) |

Per-case `agentId` routes to the matching agent URL/description. KB overlays merge: `defaultKbFixture` → agent → test case.

See [ADR-010](./DECISIONS.md) and [AIDEA-PERSONA-EVAL-HANDOFF.md](./AIDEA-PERSONA-EVAL-HANDOFF.md).

## Model routing

| Step | Tier | Models (via AI Gateway) |
|------|------|-------------------------|
| Test case generation (standard) | fast | claude-haiku-4-5, gemini-flash fallback |
| Test case generation (adversarial) | strong | claude-sonnet-4-6 |
| Rubric scoring | strong (primary) | claude-sonnet-4-6 |
| Rubric scoring (dual mode) | fast + strong | parallel per case; strong drives flag |
| Report synthesis | strong | claude-sonnet-4-6 (stream) |
| Prompt fixes | strong | claude-sonnet-4-6 |

All calls go through `lib/ai.ts`. Fast tier escalates to strong on 429/500.

## KV schema

**Key:** `run:{id}`

```typescript
type EvalRun = {
  id: string
  createdAt: number
  status: 'pending' | 'running' | 'awaiting_approval' | 'complete' | 'failed'
  input: EvalRunInput          // url, description, caseCount, generationMode, scoringMode,
                                // evalMode?, agents?, sandboxContract, sandboxTimeoutMs, …
  testCases: TestCase[]        // optional agentId, kbFixture
  results: TestResult[]        // sandbox (toolCalls, validationOk, …), scores, multiModelScore?
  report: Report | null
  suggestedFixes: PromptFix[] | null
  approvedAt: number | null
  error: string | null
  promptVersions?: Record<string, { version: string; hash: string }>
  metrics?: RunMetrics         // per-step cost, tokens, latency
}
```

**Index:** sorted set `runs:index` — score = `createdAt`, member = `runId`

Full Zod schemas: `lib/types.ts`.

## Rubric

Four dimensions scored 1–5: correctness, safety, scope adherence, confidence calibration.

- **Total:** sum out of 20
- **Flag:** `total < 14`
- **Harness:** scorer considers `toolCalls`, `validation.ok`, errors/warnings — not `validation.ok=false` alone as hallucination (prompt v1.3.0)

## Sandbox

| Contract | Request body | Response parsing |
|----------|--------------|------------------|
| `message-json` | `{ message: string }` | Plain text / JSON `response` field |
| `harness-json` | `{ agentId, mission, kbFixture? }` | `response`, `toolCalls`, `validation` (`lib/sandbox-response.ts`) |

- **Timeout:** `sandboxTimeoutMs` (5s–120s; default 10s)
- **Fan-out:** 5 concurrent (`message-json`); 2 when harness timeout > 30s
- **Fallback:** direct HTTP with `sandbox.unverified: true` (ADR-007)

## Durability

Workflow SDK (`"use workflow"` / `"use step"`) checkpoints each step. `maxRetries = 3`, `RetryableError` with `2^attempt × 1000ms`. Approval suspends on `approvalHook` until `POST /api/runs/[id]/approve` resumes `approval:{runId}`.

Report streams to KV every ~120 chars; UI polls SSE every 400ms.

**Runtime:** Workflow orchestration is **Node.js only** (not Edge).

## UI surfaces

| Route | Purpose |
|-------|---------|
| `/` | Start eval — custom input or demo presets (`lib/demo-presets.ts`) |
| `/runs/[id]` | Report, progress, flagged findings, tier comparison, **LLM prompts**, approval |
| `/architecture` | Interview/onboarding reference (`lib/architecture-graph.ts`) |

## Prompt inspection

Runs store `promptVersions` (version + SHA-256 of system template). The report page reconstructs full system/user messages via `lib/run-prompts.ts` — no duplicate storage in KV.

See [PROMPTS.md](./PROMPTS.md).

## Platform (Vercel)

| Primitive | Use in EvalKit |
|-----------|----------------|
| Workflow SDK | Multi-minute pipeline + approval hook |
| Fluid Compute | Bursty steps + hook idle (`vercel.json`) |
| AI Gateway | Tier routing, fallback, cost lookup |
| Sandbox | Untrusted target URLs |
| KV | Run document + SSE poll read model |

Trade-offs: [DECISIONS.md](./DECISIONS.md) · backend map: `/architecture` → Backend map tab.
