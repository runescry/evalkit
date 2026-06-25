# EvalKit architecture

AI eval harness: URL + description → test cases → sandbox execution → rubric scoring → streaming report → human-approved fixes.

**Live reference:** [`/architecture`](/architecture) — **Overview** (high-level system diagram + Vercel primitives), Workflow (step-by-step + KV writes), Pipeline (v1 vs production tradeoffs), Backend map, ADRs, eval patterns. Deep-link: `#ai-gateway`, `#generate-test-cases`, `#sandbox`, etc.

## High-level system map

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser — / (start eval) · /runs/[id] (report) · /architecture │
└────────────────────────────┬────────────────────────────────────┘
                             │ server actions · POST /api/runs
┌────────────────────────────▼────────────────────────────────────┐
│  Next.js on Fluid Compute (vercel.json fluid: true)              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Workflow SDK — evalRunWorkflow (durable, checkpointed)      │ │
│  │  generate → sandbox×N → score → report → approval → fixes │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────┬──────────────┬──────────────┬──────────────┬──────────────┘
      │              │              │              │
┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼──────────┐
│AI Gateway │  │  Sandbox  │  │ Vercel KV │  │ Observability  │
│fast/strong│  │ 1 VM/case │  │ run:{id}  │  │ spans · trace  │
│  + openai │  │ fan-out   │  │ SSE poll  │  │ cost backfill  │
└─────┬─────┘  └─────┬─────┘  └───────────┘  └────────────────┘
      │              │
┌─────▼─────┐  ┌─────▼──────────────┐
│ Anthropic │  │ Target chatbot URL │
│ OpenAI    │  │ (message / harness)│
│ (BYOK)    │  └────────────────────┘
└───────────┘
```

## Data flow

```
User (URL + description, or demo preset)
    → POST /api/runs (or server action)
    → Workflow (eval-run.ts)
        → generate-test-cases (fast or strong if adversarial)
        → run-sandbox × N (fan-out 5 or 2 for harness)
        → score-results (strong, dual fast+strong, or multi-vendor Sonnet+OpenAI)
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

All calls go through `lib/ai.ts` → Vercel AI Gateway. No provider SDKs or `OPENAI_API_KEY` in app code.

| Step | Tier | Models (via AI Gateway) |
|------|------|-------------------------|
| Test case generation (standard) | `fast` | claude-haiku-4-5, gemini-flash fallback |
| Test case generation (adversarial) | `strong` | claude-sonnet-4-6 |
| Rubric scoring (default) | `strong` | claude-sonnet-4-6 |
| Rubric scoring (`dual`) | `fast` + `strong` | parallel per case; **strong** drives flag |
| Rubric scoring (`multi-vendor`) | `strong` + `openai` | parallel per case; **Sonnet** primary; OpenAI via BYOK |
| Report synthesis | `strong` | claude-sonnet-4-6 (stream) |
| Prompt fixes | `strong` | claude-sonnet-4-6 |

`/api/health` pings `fast`, `strong`, and `openai` tiers. Fast tier escalates to strong on 429/500.

## Scoring modes (home page)

| `scoringMode` | Judges | Use when |
|---------------|--------|----------|
| `dual` | Haiku + Sonnet | Same-vendor tier calibration |
| `multi-vendor` | Sonnet + OpenAI | Cross-vendor disagreement (ADR-011) |
| `strong` | Sonnet only | Lowest scorer cost |

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
  llmTrace?: LlmTraceEntry[]  // system/user/assistant per Gateway call
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
| `/` | Start eval — custom input or demo presets; scoring mode dropdown |
| `/runs/[id]` | Report, progress, flagged findings, tier comparison, **LLM trace**, approval |
| `/architecture` | Interview reference — Overview diagram + workflow/backend/ADRs |
| `/api/health` | Gateway tier health (fast, strong, openai) |

## Prompt inspection

Runs store `promptVersions` (version + SHA-256 of system template). The report page shows stored `llmTrace` or reconstructs prompts via `lib/run-prompts.ts`.

See [PROMPTS.md](./PROMPTS.md).

## Platform (Vercel)

| Primitive | Use in EvalKit |
|-----------|----------------|
| Workflow SDK | Multi-minute pipeline + approval hook |
| Fluid Compute | Bursty steps + hook idle (`vercel.json`) |
| AI Gateway | Three-tier routing, fallback, cost lookup, OpenAI BYOK |
| Sandbox | Untrusted target URLs |
| KV | Run document + SSE poll read model |

Trade-offs: [DECISIONS.md](./DECISIONS.md) · interactive map: `/architecture` → Overview tab.
