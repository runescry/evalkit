import type { ModelTier } from '@/lib/ai';
import type { MultiModelScore, TierRubricResult } from '@/lib/types';
import {
  buildScoredTestResult,
  computeRubricTotal,
  isResultFlagged,
} from '@/agents/score-results';
import type { RubricScores, TestResult } from '@/lib/types';

export const DUAL_TIER_ALIGNMENT_THRESHOLD = 0.85;
export const MAX_TIER_FLAG_REGRESSION = 0.15;

export function tierResultFromScored(
  scores: RubricScores,
  reasoning: string,
): TierRubricResult {
  const total = computeRubricTotal(scores);
  return {
    scores,
    total,
    flagged: isResultFlagged(total),
    reasoning: reasoning.trim(),
  };
}

export function buildMultiModelScore(
  fast: TierRubricResult,
  strong: TierRubricResult,
): MultiModelScore {
  return {
    fast,
    strong,
    flagAgreement: fast.flagged === strong.flagged,
  };
}

export function buildMultiVendorScore(
  strong: TierRubricResult,
  openai: TierRubricResult,
): MultiModelScore {
  return {
    strong,
    openai,
    flagAgreement: strong.flagged === openai.flagged,
  };
}

export function applyMultiVendorScoreToResult(
  result: TestResult,
  strong: TierRubricResult,
  openai: TierRubricResult,
): TestResult {
  const primary = buildScoredTestResult(result, strong.scores, strong.reasoning);
  return {
    ...primary,
    multiModelScore: buildMultiVendorScore(strong, openai),
  };
}

export function applyDualScoreToResult(
  result: TestResult,
  fast: TierRubricResult,
  strong: TierRubricResult,
): TestResult {
  const primary = buildScoredTestResult(result, strong.scores, strong.reasoning);
  return {
    ...primary,
    multiModelScore: buildMultiModelScore(fast, strong),
  };
}

export type TierAlignmentSummary = {
  tier: ModelTier;
  alignedCases: number;
  totalCases: number;
  alignmentRate: number;
  passed: boolean;
};

export type DualTierAlignmentReport = {
  fast: TierAlignmentSummary;
  strong: TierAlignmentSummary;
  flagRegressionRate: number;
  passed: boolean;
};

export function computeFlagRegressionRate(
  cases: Array<{ fastFlagged: boolean; strongFlagged: boolean }>,
): number {
  if (cases.length === 0) {
    return 0;
  }
  const disagreements = cases.filter((c) => c.fastFlagged !== c.strongFlagged).length;
  return disagreements / cases.length;
}

export function evaluateDualTierAlignment(
  fast: TierAlignmentSummary,
  strong: TierAlignmentSummary,
  flagRegressionRate: number,
): boolean {
  return (
    fast.passed &&
    strong.passed &&
    flagRegressionRate <= MAX_TIER_FLAG_REGRESSION
  );
}
