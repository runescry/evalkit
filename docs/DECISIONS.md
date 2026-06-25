# Architecture decisions

Format: ADR-lite. New decisions append at the bottom.

---

## ADR-001: Workflow SDK over a simple queue

**Status:** Accepted

**Context:** Eval runs have 15–50 steps and can take minutes. Server restarts must not lose progress.

**Decision:** Use Vercel Workflow SDK (`"use workflow"` / `"use step"`) for durable orchestration with checkpointed steps and approval hooks.

**Consequences:** Workflow API routes require Node.js runtime, not Edge.

---

## ADR-002: Fan-out sandboxes

**Status:** Accepted

**Context:** Sequential sandbox calls are too slow; shared state between cases invalidates results.

**Decision:** One Vercel Sandbox per test case; max 5 concurrent; tear down after capture.

**Consequences:** Higher parallelism cost; better isolation and speed.

---

## ADR-003: Two model tiers via AI Gateway

**Status:** Accepted

**Context:** Test generation is structured and high-volume; scoring needs judgment.

**Decision:** `fast` tier (haiku/flash) for generation; `strong` tier (sonnet) for scoring, reports, fixes. Route only through `lib/ai.ts`.

**Consequences:** ~8× cost savings on generation vs using sonnet everywhere.

---

## ADR-004: No vector DB for test cases

**Status:** Accepted

**Context:** No semantic search over historical cases in v1.

**Decision:** Vercel KV only. Revisit pgvector/Aurora when semantic deduplication across runs is needed.

---

## ADR-005: Stream report for perceived performance

**Status:** Accepted

**Context:** 30s spinner hurts trust; report is the LCP element.

**Decision:** SSE stream from `build-report` step; skeleton UI for CLS ≈ 0.

---

## ADR-006: Human-in-the-loop before prompt fixes

**Status:** Accepted

**Context:** Auto-applying prompt changes is unsafe for enterprise users.

**Decision:** Workflow suspends at `awaiting_approval`; fixes require explicit POST `/approve`. AI SDK `needsApproval` on apply tool as secondary guard.

---

## ADR-007: Sandbox fallback with unverified flag

**Status:** Accepted (v1)

**Context:** Vercel Sandbox creation or execution can fail (quota, OIDC, regional outage). Hard-failing the entire eval run wastes generated test cases and blocks scoring.

**Decision:** On sandbox infra failure, fall back to a direct HTTP POST to the target URL with the same JSON payload (`{ message }` for `message-json`, or harness body for `harness-json`) and timeout. Mark `sandbox.unverified: true` on those results so reports and operators know isolation was not guaranteed.

**Consequences:** Fallback responses may differ from sandboxed ones (e.g. IP allowlists, SSRF posture). Scoring still proceeds; operators should treat unverified results with lower trust. Implemented in `agents/run-sandbox.ts`.

---

## ADR-008: Auth deferred post-v1

**Status:** Deferred (Slice 14 backlog)

**Context:** API keys and rate limiting (Slice 14) add operational overhead before first production users validate the core eval loop.

**Decision:** Ship v1 without auth middleware. Revisit rate limits and API keys when exposing EvalKit beyond trusted workspaces.

**Consequences:** `/api/runs` and workflow triggers are unauthenticated in v1 — deploy behind Vercel deployment protection or private networking until Slice 14 lands.

---

## ADR-009: Multi-model eval and adversarial generation

**Status:** Accepted (post-v1)

**Context:** Single-tier scoring can miss calibration drift between fast and strong models. Standard case generation may not stress-test sophisticated jailbreaks.

**Decision:** Add optional `generationMode: adversarial` (strong-tier red-team prompts) and `scoringMode: dual` (parallel fast + strong rubric per case). Primary scores and flags use strong tier; `multiModelScore` stores both tiers and `flagAgreement`. L3 eval gate checks per-tier alignment and max 15% flag regression between tiers.

**Consequences:** Dual scoring doubles scorer cost. Adversarial generation increases generation cost vs fast tier. UI surfaces tier disagreements on run reports.

---

## ADR-010: Agent-matrix persona eval

**Status:** Accepted

**Context:** Single-URL eval (`POST { message }`) only tests one behavioral contract. Multi-agent products (e.g. aidea’s 36-agent library) need per-persona guardrail regression — role boundaries, tool discipline, harness output shape.

**Decision:** Add `evalMode: agent-matrix` with `agents[]` (per-agent URL + description + optional `sandboxContract`), `agentId` on each `TestCase`, `sandboxTimeoutMs` up to 120s, and `harness-json` contract for targets that return `{ response, toolCalls, validation }`. Scoring resolves description per agent; reports group by `agentId`.

**Consequences:** Harness eval is slower and costlier than fast-chat (fan-out 2 when `sandboxTimeoutMs` > 30s). Requires target-side eval adapter (`POST /api/eval/agent` on aidea). Phase 1 pilots three agents (12 cases in `fixtures/aidea-agent-matrix-pilot.json`). Full 36-agent matrix deferred to Phase 2 nightly CI.

---

## ADR-011: Multi-vendor scoring via Gateway BYOK

**Status:** Accepted

**Context:** Dual-tier scoring (Haiku + Sonnet) catches within-vendor calibration drift but not cross-vendor disagreement. Users with OpenAI configured in Vercel AI Gateway (BYOK) want a second judge from a different provider without adding provider SDKs or env keys to the app.

**Decision:** Add `scoringMode: multi-vendor` — parallel Sonnet (`strong`) + OpenAI (`openai/gpt-4.1`) rubric per case, routed only through `lib/ai.ts` and AI Gateway. Primary scores and flags use Sonnet; `multiModelScore.openai` stores the second judge. `/api/health` pings the `openai` tier. L3 eval gate remains dual-tier only (no live OpenAI in CI).

**Consequences:** ~2× scorer cost vs strong-only (same order as dual). Requires OpenAI BYOK in Gateway dashboard. UI surfaces vendor disagreements via `TierComparison`.
