import { z } from 'zod';

export const testCaseCategorySchema = z.enum([
  'hallucination',
  'scope_drift',
  'jailbreak',
  'edge_case',
  'adversarial',
  'regression',
]);

export const sandboxContractSchema = z.enum(['message-json', 'harness-json']);

export const capturedToolCallSchema = z.object({
  name: z.string().min(1),
  input: z.unknown().optional(),
});

export const kbFixtureSchema = z.record(z.string(), z.unknown());

export const agentTargetSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  url: z.string().url(),
  description: z.string().min(1),
  contract: sandboxContractSchema.optional(),
  /** Per-agent KB overlay for harness-json eval (overrides defaultKbFixture). */
  kbFixture: kbFixtureSchema.optional(),
});

export const testCaseSchema = z.object({
  id: z.string().min(1),
  category: testCaseCategorySchema,
  /** Target agent when evalMode is agent-matrix. */
  agentId: z.string().min(1).optional(),
  input: z.string().min(1),
  expectedBehavior: z.string().min(1),
  scoringNotes: z.string().optional(),
  /** Per-test-case KB overlay (highest precedence). */
  kbFixture: kbFixtureSchema.optional(),
});

export const sandboxResultSchema = z.object({
  statusCode: z.number().int().nullable(),
  body: z.string().nullable(),
  latencyMs: z.number().nonnegative().nullable(),
  timedOut: z.boolean(),
  error: z.string().nullable(),
  /** True when HTTP adapter rejected prompt before model (e.g. 422 full_path_required). */
  scopeRejected: z.boolean().optional(),
  /** True when sandbox isolation failed and the response came from a direct HTTP POST. */
  unverified: z.boolean().optional(),
  contract: sandboxContractSchema.optional(),
  agentId: z.string().optional(),
  toolCalls: z.array(capturedToolCallSchema).optional(),
  structured: z.unknown().optional(),
  validationOk: z.boolean().optional(),
  /** Harness validation.errors from aidea (schema/tool discipline, not narrative hallucination). */
  validationErrors: z.array(z.string()).optional(),
  validationWarnings: z.array(z.string()).optional(),
});

export const rubricScoresSchema = z.object({
  correctness: z.number().int().min(1).max(5),
  safety: z.number().int().min(1).max(5),
  scopeAdherence: z.number().int().min(1).max(5),
  confidenceCalibration: z.number().int().min(1).max(5),
});

export const tierRubricResultSchema = z.object({
  scores: rubricScoresSchema,
  total: z.number().int().min(0).max(20),
  flagged: z.boolean(),
  reasoning: z.string(),
});

export const multiModelScoreSchema = z.object({
  fast: tierRubricResultSchema.optional(),
  strong: tierRubricResultSchema,
  openai: tierRubricResultSchema.optional(),
  flagAgreement: z.boolean(),
});

export const testResultSchema = z.object({
  testCaseId: z.string().min(1),
  response: z.string().nullable(),
  sandbox: sandboxResultSchema,
  scores: rubricScoresSchema.nullable(),
  total: z.number().int().min(0).max(20).nullable(),
  flagged: z.boolean(),
  reasoning: z.string().nullable(),
  multiModelScore: multiModelScoreSchema.optional(),
});

export const reportSchema = z.object({
  markdown: z.string(),
  summary: z.string().optional(),
});

export const promptFixSchema = z.object({
  id: z.string().min(1),
  target: z.string().min(1),
  description: z.string().min(1),
  diff: z.string(),
  approved: z.boolean().nullable(),
});

export const evalRunInputSchema = z.object({
  url: z.string().url(),
  description: z.string().min(1),
  caseCount: z.number().int().min(1).max(50),
  /** standard = fast Haiku generation; adversarial = strong-tier red-team generation */
  generationMode: z.enum(['standard', 'adversarial']).default('standard'),
  /** strong = sonnet only; dual = fast + strong; multi-vendor = sonnet + openai via Gateway BYOK */
  scoringMode: z.enum(['strong', 'dual', 'multi-vendor']).default('dual'),
  /** single = one target; agent-matrix = per-agent contracts in agents[] */
  evalMode: z.enum(['single', 'agent-matrix']).optional(),
  /** Per-agent persona contracts for agent-matrix eval. */
  agents: z.array(agentTargetSchema).min(1).optional(),
  /** Default KB overlay for harness-json eval (overridden by agent or test-case kbFixture). */
  defaultKbFixture: kbFixtureSchema.optional(),
  /** Default message-json; harness-json for POST /api/eval/agent style targets. */
  sandboxContract: sandboxContractSchema.default('message-json'),
  sandboxTimeoutMs: z.number().int().min(5_000).max(120_000).default(10_000),
});

export const runStatusSchema = z.enum([
  'pending',
  'running',
  'awaiting_approval',
  'complete',
  'failed',
]);

export const promptVersionSchema = z.object({
  version: z.string().min(1),
  hash: z.string().min(1),
});

export const stepMetricsSchema = z.object({
  step: z.string().min(1),
  latencyMs: z.number().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  totalCost: z.number().nonnegative(),
  callCount: z.number().int().nonnegative(),
  /** Gateway IDs pending cost backfill when totalCost was missing on the response. */
  generationIds: z.array(z.string().min(1)).optional(),
});

export const llmTraceMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
  format: z.enum(['text', 'json', 'markdown']).optional(),
});

export const llmTraceEntrySchema = z.object({
  id: z.string().min(1),
  step: z.string().min(1),
  tier: z.enum(['fast', 'strong', 'openai']).optional(),
  testCaseId: z.string().min(1).optional(),
  modelId: z.string().nullable().optional(),
  latencyMs: z.number().nonnegative().optional(),
  totalCost: z.number().nonnegative().nullable().optional(),
  generationId: z.string().nullable().optional(),
  messages: z.array(llmTraceMessageSchema).min(1),
});

export const runMetricsSchema = z.object({
  steps: z.array(stepMetricsSchema),
  totalCost: z.number().nonnegative(),
  totalLatencyMs: z.number().nonnegative(),
  aiCallCount: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const evalRunSchema = z.object({
  id: z.string().min(1),
  createdAt: z.number().int().nonnegative(),
  status: runStatusSchema,
  input: evalRunInputSchema,
  testCases: z.array(testCaseSchema),
  results: z.array(testResultSchema),
  report: reportSchema.nullable(),
  suggestedFixes: z.array(promptFixSchema).nullable(),
  approvedAt: z.number().int().nonnegative().nullable(),
  error: z.string().nullable(),
  promptVersions: z.record(z.string(), promptVersionSchema).optional(),
  metrics: runMetricsSchema.optional(),
  llmTrace: z.array(llmTraceEntrySchema).optional(),
});

/** Fields agents may patch via `updateRun`. */
export const evalRunUpdateSchema = evalRunSchema
  .pick({
    status: true,
    testCases: true,
    results: true,
    report: true,
    suggestedFixes: true,
    approvedAt: true,
    error: true,
    promptVersions: true,
    metrics: true,
    llmTrace: true,
  })
  .partial()
  .strict();

export type SandboxContract = z.infer<typeof sandboxContractSchema>;
export type CapturedToolCall = z.infer<typeof capturedToolCallSchema>;
export type KbFixture = z.infer<typeof kbFixtureSchema>;
export type AgentTarget = z.infer<typeof agentTargetSchema>;
export type TierRubricResult = z.infer<typeof tierRubricResultSchema>;
export type MultiModelScore = z.infer<typeof multiModelScoreSchema>;
export type TestCaseCategory = z.infer<typeof testCaseCategorySchema>;
export type TestCase = z.infer<typeof testCaseSchema>;
export type SandboxResult = z.infer<typeof sandboxResultSchema>;
export type RubricScores = z.infer<typeof rubricScoresSchema>;
export type TestResult = z.infer<typeof testResultSchema>;
export type Report = z.infer<typeof reportSchema>;
export type PromptFix = z.infer<typeof promptFixSchema>;
export type EvalRunInput = z.output<typeof evalRunInputSchema>;
export type EvalRunInputCreate = z.input<typeof evalRunInputSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
export type StepMetrics = z.infer<typeof stepMetricsSchema>;
export type LlmTraceMessage = z.infer<typeof llmTraceMessageSchema>;
export type LlmTraceEntry = z.infer<typeof llmTraceEntrySchema>;
export type RunMetrics = z.infer<typeof runMetricsSchema>;
export type EvalRun = z.infer<typeof evalRunSchema>;
export type EvalRunUpdate = z.infer<typeof evalRunUpdateSchema>;
