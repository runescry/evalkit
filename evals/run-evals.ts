#!/usr/bin/env tsx
import {
  EVAL_ALIGNMENT_THRESHOLD,
  loadGroundTruth,
  runAlignmentEval,
} from '../lib/eval-alignment';

const report = runAlignmentEval(loadGroundTruth());

console.log(
  `Eval alignment: ${report.alignedCases}/${report.totalCases} (${(report.alignmentRate * 100).toFixed(1)}%)`,
);

for (const mismatch of report.cases.filter((result) => !result.aligned)) {
  console.error(
    `  mismatch ${mismatch.id}: expected flagged=${mismatch.expectedFlagged}, got=${mismatch.actualFlagged} (total=${mismatch.total})`,
  );
}

if (!report.passed) {
  console.error(`L3 gate failed: need >= ${EVAL_ALIGNMENT_THRESHOLD * 100}% alignment`);
  process.exit(1);
}

console.log(`L3 gate passed (>= ${EVAL_ALIGNMENT_THRESHOLD * 100}%)`);
