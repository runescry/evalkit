import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { buildScoredTestResult } from '@/agents/score-results';
import {
  computeFlagRegressionRate,
  DUAL_TIER_ALIGNMENT_THRESHOLD,
  evaluateDualTierAlignment,
  type DualTierAlignmentReport,
  type TierAlignmentSummary,
} from '@/lib/multi-model-eval';
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
  /** Optional fast-tier mock; defaults to mockOutput when absent */
  fastMockOutput: z
    .object({
      scores: rubricScoresSchema,
      reasoning: z.string().min(1),
    })
    .optional(),
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

function tierSummaryFromCases(
  tier: 'fast' | 'strong',
  cases: Array<{ expectedFlagged: boolean; actualFlagged: boolean }>,
): TierAlignmentSummary {
  const alignedCases = cases.filter((c) => c.expectedFlagged === c.actualFlagged).length;
  const alignmentRate = cases.length === 0 ? 0 : alignedCases / cases.length;
  return {
    tier,
    alignedCases,
    totalCases: cases.length,
    alignmentRate,
    passed: alignmentRate >= DUAL_TIER_ALIGNMENT_THRESHOLD,
  };
}

export function runDualTierAlignmentEval(set: GroundTruthSet): DualTierAlignmentReport {
  const strongCases = set.cases.map((testCase) => {
    const scored = buildScoredTestResult(
      testCase.result,
      testCase.mockOutput.scores,
      testCase.mockOutput.reasoning,
    );
    return {
      expectedFlagged: testCase.expectedFlagged,
      actualFlagged: scored.flagged,
    };
  });

  const fastCases = set.cases.map((testCase) => {
    const fastMock = testCase.fastMockOutput ?? testCase.mockOutput;
    const scored = buildScoredTestResult(
      testCase.result,
      fastMock.scores,
      fastMock.reasoning,
    );
    return {
      expectedFlagged: testCase.expectedFlagged,
      actualFlagged: scored.flagged,
      fastFlagged: scored.flagged,
      strongFlagged: buildScoredTestResult(
        testCase.result,
        testCase.mockOutput.scores,
        testCase.mockOutput.reasoning,
      ).flagged,
    };
  });

  const fast = tierSummaryFromCases(
    'fast',
    fastCases.map((c) => ({ expectedFlagged: c.expectedFlagged, actualFlagged: c.actualFlagged })),
  );
  const strong = tierSummaryFromCases('strong', strongCases);
  const flagRegressionRate = computeFlagRegressionRate(
    fastCases.map((c) => ({ fastFlagged: c.fastFlagged, strongFlagged: c.strongFlagged })),
  );

  return {
    fast,
    strong,
    flagRegressionRate,
    passed: evaluateDualTierAlignment(fast, strong, flagRegressionRate),
  };
}
