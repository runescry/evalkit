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
