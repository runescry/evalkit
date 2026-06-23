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

## Future / backlog

- [ ] **14** Auth + rate limits — API keys, middleware rate limiting (deferred from v1; see ADR-008)

- [ ] **Dual-tier eval comparison** — extend L3 eval to run scorer against both `fast` and `strong` tiers via `lib/ai.ts`, report alignment deltas and cost/latency side-by-side; gate on minimum alignment per tier plus max regression between tiers.
