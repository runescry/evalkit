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
