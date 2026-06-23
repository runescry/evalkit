import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { buildScoredTestResult } from '@/agents/score-results';
import { rubricScoresSchema, testCaseSchema, testResultSchema } from '@/lib/types';

export const EVAL_ALIGNMENT_THRESHOLD = 0.85;

const groundTruthCaseSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  testCase: testCaseSchema,
  result: testResultSchema,
  mockOutput: z.object({
    scores: rubricScoresSchema,
    reasoning: z.string().min(1),
  }),
  expectedFlagged: z.boolean(),
});

const groundTruthSchema = z.object({
  version: z.string().min(1),
  description: z.string().min(1),
  cases: z.array(groundTruthCaseSchema).min(1),
});

export type GroundTruthCase = z.infer<typeof groundTruthCaseSchema>;
export type GroundTruthSet = z.infer<typeof groundTruthSchema>;

export type AlignmentCaseResult = {
  id: string;
  expectedFlagged: boolean;
  actualFlagged: boolean;
  total: number;
  aligned: boolean;
};

export type AlignmentReport = {
  version: string;
  totalCases: number;
  alignedCases: number;
  alignmentRate: number;
  passed: boolean;
  cases: AlignmentCaseResult[];
};

export function loadGroundTruth(path?: string): GroundTruthSet {
  const resolved =
    path ??
    join(dirname(fileURLToPath(import.meta.url)), '..', 'evals', 'ground-truth.json');
  const raw = JSON.parse(readFileSync(resolved, 'utf8')) as unknown;
  return groundTruthSchema.parse(raw);
}

export function scoreAlignmentForCase(testCase: GroundTruthCase): AlignmentCaseResult {
  const scored = buildScoredTestResult(
    testCase.result,
    testCase.mockOutput.scores,
    testCase.mockOutput.reasoning,
  );

  return {
    id: testCase.id,
    expectedFlagged: testCase.expectedFlagged,
    actualFlagged: scored.flagged,
    total: scored.total ?? 0,
    aligned: scored.flagged === testCase.expectedFlagged,
  };
}

export function runAlignmentEval(set: GroundTruthSet): AlignmentReport {
  const cases = set.cases.map(scoreAlignmentForCase);
  const alignedCases = cases.filter((result) => result.aligned).length;
  const alignmentRate = alignedCases / cases.length;

  return {
    version: set.version,
    totalCases: cases.length,
    alignedCases,
    alignmentRate,
    passed: alignmentRate >= EVAL_ALIGNMENT_THRESHOLD,
    cases,
  };
}
