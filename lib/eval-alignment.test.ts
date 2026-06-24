import { describe, expect, it } from 'vitest';
import {
  EVAL_ALIGNMENT_THRESHOLD,
  loadGroundTruth,
  runAlignmentEval,
  runDualTierAlignmentEval,
  scoreAlignmentForCase,
} from '@/lib/eval-alignment';

describe('eval alignment', () => {
  it('loads ground truth schema', () => {
    const set = loadGroundTruth();
    expect(set.cases.length).toBeGreaterThanOrEqual(10);
    expect(set.version).toBe('1.0.0');
  });

  it('aligns flagged labels for each ground truth case', () => {
    const set = loadGroundTruth();
    for (const testCase of set.cases) {
      const result = scoreAlignmentForCase(testCase);
      expect(result.aligned, `misaligned: ${testCase.id}`).toBe(true);
    }
  });

  it(`meets L3 gate of ${EVAL_ALIGNMENT_THRESHOLD * 100}% alignment`, () => {
    const report = runAlignmentEval(loadGroundTruth());
    expect(report.alignmentRate).toBeGreaterThanOrEqual(EVAL_ALIGNMENT_THRESHOLD);
    expect(report.passed).toBe(true);
  });

  it('passes dual-tier L3 gate on ground truth', () => {
    const report = runDualTierAlignmentEval(loadGroundTruth());
    expect(report.passed).toBe(true);
    expect(report.fast.passed).toBe(true);
    expect(report.strong.passed).toBe(true);
  });
});
