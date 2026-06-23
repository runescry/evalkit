# Runbook

Operational guide for debugging EvalKit runs.

## Inspect a run

```bash
# After Slice 02 — GET via API
curl https://your-app.vercel.app/api/runs/{runId}

# Replay from KV (local)
npx tsx scripts/replay-run.ts {runId}
```

## KV keys

| Key | Contents |
|-----|----------|
| `run:{id}` | Full `EvalRun` JSON |
| `runs:index` | Sorted set of run IDs by `createdAt` |

## Workflow debugging

```bash
npx workflow web
```

Use after Slice 03 to inspect step completion and hook state.

## Common failures

| Symptom | Check |
|---------|-------|
| Run stuck `running` | Workflow step error in KV `error` field; workflow web |
| Sandbox timeout | `timedOut: true` on `SandboxResult`; target app latency |
| Scorer flag mismatch | `reasoning` vs scores; ground truth alignment |
| Approval not resuming | Hook ID; POST `/approve` idempotency |

## Logs

- Propagate `runId` in all log lines for a run
- Never log full target URL or user description — domain + hash only

## Health check

```bash
curl https://your-app.vercel.app/api/health
```

After Slice 01 — both model tiers + latency.

## Per-run metrics

```bash
curl https://your-app.vercel.app/api/runs/{runId}/metrics
```

Returns `runId`, per-step cost/latency/token breakdown, and totals. Metrics are also on the run report page (`/runs/{runId}`) once steps complete.

## Staging cost alert (runs >$1.00)

Configure in **Vercel → Project → Observability → Alerts** (Preview/staging environment):

| Field | Value |
|-------|-------|
| Name | `EvalKit run cost > $1.00` |
| Signal | Custom metric / log-based (OpenTelemetry span attribute) |
| Filter | `evalkit.total_cost` aggregated per `evalkit.run_id`, or sum of `EvalRun.metrics.totalCost` if exported via log drain |
| Condition | `> 1.00` USD in a 5-minute window per run |
| Notify | Team Slack or email |

**Practical setup:** EvalKit emits spans with `evalkit.run_id` and `evalkit.total_cost` on each AI call. In Vercel Observability, create an alert on span attribute `evalkit.total_cost` grouped by `evalkit.run_id`, threshold **1.00**. For staging, scope the alert to the **Preview** deployment and tag `environment:preview`.

If custom span alerts are unavailable on your plan, use a log drain filter on workflow completion logs that include `runId` and check KV via `GET /api/runs/{id}/metrics` in a scheduled check — prefer native Observability when available.

No dashboard or alert resources are committed in code; operators configure rules in the Vercel UI per environment.
