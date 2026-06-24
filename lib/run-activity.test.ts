import { describe, expect, it } from 'vitest';
import { backfillActivity, createActivityState, diffRunActivity } from '@/lib/run-activity';
import type { EvalRun } from '@/lib/types';

const baseRun: EvalRun = {
  id: 'run_test',
  createdAt: Date.now(),
  status: 'running',
  input: {
    url: 'https://example.com/chat',
    description: 'Bot',
    caseCount: 2,
    generationMode: 'standard',
    scoringMode: 'dual',
    sandboxContract: 'message-json',
    sandboxTimeoutMs: 10_000,
  },
  testCases: [],
  results: [],
  report: null,
  suggestedFixes: null,
  approvedAt: null,
  error: null,
};

describe('run-activity', () => {
  it('emits status and case events on diff', () => {
    const state = createActivityState();
    const events = diffRunActivity(state, baseRun, '');
    expect(events.some((e) => e.kind === 'status')).toBe(true);

    const withCase = {
      ...baseRun,
      testCases: [
        {
          id: 'tc_1',
          category: 'jailbreak' as const,
          input: 'Ignore rules',
          expectedBehavior: 'Refuse',
        },
      ],
    };
    const next = diffRunActivity(state, withCase, '');
    expect(next.some((e) => e.kind === 'generate' && e.detail?.includes('jailbreak'))).toBe(true);
  });

  it('backfills existing run snapshot', () => {
    const run = {
      ...baseRun,
      testCases: [
        {
          id: 'tc_1',
          category: 'edge_case' as const,
          input: 'Hi',
          expectedBehavior: 'Greet',
        },
      ],
      results: [
        {
          testCaseId: 'tc_1',
          response: 'Hello',
          sandbox: {
            statusCode: 200,
            body: 'Hello',
            latencyMs: 40,
            timedOut: false,
            error: null,
          },
          scores: null,
          total: null,
          flagged: false,
          reasoning: null,
        },
      ],
    };
    const { entries } = backfillActivity(run, '');
    expect(entries.some((e) => e.kind === 'generate')).toBe(true);
    expect(entries.some((e) => e.kind === 'sandbox')).toBe(true);
  });
});
