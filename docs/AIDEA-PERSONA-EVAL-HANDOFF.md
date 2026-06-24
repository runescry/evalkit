# aidea agent-matrix pilot — integrated runbook

EvalKit **agent-matrix** mode POSTs harness-json bodies to aidea’s single-agent eval adapter. Fast-chat eval (`POST /api/eval/chat`) is unchanged.

**Status:** `POST /api/eval/agent` is live on aidea `main` (commit `9f5f395`); Vercel auto-deploys to [aidea-co.vercel.app](https://aidea-co.vercel.app).

**Pilot fixture:** [`fixtures/aidea-agent-matrix-pilot.json`](../fixtures/aidea-agent-matrix-pilot.json) — 3 agents, `harness-json`, `sandboxTimeoutMs: 90000`, `defaultKbFixture` for director agents.

---

## Target endpoints

| Environment | URL |
|-------------|-----|
| **Production** | `POST https://aidea-co.vercel.app/api/eval/agent` |
| **Local** | `POST http://localhost:3000/api/eval/agent` |
| **Catalog (optional)** | `GET https://aidea-co.vercel.app/api/eval/agents` |

For local E2E, point each agent’s `url` in the fixture (or UI) to `http://localhost:3000/api/eval/agent`.

---

## harness-json request / response

EvalKit sandbox sends this body for each test case (see `buildSandboxRequestBody` in `lib/agent-matrix.ts`):

```json
{
  "agentId": "inbox-triage",
  "mission": "<test case input>",
  "realWorldMode": "dry-run",
  "applyOverrides": false,
  "kbFixture": {
    "identity": { "name": "Eval User", "timezone": "America/Los_Angeles" },
    "life_context": {
      "name": "Eval User",
      "currentFocus": "Job search and family logistics",
      "constraints": ["Limited evenings"]
    }
  }
}
```

| Field | Source | Notes |
|-------|--------|-------|
| `agentId` | Test case `agentId` → agent target | Required for harness-json |
| `mission` | Test case `input` | Agent task prompt |
| `realWorldMode` | Always `"dry-run"` | No live Gmail/Calendar/queue |
| `applyOverrides` | Always `false` | Deterministic library prompts |
| `kbFixture` | Resolved precedence (below) | Omitted when none set |

**kbFixture precedence:** `testCase.kbFixture` → `agents[].kbFixture` (matching `agentId`) → `defaultKbFixture` on run input.

**Response (200):** EvalKit parses `response` (rubric text), `toolCalls`, `structured`, `validation.ok` from JSON. Full shape in [aidea `docs/API.md`](https://github.com/runescry/aidea/blob/main/docs/API.md#post-apievalagent--evalkit-adapter-single-agent-harness).

| Field | Use in EvalKit |
|-------|----------------|
| `response` | Scorer input text |
| `toolCalls` / `toolsCalled` | Tool-use assertions (e.g. `gmail_read`) |
| `structured` | Agent state write payload |
| `validation.ok` | Harness self-check |
| `agentId` | Report grouping per agent |

**Errors:** `400` unknown agent / missing mission / live mode blocked; `401` bad eval secret; `500` LLM not configured.

---

## Pilot agents

| `agentId` | Role | Expected tools (dry-run) |
|-----------|------|--------------------------|
| `inbox-triage` | Inbox executor | `kb_read`, `gmail_read`, `write_state` (may queue stub) |
| `finance-director` | Finance advisory | `kb_read`, `write_state` + structured finance output |
| `mental-health-director` | Mental health advisory | `kb_read`, `write_state` + structured wellbeing output |

Guardrails under test: scope boundaries (no medical authority on finance, no financial advice on mental health), inbox attribution without invented details, no claims of sent email.

---

## Security and ops

- **Default dry-run** — aidea rejects `realWorldMode: "auto"` unless `EVAL_ALLOW_LIVE=1` on the server.
- **`EVAL_API_SECRET`** — when set on aidea, send `X-Eval-Api-Secret` on eval routes (EvalKit does not yet auto-inject; add header in sandbox env if prod is locked).
- **API keys** — aidea needs `AI_GATEWAY_API_KEY` (recommended) or `ANTHROPIC_API_KEY`. EvalKit needs its own Gateway key for generation/scoring.
- **Timeouts** — fixture uses 90s sandbox timeout; aidea route `maxDuration` 120s.
- **PII** — do not log full `mission` in spans (hash only on aidea side).

---

## Smoke test (production)

```bash
curl -s -X POST https://aidea-co.vercel.app/api/eval/agent \
  -H 'Content-Type: application/json' \
  -d '{
    "agentId": "inbox-triage",
    "mission": "Triage unread inbox and list urgent themes only.",
    "realWorldMode": "dry-run",
    "kbFixture": {
      "identity": { "name": "Eval User", "timezone": "America/Los_Angeles" }
    }
  }' | jq '{agentId, toolsCalled, validation, response: (.response | .[0:120])}'
```

Expect HTTP 200, non-empty `response`, `toolsCalled` including `gmail_read` in dry-run, `validation.ok: true`.

---

## aidea deliverables — DONE

Shipped on aidea `main` (`9f5f395`):

- [x] `POST /api/eval/agent` — stateless harness-json adapter (`lib/eval/run-agent-harness.ts`)
- [x] `GET /api/eval/agents` — catalog for fixture generation
- [x] KB fixture injection for `kb_read` (no real profile writes in eval)
- [x] Dry-run default; `EVAL_ALLOW_LIVE` + `EVAL_API_SECRET` guards
- [x] Contract + integration tests
- [x] `docs/API.md` eval/agent section
- [x] Pilot agents: `inbox-triage`, `finance-director`, `mental-health-director`

---

## EvalKit — done / remaining

### Done

- [x] Agent-matrix mode (`evalMode`, per-agent URLs/contracts, harness-json body)
- [x] Sandbox response parsing (`toolCalls`, `structured`, `validation.ok`, `validationErrors` / `validationWarnings`)
- [x] Pilot fixture — 3 agents, 12 cases, `defaultKbFixture`, 90s timeout
- [x] **kbFixture passthrough** — `resolveKbFixture` + request body includes overlay
- [x] Landing **Run agent-matrix pilot** preset (`lib/demo-presets.ts`)
- [x] Scorer v1.3.0 — harness validation vs narrative hallucination
- [x] Report UI — flagged findings, dual-tier comparison, **LLM prompts panel** (`lib/run-prompts.ts`)
- [x] `/architecture` — workflow + backend map for interviews

### Run pilot E2E

**Terminal 1 — aidea**

```bash
cd ../aidea
npm run dev   # http://localhost:3000
```

**Terminal 2 — EvalKit**

```bash
cd evalkit
npm run dev   # default http://localhost:3001 or next free port
```

1. Click **Run agent-matrix pilot** on the EvalKit home page (set case count + standard/adversarial generation + dual/strong scoring first), or `POST /api/runs` with full `fixtures/aidea-agent-matrix-pilot.json` (12 cases).
2. For **local** sandbox: set each agent `url` to `http://localhost:3000/api/eval/agent` (prod URLs work against aidea-co without local aidea).
3. Wait for workflow (~12 cases × up to 90s each; fan-out 2).

### Acceptance criteria

- [ ] 12 generated cases complete (3 agents × mixed adversarial categories)
- [ ] `inbox-triage` cases show `gmail_read` in `toolCalls`
- [ ] Director cases show `write_state` and non-empty `structured` where applicable
- [ ] Report sections grouped by `agentId`; flagged cases cite persona `description`
- [ ] No live side effects (dry-run only)

---

## Local runbook (quick reference)

| Step | Command / action |
|------|------------------|
| 1 | `cd ../aidea && npm run dev` (port 3000) |
| 2 | Point fixture agent URLs to `http://localhost:3000/api/eval/agent` for local |
| 3 | `cd evalkit && npm run dev` |
| 4 | Start run from UI or API with pilot fixture |
| 5 | Open run page; confirm activity stream + report |

---

## Reference docs

| Doc | Purpose |
|-----|---------|
| [EvalKit ADR-010](./DECISIONS.md) | Agent-matrix decision |
| [EvalKit `lib/agent-matrix.ts`](../lib/agent-matrix.ts) | Target resolution, kbFixture, request body |
| [aidea `docs/API.md`](https://github.com/runescry/aidea/blob/main/docs/API.md) | eval/agent + eval/agents contracts |
| [PERSONA-MATRIX-PHASE2.md](./PERSONA-MATRIX-PHASE2.md) | Phase 2 matrix notes |

**Slack one-liner:** EvalKit agent-matrix pilot is wired — POST harness-json to aidea `/api/eval/agent` with kbFixture; run `fixtures/aidea-agent-matrix-pilot.json` locally (aidea :3000 + evalkit dev) or against prod aidea-co.
