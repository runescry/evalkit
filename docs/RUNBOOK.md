# Runbook

Operational guide for debugging EvalKit runs.

## Inspect a run

```bash
# GET via API
curl https://your-app.vercel.app/api/runs/{runId}

# Per-run metrics
curl https://your-app.vercel.app/api/runs/{runId}/metrics

# Replay from KV (local)
npx tsx scripts/replay-run.ts {runId}
```

**UI:** `/runs/{runId}` — report, flagged findings, dual-tier comparison, **LLM prompts** (reconstructed), cost summary.

**Architecture reference:** `/architecture` — workflow steps, backend map, ADR links.

## KV keys

| Key | Contents |
|-----|----------|
| `run:{id}` | Full `EvalRun` JSON |
| `runs:index` | Sorted set of run IDs by `createdAt` |

## Workflow debugging

```bash
npx workflow web
```

Inspect step completion, retries, and hook state (`approval:{runId}`).

## Common failures

| Symptom | Check |
|---------|-------|
| Run stuck `running` | KV `error` field; workflow web; stale generate (no `testCases` after 3 min) |
| Sandbox timeout | `timedOut: true`; increase `sandboxTimeoutMs` for harness eval |
| HTTP 422 scope reject | Fast-chat target blocked tool-style prompt — expected for scope_drift cases; scorer v1.3.0 |
| False hallucination flag | `toolCalls` includes `gmail_read` but `validation.ok=false` — read harness errors in flagged findings + LLM prompts panel |
| Scorer flag mismatch | `reasoning` vs scores; `npm run test:eval`; ground truth in `evals/ground-truth.json` |
| Approval not resuming | Hook token `approval:{runId}`; POST `/api/runs/{id}/approve` with `{ approved: true }` |
| Agent-matrix missing agent | `agentId` on test case must match `input.agents[].id` |
| Deployment checks stuck “Running” | CLI `vercel deploy --prod` has no GitHub commit — use `git push` to `main`; see [CICD.md](./CICD.md) |

## Harness / agent-matrix eval

Target must implement harness contract (e.g. aidea `POST /api/eval/agent`):

- Request: `{ agentId, mission, kbFixture? }`
- Response: `{ response, toolCalls?, validation? }`

Pilot fixture: `fixtures/aidea-agent-matrix-pilot.json` (3 agents, 90s timeout).

Handoff: [AIDEA-PERSONA-EVAL-HANDOFF.md](./AIDEA-PERSONA-EVAL-HANDOFF.md).

## Logs

- Propagate `runId` in all log lines for a run
- Never log full target URL or user description — domain + hash only (`lib/observability.ts`)

## Health check

```bash
curl https://your-app.vercel.app/api/health
```

Both model tiers + latency when Gateway is configured.

## Per-run metrics

```bash
curl https://your-app.vercel.app/api/runs/{runId}/metrics
```

Returns `runId`, per-step cost/latency/token breakdown, and totals. Also on `/runs/{runId}` via `RunCostSummary`.

Gateway `totalCost` may lag — `lib/ai.ts` retries `getGenerationInfo` by `generationId`.

## Staging cost alert (runs >$1.00)

Configure in **Vercel → Project → Observability → Alerts** (Preview/staging environment):

| Field | Value |
|-------|-------|
| Name | `EvalKit run cost > $1.00` |
| Signal | Custom metric / log-based (OpenTelemetry span attribute) |
| Filter | `evalkit.total_cost` aggregated per `evalkit.run_id` |
| Condition | `> 1.00` USD in a 5-minute window per run |
| Notify | Team Slack or email |

**Practical setup:** EvalKit emits spans with `evalkit.run_id` and `evalkit.total_cost` on each AI call. In Vercel Observability, create an alert on span attribute `evalkit.total_cost` grouped by `evalkit.run_id`, threshold **1.00**. For staging, scope the alert to the **Preview** deployment and tag `environment:preview`.

If custom span alerts are unavailable on your plan, use a log drain filter on workflow completion logs that include `runId` and check KV via `GET /api/runs/{id}/metrics` in a scheduled check — prefer native Observability when available.

No dashboard or alert resources are committed in code; operators configure rules in the Vercel UI per environment.
