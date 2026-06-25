export type ArchitectureTab =
  | 'workflow'
  | 'pipeline'
  | 'backend-map'
  | 'decisions'
  | 'infrastructure'
  | 'eval-types';

export type WorkflowInfraChoice = {
  name: string;
  why: string;
  /** Backend map node id for cross-link */
  backendNodeId?: string;
};

export type WorkflowStepEntry = {
  id: string;
  label: string;
  icon: string;
  color: string;
  /** Workflow SDK step function name when applicable */
  workflowStep?: string;
  doesWhat: string;
  /** Implementation-level bullets — what actually executes in this step */
  technicalDetails?: string[];
  infrastructure: WorkflowInfraChoice[];
  kvWrites: string[];
  codePaths: string[];
  relatedAdrs?: string[];
  branchNote?: string;
};

export type VercelTradeoffEntry = {
  component: string;
  whyVercel: string;
  vsBuildYourOwn: string;
  tradeoff: string;
  backendNodeId?: string;
};

export type PipelineStage = {
  id: string;
  label: string;
  icon: string;
  color: string;
  tier?: string;
  v1Approach: string;
  productionApproach: string;
  antiPattern: string;
  adrIds: string[];
  infra: string[];
};

export type AdrEntry = {
  id: string;
  title: string;
  status: 'Accepted' | 'Deferred';
  context: string;
  decision: string;
  consequences: string[];
};

export type InfraLayer = {
  layer: string;
  components: Array<{ name: string; role: string; why: string }>;
};

export type EvalTypeEntry = {
  id: string;
  name: string;
  tagline: string;
  evalKitMapping: string;
  pitfalls: string[];
};

export type BackendMapLayer =
  | 'edge'
  | 'orchestration'
  | 'ai'
  | 'isolation'
  | 'storage'
  | 'observability';

export type BackendMapNode = {
  id: string;
  label: string;
  layer: BackendMapLayer;
  color: string;
  interviewLine: string;
  whatHappens: string;
  vsBuildYourOwn?: string;
  tradeoff?: string;
  codePaths: string[];
  relatedAdrs?: string[];
  uiPointer?: string;
};

export type BackendFlowEdge = {
  from: string;
  to: string;
  label?: string;
};

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'input',
    label: 'URL + contract',
    icon: '📋',
    color: '#78716c',
    v1Approach:
      'User pastes target POST endpoint and behavioral description, or starts the agent-matrix pilot preset. Shared toggles: case count, standard/adversarial generation, dual/strong scoring.',
    productionApproach:
      'Saved eval profiles, API keys, team templates, regression baselines per product surface.',
    antiPattern: 'Vague descriptions that cause the generator to probe out-of-scope features (422 storms).',
    adrIds: ['ADR-009', 'ADR-010'],
    infra: ['EvalStartForm', 'demo-presets.ts', 'Zod validation', 'KV input snapshot'],
  },
  {
    id: 'generate',
    label: 'Generate cases',
    icon: '🧪',
    color: '#5c7c5c',
    tier: 'fast (standard) · strong (adversarial)',
    v1Approach:
      'Structured LLM output across six categories. Adversarial mode uses Sonnet red-team prompts for harder jailbreaks and social engineering.',
    productionApproach:
      'Semantic dedup across runs, customer-specific golden sets, category quotas from incident data.',
    antiPattern: 'Using Sonnet for every run when fast Haiku generation is sufficient for smoke evals.',
    adrIds: ['ADR-003', 'ADR-009'],
    infra: ['AI Gateway', 'claude-haiku-4-5', 'claude-sonnet-4-6', 'lib/prompts.ts hashes'],
  },
  {
    id: 'sandbox',
    label: 'Sandbox fan-out',
    icon: '🔒',
    color: '#0d9488',
    v1Approach:
      'One Vercel Sandbox per case. Fan-out 5 for fast-chat (10s); fan-out 2 for harness-json (up to 90s). Contracts: message-json `{ message }` or harness-json `{ agentId, mission, kbFixture }`. Unverified HTTP fallback on infra failure.',
    productionApproach:
      'Customer VPC connectors, allowlisted egress, signed webhook callbacks, per-tenant sandbox pools.',
    antiPattern: 'Sequential calls — slow and allows shared-state leakage between cases.',
    adrIds: ['ADR-002', 'ADR-007', 'ADR-010'],
    infra: ['@vercel/sandbox', 'agents/run-sandbox.ts', 'lib/agent-matrix.ts', 'unverified flag'],
  },
  {
    id: 'score',
    label: 'Rubric score',
    icon: '⚖️',
    color: '#b45309',
    tier: 'strong primary · dual optional',
    v1Approach:
      'Four dimensions × 1–5 (total /20, flag < 14). Dual mode scores fast + strong in parallel and stores tier disagreement.',
    productionApproach:
      'Custom rubrics per customer, human calibration loops, L3 regression gate in CI.',
    antiPattern: 'Trusting a single cheap judge for high-stakes compliance without strong-tier confirmation.',
    adrIds: ['ADR-003', 'ADR-009'],
    infra: ['agents/score-results.ts', 'multiModelScore', 'evals/ground-truth.json'],
  },
  {
    id: 'report',
    label: 'Stream report',
    icon: '📡',
    color: '#7c3aed',
    v1Approach:
      'Strong model streams markdown via SSE poll of KV. Client shows partial report + pipeline progress.',
    productionApproach:
      'PDF export, Slack/email delivery, executive summary tier, trend comparison vs prior runs.',
    antiPattern: 'Blocking UI until the full report finishes — 30s spinner kills trust.',
    adrIds: ['ADR-005'],
    infra: ['SSE /api/runs/[id]/stream', 'react-markdown', 'build-report agent'],
  },
  {
    id: 'approval',
    label: 'Human gate',
    icon: '🛡️',
    color: '#dc2626',
    v1Approach:
      'Workflow suspends at awaiting_approval. User explicitly approves before fix suggester runs.',
    productionApproach:
      'RBAC, audit log, SSO, policy rules for auto-reject on critical safety failures.',
    antiPattern: 'Auto-applying prompt patches to production without human review.',
    adrIds: ['ADR-006', 'ADR-008'],
    infra: ['Workflow hook', 'POST /api/runs/[id]/approve', 'ApprovalCard UI'],
  },
  {
    id: 'fixes',
    label: 'Suggest fixes',
    icon: '🔧',
    color: '#2563eb',
    tier: 'strong',
    v1Approach: 'Unified diffs for prompt changes based on flagged findings. Operator copies into their repo.',
    productionApproach: 'GitHub PR bot, prompt registry integration, canary re-eval before merge.',
    antiPattern: 'Generating fixes when the eval description mismatched the endpoint contract.',
    adrIds: ['ADR-006'],
    infra: ['agents/suggest-fixes.ts', 'FixSuggestions component'],
  },
];

/** Durable workflow steps — what runs, infrastructure choice, and KV writes at each stage. */
export const WORKFLOW_OVERVIEW = {
  title: 'Workflow SDK execution model',
  bullets: [
    'next.config.ts uses withWorkflow() — Workflow SDK compiles "use workflow" / "use step" functions into durable steps.',
    'evalRunWorkflow (use workflow) is the orchestrator; it must stay deterministic — side effects live inside use step functions.',
    'Each use step checkpoint persists its return value; on retry the step body re-runs but completed steps are skipped (testCases[] flows generate → sandbox).',
    'Steps set maxRetries = 3; transient failures throw RetryableError with retryAfter: 2^attempt × 1000ms. FatalError (e.g. run not found) does not retry.',
    'approvalHook.defineHook + hook.create({ token: `approval:${runId}` }) suspends the workflow until resumeHook from POST /api/runs/[id]/approve.',
    'KV (run:{id}) is the UI read model — workflow steps call updateRun incrementally; SSE /stream polls KV every 400ms (not workflow-native push).',
    'workflows/store-bridge.ts injects __EVALKIT_WORKFLOW_STORE__ in tests so steps never hit live KV in unit/integration.',
    'Debug locally: npx workflow web — inspect step completion and hook state (see docs/RUNBOOK.md).',
  ],
};

/** Build vs buy — for Vercel interviewer "why this primitive?" */
export const VERCEL_TRADEOFFS: VercelTradeoffEntry[] = [
  {
    component: 'Workflow SDK',
    whyVercel:
      'Multi-minute eval runs need checkpointed steps, exponential retry, and durable human-in-the-loop suspend — not a fire-and-forget API route.',
    vsBuildYourOwn: 'Temporal / BullMQ + workers + custom state machine + idempotency keys per step.',
    tradeoff: 'Node.js runtime only (not Edge); vendor coupling vs operating orchestration yourself.',
    backendNodeId: 'workflow',
  },
  {
    component: 'Fluid Compute',
    whyVercel:
      'Bursty pipeline: idle during 90s harness calls, spike during sandbox fan-out and dual scoring — pay for active compute between steps.',
    vsBuildYourOwn: 'Always-on container or cold-start-heavy vanilla serverless without workflow-aware scheduling.',
    tradeoff: 'Less machine-shape control than raw K8s; right-sized for demo and preview deploys.',
    backendNodeId: 'fluid',
  },
  {
    component: 'Vercel Sandbox',
    whyVercel:
      'EvalKit POSTs user-supplied URLs with adversarial prompts — SSRF risk if fetch runs in the main app process.',
    vsBuildYourOwn: 'Per-job Docker on ECS/Fargate — you own images, networking, teardown, and regional quotas.',
    tradeoff: 'Quota-sensitive; ADR-007 direct HTTP fallback with sandbox.unverified when Sandbox.create fails.',
    backendNodeId: 'sandbox',
  },
  {
    component: 'AI Gateway',
    whyVercel:
      'Six agent steps share tier routing, provider fallback on 429, and unified generationId/cost via gateway.getGenerationInfo.',
    vsBuildYourOwn: 'Per-provider SDKs in every agent + custom retry + scattered billing.',
    tradeoff: 'Extra hop; single control plane in lib/ai.ts is worth it for model arbitrage (Haiku → Flash → Sonnet).',
    backendNodeId: 'ai-gateway',
  },
  {
    component: 'Vercel KV',
    whyVercel:
      'Run document is a single JSON blob polled by UI/SSE — write-heavy incremental updates between workflow steps.',
    vsBuildYourOwn: 'Postgres + migrations for a document-shaped access pattern with no joins in v1.',
    tradeoff: 'No cross-run semantic search yet (ADR-004); add pgvector when dedup/history queries matter.',
    backendNodeId: 'kv',
  },
];

export const WORKFLOW_STEPS: WorkflowStepEntry[] = [
  {
    id: 'trigger',
    label: 'Start run',
    icon: '▶',
    color: '#78716c',
    doesWhat:
      'User submits the form or API body. Zod validates input, createRun writes KV, Workflow SDK starts evalRunWorkflow on Fluid Compute.',
    infrastructure: [
      { name: 'Next.js server action / API', why: 'Thin trigger — no orchestration logic here', backendNodeId: 'api-routes' },
      { name: 'Fluid Compute', why: 'API route spins up on demand', backendNodeId: 'fluid' },
      { name: 'Zod + lib/store.ts', why: 'Validated EvalRunInput snapshot before workflow', backendNodeId: 'kv' },
      { name: 'workflow/api start', why: 'Hands off to durable eval-run.ts', backendNodeId: 'workflow' },
    ],
    kvWrites: ['run:{id} created (status pending)', 'runs:index member added'],
    codePaths: ['app/actions/create-run.ts', 'app/api/runs/route.ts', 'lib/store.ts'],
    relatedAdrs: ['ADR-001', 'ADR-004'],
    technicalDetails: [
      'createRun: kv.set(run:{id}) + kv.zadd(runs:index) before workflow starts — UI can redirect immediately.',
      'start(evalRunWorkflow, [run.id]) from workflow/api returns { workflowRunId } (201 from POST /api/runs).',
      'API routes export runtime = "nodejs" — Workflow SDK is not Edge-compatible.',
      'No orchestration in the route handler; evalRunWorkflow owns the state machine.',
    ],
  },
  {
    id: 'generate-test-cases',
    label: 'Generate cases',
    icon: '🧪',
    color: '#5c7c5c',
    workflowStep: 'generateTestCasesStep',
    doesWhat:
      'LLM produces structured test cases (six categories). Standard mode uses fast tier; adversarial uses strong red-team prompts. Agent-matrix mode includes agentId per case.',
    infrastructure: [
      { name: 'Workflow SDK step', why: 'Checkpointed — safe to retry on 429', backendNodeId: 'workflow' },
      { name: 'AI Gateway (fast/strong)', why: 'Haiku for volume; Sonnet when adversarial', backendNodeId: 'ai-gateway' },
      { name: 'agents/generate-cases.ts', why: 'Structured output via AI SDK + lib/prompts.ts hash', backendNodeId: 'agents' },
      { name: 'OpenTelemetry', why: 'Step span + per-call cost into metrics', backendNodeId: 'observability' },
    ],
    kvWrites: ['status → running', 'testCases[]', 'promptVersions.generateCases'],
    codePaths: ['workflows/eval-run.ts', 'agents/generate-cases.ts', 'lib/prompts.ts'],
    relatedAdrs: ['ADR-003', 'ADR-009', 'ADR-010'],
    technicalDetails: [
      '"use step" on generateTestCasesStep — return value TestCase[] is checkpointed as step output.',
      'observeWorkflowStep(runId, "generate-test-cases") → OTel span evalkit.workflow.generate-test-cases.',
      'generateTestCases → generateWithTier + AI SDK Output.object({ schema }) for Zod-validated cases.',
      'Tier: fast (Haiku) unless input.generationMode === "adversarial" → strong (Sonnet).',
      'On 429/5xx: RetryableError("generate-test-cases: …", { retryAfter: 2^attempt × 1000ms }), maxRetries 3.',
    ],
  },
  {
    id: 'run-sandbox',
    label: 'Sandbox fan-out',
    icon: '🔒',
    color: '#0d9488',
    workflowStep: 'runSandboxStep',
    doesWhat:
      'Fan-out: one Vercel Sandbox microVM per case (5 concurrent fast-chat, 2 for harness >30s). POST message-json or harness-json to target URL; parse toolCalls and validation for matrix mode.',
    infrastructure: [
      { name: 'Workflow SDK step', why: 'Single step wraps entire fan-out batch', backendNodeId: 'workflow' },
      { name: 'Vercel Sandbox', why: 'SSRF isolation — outbound fetch only', backendNodeId: 'sandbox' },
      { name: 'lib/agent-matrix.ts', why: 'Per-agent URL, kbFixture, harness body', backendNodeId: 'agent-matrix' },
      { name: 'Unverified fallback', why: 'Direct HTTP if Sandbox quota fails (ADR-007)', backendNodeId: 'sandbox' },
    ],
    kvWrites: ['results[] (sandbox payload per case, incremental in loop)'],
    codePaths: ['agents/run-sandbox.ts', 'lib/sandbox-response.ts', 'lib/agent-matrix.ts'],
    relatedAdrs: ['ADR-002', 'ADR-007', 'ADR-010'],
    technicalDetails: [
      'One workflow step wraps the entire fan-out — not one use step per test case (batch inside runSandboxStep).',
      'runTestCasesInSandbox: batches of Promise.all with concurrency = sandboxFanoutForInput (5 or 2).',
      'Per case: Sandbox.create({ timeout: sandboxTimeoutMs, runtime: "node22" }) → runCommand node -e fetch script → sandbox.stop().',
      'Env passed to sandbox: EVALKIT_TARGET_URL, EVALKIT_REQUEST_BODY (JSON), EVALKIT_TIMEOUT_MS.',
      'On Sandbox.create failure: executeDirectHttpRequest from app process → sandbox.unverified: true (ADR-007).',
      'KV write once at step end: updateRun({ results }) — UI sees all sandbox results after step completes.',
      'recordStepLatency: true on observeWorkflowStep — wall-clock for whole fan-out in run metrics.',
    ],
  },
  {
    id: 'score-results',
    label: 'Rubric score',
    icon: '⚖️',
    color: '#b45309',
    workflowStep: 'scoreResultsStep',
    doesWhat:
      'LLM-as-judge scores each case on four rubric dimensions. Dual mode runs fast + strong judges in parallel; flag if total < 14. Per-agent description for matrix runs.',
    infrastructure: [
      { name: 'AI Gateway (strong / dual)', why: 'Sonnet for judgment; dual catches tier drift', backendNodeId: 'ai-gateway' },
      { name: 'agents/score-results.ts', why: 'Structured rubric output; incremental KV per case', backendNodeId: 'agents' },
      { name: 'lib/multi-model-eval.ts', why: 'Tier disagreement surfaced in UI', backendNodeId: 'agents' },
    ],
    kvWrites: ['results[].scores, total, flagged, reasoning', 'promptVersions.scoreResults'],
    codePaths: ['agents/score-results.ts', 'lib/prompts.ts', 'lib/multi-model-eval.ts'],
    relatedAdrs: ['ADR-003', 'ADR-009'],
    technicalDetails: [
      'Loop over results[] — after each case: updateRun({ results: [...updatedResults] }) for live UI progress.',
      'scoringMode "dual": Promise.all([score fast, score strong]) per case; flag uses strong tier, stores multiModelScore.',
      'scoringMode "multi-vendor": Promise.all([score strong, score openai]) per case; Sonnet primary, OpenAI second judge.',
      'scoreSingleResult → generateWithTier + Output.object({ scores, reasoning }); RUBRIC_FLAG_THRESHOLD = 14.',
      'Per matrix case: descriptionForTestCase resolves agent.description from agents[] map.',
      'Step return value is scored TestResult[]; promptVersions.scoreResults hash stored separately.',
    ],
  },
  {
    id: 'build-report',
    label: 'Stream report',
    icon: '📡',
    color: '#7c3aed',
    workflowStep: 'buildReportStep',
    doesWhat:
      'Strong model streams markdown report into KV. Client polls run + subscribes to SSE for partial tokens — no 30s blank spinner.',
    infrastructure: [
      { name: 'AI Gateway (strong)', why: 'Sonnet streams synthesis', backendNodeId: 'ai-gateway' },
      { name: 'agents/build-report.ts', why: 'Stream chunks to KV during generation', backendNodeId: 'agents' },
      { name: 'SSE /api/runs/[id]/stream', why: 'Browser receives report tokens live', backendNodeId: 'browser-ui' },
      { name: 'Vercel KV', why: 'Poll-friendly run document between chunks', backendNodeId: 'kv' },
    ],
    kvWrites: ['report.markdown (streaming)', 'report.summary', 'promptVersions.buildReport'],
    codePaths: ['agents/build-report.ts', 'app/api/runs/[id]/stream/route.ts', 'components/run-report-view.tsx'],
    relatedAdrs: ['ADR-005'],
    technicalDetails: [
      'streamWithTier({ tier: "strong", step: "build-report" }) — AI SDK textStream, not workflow streaming.',
      'Every REPORT_KV_FLUSH_CHARS (120) chars: updateRun({ report: { markdown, summary } }) — SSE pollers see partial markdown.',
      'GET /stream: ReadableStream polls getRun(id) every 400ms, emits run + report SSE events until terminal status.',
      'Terminal statuses: awaiting_approval | complete | failed → enqueue done and close stream.',
      'After stream ends: recordAiCallWithSpan merges Gateway cost into run.metrics.',
    ],
  },
  {
    id: 'await-approval',
    label: 'Human gate',
    icon: '🛡️',
    color: '#dc2626',
    workflowStep: 'markAwaitingApprovalStep + approvalHook',
    doesWhat:
      'Workflow suspends on approvalHook until POST /api/runs/[id]/approve. User reviews flagged findings before any prompt-fix generation.',
    infrastructure: [
      { name: 'Workflow SDK hook', why: 'Durable suspend — survives deploy mid-run', backendNodeId: 'workflow' },
      { name: 'POST /approve', why: 'Resumes hook with approved: true/false', backendNodeId: 'api-routes' },
      { name: 'ApprovalCard UI', why: 'Explicit human gate in run report', backendNodeId: 'browser-ui' },
    ],
    kvWrites: ['status → awaiting_approval'],
    codePaths: ['workflows/eval-run.ts', 'app/api/runs/[id]/approve/route.ts', 'components/approval-card.tsx'],
    relatedAdrs: ['ADR-006', 'ADR-008'],
    technicalDetails: [
      'markAwaitingApprovalStep: updateRun({ status: "awaiting_approval" }) — UI enables ApprovalCard.',
      'In evalRunWorkflow: using hook = approvalHook.create({ token: `approval:${runId}` }); await hook suspends.',
      'Workflow process is durable-suspended — no compute billed while waiting for human (Fluid value).',
      'POST /approve: validates status === awaiting_approval, then resumeHook(`approval:${id}`, { approved: boolean }).',
      'Hook resume is idempotent from workflow’s view; 409 if approve called when not awaiting_approval.',
    ],
  },
  {
    id: 'apply-fixes',
    label: 'Suggest fixes',
    icon: '🔧',
    color: '#2563eb',
    workflowStep: 'applyFixesStep | markRejectedStep',
    branchNote: 'Only runs applyFixesStep when approved; otherwise markRejectedStep completes without diffs.',
    doesWhat:
      'If approved: strong model proposes unified prompt diffs from flagged cases. If rejected: run completes with report only — no fix generation.',
    infrastructure: [
      { name: 'AI Gateway (strong)', why: 'Diff quality needs Sonnet', backendNodeId: 'ai-gateway' },
      { name: 'agents/suggest-fixes.ts', why: 'Structured PromptFix[] with diffs', backendNodeId: 'agents' },
    ],
    kvWrites: ['suggestedFixes[] (if approved)', 'approvedAt', 'status → complete'],
    codePaths: ['agents/suggest-fixes.ts', 'components/fix-suggestions.tsx'],
    relatedAdrs: ['ADR-006'],
    technicalDetails: [
      'Branch inside evalRunWorkflow after hook resolves — not a separate hook.',
      'applyFixesStep: suggestFixes → generateWithTier strong → PromptFix[] with unified diffs.',
      'markRejectedStep: status complete, approvedAt null — report retained, no suggestedFixes.',
      'On any uncaught error in evalRunWorkflow: markFailedStep(runId, message) then rethrow.',
      'loadRunStep returns final EvalRun document from KV after branch completes.',
    ],
  },
];

export const ADR_ENTRIES: AdrEntry[] = [
  {
    id: 'ADR-001',
    title: 'Workflow SDK over a simple queue',
    status: 'Accepted',
    context: 'Eval runs have 15–50 steps and can take minutes. Server restarts must not lose progress.',
    decision: 'Use Vercel Workflow SDK with checkpointed steps and approval hooks.',
    consequences: ['Durable orchestration', 'Node.js runtime only — not Edge', 'Webhook routes for resume'],
  },
  {
    id: 'ADR-002',
    title: 'Fan-out sandboxes',
    status: 'Accepted',
    context: 'Sequential sandbox calls are too slow; shared state between cases invalidates results.',
    decision: 'One Vercel Sandbox per test case; max 5 concurrent; tear down after capture.',
    consequences: ['Better isolation and speed', 'Higher parallelism cost', 'Quota-sensitive at scale'],
  },
  {
    id: 'ADR-003',
    title: 'Two model tiers via AI Gateway',
    status: 'Accepted',
    context: 'Test generation is structured and high-volume; scoring needs judgment.',
    decision: 'fast (Haiku/Flash) for generation; strong (Sonnet) for scoring, reports, fixes.',
    consequences: ['~8× cost savings on generation', 'Single routing layer in lib/ai.ts', 'Escalation on 429/500'],
  },
  {
    id: 'ADR-004',
    title: 'No vector DB for test cases',
    status: 'Accepted',
    context: 'No semantic search over historical cases in v1.',
    decision: 'Vercel KV only for run documents and index.',
    consequences: ['Simple ops', 'No cross-run semantic dedup yet', 'Revisit pgvector when needed'],
  },
  {
    id: 'ADR-005',
    title: 'Stream report for perceived performance',
    status: 'Accepted',
    context: '30s spinner hurts trust; report is the LCP element.',
    decision: 'SSE stream from build-report step; skeleton + live progress for CLS ≈ 0.',
    consequences: ['Better perceived latency', 'Client handles partial markdown', 'Poll + stream hybrid'],
  },
  {
    id: 'ADR-006',
    title: 'Human-in-the-loop before prompt fixes',
    status: 'Accepted',
    context: 'Auto-applying prompt changes is unsafe for enterprise users.',
    decision: 'Workflow suspends at awaiting_approval; fixes require explicit POST /approve.',
    consequences: ['Safer for enterprise', 'Blocks until operator acts', 'Clear UX gate'],
  },
  {
    id: 'ADR-007',
    title: 'Sandbox fallback with unverified flag',
    status: 'Accepted',
    context: 'Sandbox creation can fail on quota or regional outage.',
    decision: 'Direct HTTP POST fallback with sandbox.unverified: true.',
    consequences: ['Evals still complete', 'Lower trust on unverified rows', 'Operators must notice flag'],
  },
  {
    id: 'ADR-008',
    title: 'Auth deferred post-v1',
    status: 'Deferred',
    context: 'API keys and rate limiting add overhead before core loop validation.',
    decision: 'Ship v1 without auth middleware.',
    consequences: ['Deploy behind Vercel protection', 'Slice 14 backlog', 'Trusted workspaces only'],
  },
  {
    id: 'ADR-009',
    title: 'Multi-model eval and adversarial generation',
    status: 'Accepted',
    context: 'Single-tier scoring can miss calibration drift; standard cases may miss sophisticated attacks.',
    decision: 'Optional adversarial generation (strong) and dual scoring (fast + strong).',
    consequences: [
      'Dual scoring doubles scorer cost',
      'Tier disagreement visible in UI',
      'L3 gate checks per-tier alignment',
    ],
  },
  {
    id: 'ADR-010',
    title: 'Agent-matrix persona eval',
    status: 'Accepted',
    context: 'Single-URL eval only tests one contract; multi-agent products need per-persona guardrails.',
    decision:
      'evalMode agent-matrix with agents[], harness-json sandbox, per-agent scoring and grouped reports.',
    consequences: [
      'Lower fan-out for long harness timeouts',
      'Requires target eval adapter',
      'Phase 1 pilots three agents',
    ],
  },
];

export const INFRA_LAYERS: InfraLayer[] = [
  {
    layer: 'Compute & deploy',
    components: [
      {
        name: 'Fluid Compute',
        role: 'vercel.json fluid: true',
        why: 'Scale-to-zero between bursty workflow steps — pay for active compute, not idle server time',
      },
      { name: 'iad1 region', role: 'Primary deploy region', why: 'Co-locate with KV and sandbox egress' },
    ],
  },
  {
    layer: 'Edge & UI',
    components: [
      { name: 'Next.js 15', role: 'App Router, RSC, server actions', why: 'Vercel-native deploy target' },
      { name: 'React 19', role: 'Client islands for report stream + diagrams', why: 'SSE subscriptions' },
      { name: 'Tailwind 4', role: 'Parchment & Sage theme', why: 'Consistent product chrome' },
    ],
  },
  {
    layer: 'Orchestration',
    components: [
      { name: 'Workflow SDK', role: 'eval-run.ts durable pipeline', why: 'Checkpoint + approval hook' },
      { name: 'Vercel KV', role: 'run:{id}, runs:index', why: 'Low-latency run state for SSE poll' },
    ],
  },
  {
    layer: 'AI & agents',
    components: [
      {
        name: 'AI Gateway',
        role: 'Tier routing + provider fallback in lib/ai.ts',
        why: 'Model arbitrage: Haiku primary, Flash/Sonnet fallback on 429; unified billing via gateway.getGenerationInfo',
      },
      { name: 'AI SDK v6', role: 'Structured output, streaming', why: 'Zod-validated agent steps' },
      { name: '6 agents', role: 'generate · sandbox · score · report · fixes', why: 'Single-responsibility steps' },
    ],
  },
  {
    layer: 'Isolation & targets',
    components: [
      { name: 'Vercel Sandbox', role: 'Per-case execution', why: 'SSRF containment' },
      {
        name: 'Target HTTP',
        role: 'message-json or harness-json POST',
        why: 'Fast-chat adapters and agent-matrix harness endpoints',
      },
    ],
  },
  {
    layer: 'Observability',
    components: [
      {
        name: 'OpenTelemetry',
        role: 'lib/observability.ts',
        why: 'Per-step spans; target URL logged as domain only; AI cost rolled into run metrics',
      },
    ],
  },
  {
    layer: 'Quality gates',
    components: [
      { name: 'L3 evals', role: 'evals/run-evals.ts', why: 'Scorer alignment regression' },
      { name: 'npm run gates', role: 'unit · contract · crud · integration · build', why: 'Trunk protection' },
    ],
  },
];

/** One-liners for interview cheat sheet (Backend map tab). */
export const BACKEND_CHEAT_SHEET: string[] = [
  'Fluid Compute (vercel.json) — bursty eval workflows scale between steps; pay for active compute.',
  'AI Gateway (lib/ai.ts) — fast vs strong tiers; Haiku primary with Flash/Sonnet fallback on 429.',
  'Workflow SDK — durable checkpointed steps; approval hook blocks fixes until POST /approve.',
  'Vercel Sandbox — one microVM per test case; SSRF containment with unverified HTTP fallback.',
  'Vercel KV — run:{id} document polled by SSE; incremental results between workflow steps.',
  'Human gate — awaiting_approval status before suggest-fixes runs on flagged cases.',
];

export const BACKEND_MAP_NODES: BackendMapNode[] = [
  {
    id: 'browser-ui',
    label: 'Browser / UI',
    layer: 'edge',
    color: '#78716c',
    interviewLine:
      'The UI is thin — server actions start runs, then the run page polls KV and subscribes to SSE for live report tokens.',
    whatHappens:
      'EvalStartForm posts to createRunAction or startPresetRunAction. RunReportView fetches /api/runs/[id], subscribes to /api/runs/[id]/stream, and renders progress, activity, flagged findings, and cost.',
    codePaths: [
      'components/eval-start-form.tsx',
      'components/run-report-view.tsx',
      'app/actions/create-run.ts',
    ],
    uiPointer: 'Home → Start eval; Run page → Live activity + Report',
  },
  {
    id: 'api-routes',
    label: 'API routes',
    layer: 'edge',
    color: '#5c7c5c',
    interviewLine:
      'POST /api/runs validates input with Zod, writes KV, and starts the Workflow — the API is a thin trigger, not the orchestrator.',
    whatHappens:
      'GET /api/runs lists recent runs. POST /api/runs creates a run and calls workflow/api start. Stream and approve routes resume or gate the pipeline.',
    codePaths: ['app/api/runs/route.ts', 'app/api/runs/[id]/route.ts', 'app/api/runs/[id]/stream/route.ts'],
    relatedAdrs: ['ADR-001'],
  },
  {
    id: 'fluid',
    label: 'Fluid Compute',
    layer: 'orchestration',
    color: '#64748b',
    interviewLine:
      'Hosted on Fluid Compute for cost reduction — scale-to-zero between workflow steps instead of a always-on server.',
    whatHappens:
      'vercel.json sets fluid: true. API routes and Workflow steps run on demand in iad1; idle time between eval steps does not hold dedicated capacity.',
    vsBuildYourOwn:
      'Fixed-size ECS/K8s pool sized for peak sandbox fan-out — pays for idle during 90s harness waits.',
    tradeoff: 'Less control than raw K8s autoscaling policies; right for bursty eval + hook suspend periods.',
    codePaths: ['vercel.json'],
    relatedAdrs: ['ADR-001'],
  },
  {
    id: 'workflow',
    label: 'Workflow SDK',
    layer: 'orchestration',
    color: '#57534e',
    interviewLine:
      'Durable orchestration via Workflow SDK — each agent step is checkpointed so a deploy or restart does not lose a 12-case eval.',
    whatHappens:
      'eval-run.ts sequences generate → sandbox fan-out → score → stream report → approval hook → optional suggest-fixes. Steps retry with backoff; FatalError stops the run.',
    vsBuildYourOwn:
      'Temporal/BullMQ + worker fleet + custom idempotency and hook resume plumbing.',
    tradeoff: 'Node-only runtime; withWorkflow() in next.config; hook token must match resumeHook exactly.',
    codePaths: ['workflows/eval-run.ts', 'workflows/store-bridge.ts'],
    relatedAdrs: ['ADR-001', 'ADR-006'],
    uiPointer: 'Run page → Eval in progress pipeline bar',
  },
  {
    id: 'ai-gateway',
    label: 'AI Gateway',
    layer: 'ai',
    color: '#b45309',
    interviewLine:
      'All LLM calls route through AI Gateway for model arbitrage — Haiku for generation, Sonnet for scoring, with provider fallback on 429.',
    whatHappens:
      'lib/ai.ts generateWithTier and streamWithTier use gateway(primary) with TIER_MODELS fallbacks. gateway.getGenerationInfo resolves per-call cost when missing from the response. Observability records step-level spend.',
    vsBuildYourOwn: 'Direct Anthropic/OpenAI SDKs per agent with duplicated retry and billing aggregation.',
    tradeoff: 'Gateway tags evalkit.tier + evalkit.step on every call for Observability filters.',
    codePaths: ['lib/ai.ts', 'lib/observability.ts'],
    relatedAdrs: ['ADR-003', 'ADR-009'],
    uiPointer: 'Run page → Cost & latency card',
  },
  {
    id: 'agents',
    label: 'Agents',
    layer: 'ai',
    color: '#5c7c5c',
    interviewLine:
      'Six single-purpose agent modules — generate, sandbox, score, report, fixes — each with versioned prompts hashed in KV.',
    whatHappens:
      'generate-cases uses fast or strong tier by mode. score-results supports dual-tier parallel judges. build-report streams markdown. Prompt templates live in lib/prompts.ts with stable hashes on the run.',
    codePaths: [
      'agents/generate-cases.ts',
      'agents/score-results.ts',
      'agents/build-report.ts',
      'agents/suggest-fixes.ts',
      'lib/prompts.ts',
    ],
    relatedAdrs: ['ADR-003', 'ADR-009'],
  },
  {
    id: 'sandbox',
    label: 'Vercel Sandbox',
    layer: 'isolation',
    color: '#0d9488',
    interviewLine:
      'Each test case runs in its own Vercel Sandbox microVM — outbound fetch only, containing SSRF risk from adversarial prompts.',
    whatHappens:
      'run-sandbox.ts creates a Sandbox per case, runs a Node fetch script with the target URL and JSON body, parses the response. On quota failure, direct HTTP POST sets sandbox.unverified.',
    vsBuildYourOwn: 'Same-process fetch (SSRF) or self-managed Firecracker/Docker job queue.',
    tradeoff: 'VERCEL_OIDC_TOKEN for Sandbox locally via vercel env pull; fan-out capped at 5/2 for quota.',
    codePaths: ['agents/run-sandbox.ts', 'lib/sandbox-response.ts'],
    relatedAdrs: ['ADR-002', 'ADR-007'],
    uiPointer: 'Run page → Live activity (HTTP status lines)',
  },
  {
    id: 'agent-matrix',
    label: 'Agent-matrix',
    layer: 'isolation',
    color: '#0d9488',
    interviewLine:
      'Persona matrix mode POSTs harness-json to per-agent URLs with kbFixture — dry-run tools, toolCalls and validation feed the rubric.',
    whatHappens:
      'lib/agent-matrix.ts resolves per-case URL, contract, and kbFixture. buildSandboxRequestBody sends agentId, mission, realWorldMode dry-run. Pilot: inbox-triage + two directors via aidea /api/eval/agent.',
    codePaths: [
      'lib/agent-matrix.ts',
      'fixtures/aidea-agent-matrix-pilot.json',
      'docs/AIDEA-PERSONA-EVAL-HANDOFF.md',
    ],
    relatedAdrs: ['ADR-010'],
    uiPointer: 'Home → Run agent-matrix pilot; Eval patterns tab → Persona matrix',
  },
  {
    id: 'kv',
    label: 'Vercel KV',
    layer: 'storage',
    color: '#7c3aed',
    interviewLine:
      'Run state lives in Vercel KV — the workflow writes incrementally so the UI can poll partial results during long sandbox phases.',
    whatHappens:
      'lib/store.ts createRun/updateRun/getRun persist EvalRun documents at run:{id}. runs:index sorted set powers recent runs. Workflow steps call updateRun after each agent.',
    vsBuildYourOwn: 'Postgres row per run with JSONB column — migrations and connection pool for document polling.',
    tradeoff: 'Full document rewrite on each updateRun; fine at v1 scale, not a query/analytics store.',
    codePaths: ['lib/store.ts', 'lib/types.ts'],
    relatedAdrs: ['ADR-004'],
    uiPointer: 'Sidebar → Recent runs',
  },
  {
    id: 'observability',
    label: 'Observability',
    layer: 'observability',
    color: '#4338ca',
    interviewLine:
      'OpenTelemetry spans per workflow step; target URLs logged as domain only; AI Gateway cost aggregated into run metrics.',
    whatHappens:
      'observeWorkflowStep wraps each workflow step. recordAiCallWithSpan merges gateway cost into RunMetrics on the run document. Description hashed — no PII in spans.',
    codePaths: ['lib/observability.ts', 'components/run-cost-summary.tsx'],
    uiPointer: 'Run page → Cost & latency',
  },
];

export const BACKEND_FLOW_EDGES: BackendFlowEdge[] = [
  { from: 'browser-ui', to: 'api-routes' },
  { from: 'api-routes', to: 'workflow' },
  { from: 'fluid', to: 'api-routes', label: 'hosts' },
  { from: 'fluid', to: 'workflow', label: 'hosts' },
  { from: 'workflow', to: 'agents' },
  { from: 'agents', to: 'ai-gateway' },
  { from: 'workflow', to: 'sandbox' },
  { from: 'workflow', to: 'agent-matrix' },
  { from: 'workflow', to: 'kv' },
  { from: 'agents', to: 'kv' },
  { from: 'agents', to: 'observability' },
];

/** Ordered node ids for the horizontal flow strip (excludes cross-cutting fluid). */
export const BACKEND_FLOW_ORDER: string[] = [
  'browser-ui',
  'api-routes',
  'workflow',
  'agents',
  'ai-gateway',
  'sandbox',
  'agent-matrix',
  'kv',
  'observability',
];

export const EVAL_TYPE_ENTRIES: EvalTypeEntry[] = [
  {
    id: 'adversarial',
    name: 'Adversarial / red-team',
    tagline: 'Probe jailbreaks, scope drift, social engineering',
    evalKitMapping: 'Default case categories + optional adversarial generation mode (strong tier).',
    pitfalls: ['Unbounded attack space', 'Description must match endpoint capabilities'],
  },
  {
    id: 'judge',
    name: 'LLM-as-judge',
    tagline: 'Rubric scoring when ground truth is subjective',
    evalKitMapping: 'Four-dimension rubric; dual-tier to catch judge drift.',
    pitfalls: ['Judge bias', 'Dual tier adds cost but surfaces disagreement'],
  },
  {
    id: 'regression',
    name: 'Regression suite',
    tagline: 'Fixed cases on every prompt/model change',
    evalKitMapping: 'L3 ground-truth gate + rerunnable KV-stored runs.',
    pitfalls: ['Suite rot if not updated with real failures'],
  },
  {
    id: 'trajectory',
    name: 'Deployed HTTP eval',
    tagline: 'Score real responses from a live endpoint',
    evalKitMapping: 'Sandbox fan-out hits deployed URL; scores raw body.',
    pitfalls: ['422 if description encourages out-of-scope tool prompts'],
  },
  {
    id: 'persona-matrix',
    name: 'Persona matrix',
    tagline: 'Per-agent guardrails across a multi-agent workforce',
    evalKitMapping:
      'evalMode agent-matrix + agents[] + harness-json sandbox; toolCalls and validation in rubric.',
    pitfalls: [
      'Requires target eval adapter with dry-run tools',
      'Full library matrix is expensive — tier rollout (P0–P3)',
    ],
  },
];

// Legacy node graph (used for data-flow mini map)
export type ArchitectureNodeKind =
  | 'user'
  | 'api'
  | 'workflow'
  | 'agent'
  | 'storage'
  | 'infra'
  | 'external';

export type ArchitectureNode = {
  id: string;
  label: string;
  kind: ArchitectureNodeKind;
  summary: string;
  decision?: string;
  tradeoffs?: string[];
  infra?: string[];
  x: number;
  y: number;
};

export const KIND_COLORS: Record<ArchitectureNodeKind, string> = {
  user: '#92400e',
  api: '#5c7c5c',
  workflow: '#57534e',
  agent: '#0d9488',
  storage: '#7c3aed',
  infra: '#64748b',
  external: '#4338ca',
};
