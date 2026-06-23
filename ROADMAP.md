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

- [ ] **07** Report stream + UI (`feature/report-stream`)
- [ ] **08** Approval gate (`feature/approval-gate`)
- [ ] **09** Prompt fix suggester (`feature/prompt-fixes`)
- [ ] **10** Eval set + L3 gate (`feature/eval-set`)
- [ ] **11** Input UI (`feature/input-ui`)
- [ ] **12** Slack delivery (`feature/slack-chat-sdk`)

## Production

- [ ] **13** Observability (`infra/observability`)
- [ ] **14** Auth + rate limits (`feature/auth`)
- [ ] **15** Release v1 (`release/v1`)
