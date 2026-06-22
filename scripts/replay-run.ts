#!/usr/bin/env npx tsx
/**
 * Replay a failed eval run from KV snapshot.
 * Stub — wired in Slice 02 when lib/store.ts exists.
 *
 * Usage: npx tsx scripts/replay-run.ts <runId>
 */

const runId = process.argv[2];

if (!runId) {
  console.error('Usage: npx tsx scripts/replay-run.ts <runId>');
  process.exit(1);
}

console.log(`[replay-run] Stub: would load run:${runId} from KV (Slice 02)`);
process.exit(0);
