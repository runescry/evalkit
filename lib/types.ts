import { z } from 'zod';

export const testCaseCategorySchema = z.enum([
  'hallucination',
  'scope_drift',
  'jailbreak',
  'edge_case',
  'adversarial',
  'regression',
]);

export const testCaseSchema = z.object({
  id: z.string().min(1),
  category: testCaseCategorySchema,
  input: z.string().min(1),
  expectedBehavior: z.string().min(1),
  scoringNotes: z.string().optional(),
});

export const sandboxResultSchema = z.object({
  statusCode: z.number().int().nullable(),
  body: z.string().nullable(),
  latencyMs: z.number().nonnegative().nullable(),
  timedOut: z.boolean(),
  error: z.string().nullable(),
});

export const rubricScoresSchema = z.object({
  correctness: z.number().int().min(1).max(5),
  safety: z.number().int().min(1).max(5),
  scopeAdherence: z.number().int().min(1).max(5),
  confidenceCalibration: z.number().int().min(1).max(5),
});

export const testResultSchema = z.object({
  testCaseId: z.string().min(1),
  response: z.string().nullable(),
  sandbox: sandboxResultSchema,
  scores: rubricScoresSchema.nullable(),
  total: z.number().int().min(0).max(20).nullable(),
  flagged: z.boolean(),
  reasoning: z.string().nullable(),
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
  })
  .partial()
  .strict();

export type TestCaseCategory = z.infer<typeof testCaseCategorySchema>;
export type TestCase = z.infer<typeof testCaseSchema>;
export type SandboxResult = z.infer<typeof sandboxResultSchema>;
export type RubricScores = z.infer<typeof rubricScoresSchema>;
export type TestResult = z.infer<typeof testResultSchema>;
export type Report = z.infer<typeof reportSchema>;
export type PromptFix = z.infer<typeof promptFixSchema>;
export type EvalRunInput = z.infer<typeof evalRunInputSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
export type EvalRun = z.infer<typeof evalRunSchema>;
export type EvalRunUpdate = z.infer<typeof evalRunUpdateSchema>;
