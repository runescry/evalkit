# Persona matrix Phase 2 — full library rollout

Phase 1 ships EvalKit **agent-matrix mode** with a 3-agent pilot fixture. Phase 2 covers the full aidea **36-agent library** as nightly CI, not live demo.

## Agent catalog

Export from aidea `AGENT_LIBRARY` → [`fixtures/aidea-agent-catalog.json`](../fixtures/aidea-agent-catalog.json) (not generated in Phase 1).

```json
{
  "agents": [
    {
      "id": "inbox-triage",
      "label": "Inbox Triage",
      "authority": "executor",
      "defaultTools": ["gmail_read", "queue_action"],
      "description": "Auto-generated contract: role, allowed tools, forbidden cross-domain behaviors, stateWriteKey expectations."
    }
  ]
}
```

**aidea-side:** script reading each `AgentDefinition` in `lib/agents/library/` to emit EvalKit-ready `description` + `contractSummary`.

## Rollout tiers (cost control)

| Tier | Agents | Cases/agent | When |
|------|--------|-------------|------|
| P0 | 3 pilot (`inbox-triage`, `finance-director`, `mental-health-director`) | 4 | Phase 1 demo |
| P1 | 9 daily + dispatch | 3 | High user-visible risk |
| P2 | 9 personal + 9 company directors | 2 | Domain guardrails |
| P3 | 8 learning + creator | 2 | Studio-only agents |

Full matrix ≈ **36 × 3 = 108 cases** × dual scoring — run **nightly CI**, not interactive demo.

## EvalKit CI gate (Phase 2)

- `npm run test:eval:persona` — golden cases per P0 agents, ≥85% scorer alignment (mirror `npm run test:eval`)
- Fail CI when aidea `lib/agents/library/*` prompt hashes change without catalog regen

## Prerequisites

1. aidea [`POST /api/eval/agent`](./AIDEA-PERSONA-EVAL-HANDOFF.md) deployed with `kbFixture` + queue dry-run
2. Optional `GET /api/eval/agents` for catalog sync
3. EvalKit fixture generator or manual catalog maintenance

## Out of scope (v3)

- Full Inbox approval UI trajectory eval
- Live Gmail/Calendar in eval runs
- Auto-applying per-agent prompt fixes from EvalKit suggester into aidea repo
