import { describe, expect, it } from 'vitest';
import { runKey, RUN_KEY_PREFIX, RUNS_INDEX_KEY } from './store';
import { evalRunSchema } from './types';

describe('lib/store helpers', () => {
  it('builds run keys with prefix', () => {
    expect(runKey('run_abc')).toBe(`${RUN_KEY_PREFIX}run_abc`);
    expect(RUNS_INDEX_KEY).toBe('runs:index');
  });

  it('rejects invalid eval run payloads', () => {
    const result = evalRunSchema.safeParse({
      id: 'run_1',
      createdAt: Date.now(),
      status: 'pending',
      input: { url: 'not-a-url', description: 'x', caseCount: 1 },
      testCases: [],
      results: [],
      report: null,
      suggestedFixes: null,
      approvedAt: null,
      error: null,
    });
    expect(result.success).toBe(false);
  });
});
