#!/usr/bin/env npx tsx
/**
 * Replay a failed eval run from KV snapshot.
 *
 * Usage: npx tsx scripts/replay-run.ts <runId>
 */

import { getRun } from '../lib/store';

const runId = process.argv[2];

if (!runId) {
  console.error('Usage: npx tsx scripts/replay-run.ts <runId>');
  process.exit(1);
}

const run = await getRun(runId);

if (!run) {
  console.error(`Run not found: ${runId}`);
  process.exit(1);
}

console.log(JSON.stringify(run, null, 2));
