#!/usr/bin/env tsx
import {
  DUAL_TIER_ALIGNMENT_THRESHOLD,
  MAX_TIER_FLAG_REGRESSION,
} from '../lib/multi-model-eval';
import {
  EVAL_ALIGNMENT_THRESHOLD,
  loadGroundTruth,
  runAlignmentEval,
  runDualTierAlignmentEval,
} from '../lib/eval-alignment';

const groundTruth = loadGroundTruth();
const report = runAlignmentEval(groundTruth);
const dualReport = runDualTierAlignmentEval(groundTruth);

console.log(
  `Strong-tier alignment: ${report.alignedCases}/${report.totalCases} (${(report.alignmentRate * 100).toFixed(1)}%)`,
);
console.log(
  `Fast-tier alignment: ${dualReport.fast.alignedCases}/${dualReport.fast.totalCases} (${(dualReport.fast.alignmentRate * 100).toFixed(1)}%)`,
);
console.log(
  `Tier flag regression: ${(dualReport.flagRegressionRate * 100).toFixed(1)}% (max ${MAX_TIER_FLAG_REGRESSION * 100}%)`,
);

for (const mismatch of report.cases.filter((result) => !result.aligned)) {
  console.error(
    `  strong mismatch ${mismatch.id}: expected flagged=${mismatch.expectedFlagged}, got=${mismatch.actualFlagged} (total=${mismatch.total})`,
  );
}

let failed = false;

if (!report.passed) {
  console.error(`L3 gate failed: strong tier needs >= ${EVAL_ALIGNMENT_THRESHOLD * 100}% alignment`);
  failed = true;
}

if (!dualReport.passed) {
  console.error(
    `L3 dual-tier gate failed: each tier needs >= ${DUAL_TIER_ALIGNMENT_THRESHOLD * 100}% alignment and flag regression <= ${MAX_TIER_FLAG_REGRESSION * 100}%`,
  );
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log(`L3 gate passed (strong >= ${EVAL_ALIGNMENT_THRESHOLD * 100}%, dual-tier OK)`);
