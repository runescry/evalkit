#!/usr/bin/env node
/** Runs vitest; exits 0 with N/A message when no test files exist yet. */
import { spawnSync } from 'node:child_process';

const suite = process.argv[2] ?? 'unknown';
const configFlag = process.argv[3];

const result = spawnSync('npx', ['vitest', 'run', '--config', configFlag], {
  stdio: 'pipe',
  encoding: 'utf-8',
});

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
if (result.status === 0) {
  process.stdout.write(result.stdout ?? '');
  process.exit(0);
}

if (output.includes('No test files found')) {
  console.log(`${suite}: N/A (no tests yet — ok for early slices)`);
  process.exit(0);
}

process.stderr.write(result.stderr ?? '');
process.stdout.write(result.stdout ?? '');
process.exit(result.status ?? 1);
