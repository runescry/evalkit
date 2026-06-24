# EvalKit roadmap

Track progress by slice. Mirror of [docs/SLICES.md](./docs/SLICES.md).

## Governance & scaffold

- [x] **00a** Agent harness (`infra/agent-harness`)
- [x] **00b** Next.js scaffold (`infra/scaffold`)

## Platform

- [x] **01** AI Gateway two-tier routing (`infra/ai-gateway`)
- [x] **02** Vercel KV storage (`infra/kv-storage`)
- [x] **03** Workflow SDK orchestration (`infra/workflow`)

## Agent pipeline

- [x] **04** Test case generator (`feature/test-case-generator`)
- [x] **05** Sandbox runner (`feature/sandbox-runner`)
- [x] **06** Rubric scorer (`feature/rubric-scorer`)

## User-facing

- [x] **07** Report stream + UI (`feature/report-stream`)
- [x] **08** Approval gate (`feature/approval-gate`)
- [x] **09** Prompt fix suggester (`feature/prompt-fixes`)
- [x] **10** Eval set + L3 gate (`feature/eval-set`)
- [x] **11** Input UI (`feature/input-ui`)
- [x] **12** Slack delivery (`feature/slack-chat-sdk`)

## Production

- [x] **13** Observability (`infra/observability`)
- [ ] **14** Auth + rate limits (`feature/auth`) — **deferred / backlog**
- [x] **15** Release v1 (`release/v1`)
- [x] **16** Post-v1 interview polish (`feature/post-v1-interview`)
- [x] **17** Observability + LLM trace (`infra/observability-trace`)

## Future / backlog

- [ ] **14** Auth + rate limits — API keys, middleware rate limiting (deferred from v1; see ADR-008)
- [ ] **Persona matrix Phase 2** — full 36-agent aidea catalog, nightly CI (`docs/PERSONA-MATRIX-PHASE2.md`)
- [ ] **L3 persona eval gate** — `npm run test:eval:persona` for P0 agents
- [ ] **pgvector / run history** — semantic dedup across runs (ADR-004 revisit)

## Shipped in Slice 16 (summary)

- Agent-matrix + harness-json sandbox + aidea pilot fixture
- Adversarial generation + dual-tier scoring + tier comparison UI
- `/architecture` reference page (workflow, backend map, ADRs)
- Run report: progress, activity stream, flagged findings, **LLM prompts panel**
- Fluid Compute enabled in `vercel.json`

## Shipped in Slice 17 (summary)

- Cost metrics race fix (dual score), KV merge retries, Gateway cost backfill
- **LLM trace** panel — prompts + model responses per pipeline step
- Cost summary visible during active runs with metrics polling
