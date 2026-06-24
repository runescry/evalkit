import { describe, expect, it } from 'vitest';
import { getPipelineProgress, isStaleRun } from '@/lib/run-pipeline';
import type { EvalRun } from '@/lib/types';

function baseRun(overrides: Partial<EvalRun> = {}): EvalRun {
  return {
    id: 'run_test',
    createdAt: Date.now(),
    status: 'running',
    input: {
      url: 'https://example.com/chat',
      description: 'Bot',
      caseCount: 3,
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
    ...overrides,
  };
}

describe('getPipelineProgress', () => {
  it('marks generate as active at start', () => {
    const progress = getPipelineProgress(baseRun({ status: 'pending' }));
    expect(progress.activeStepId).toBe('generate');
    expect(progress.isActive).toBe(true);
  });

  it('advances to sandbox when cases exist', () => {
    const progress = getPipelineProgress(
      baseRun({
        testCases: [
          { id: 'tc_1', category: 'edge_case', input: 'hi', expectedBehavior: 'ok' },
        ],
      }),
    );
    expect(progress.steps.find((s) => s.id === 'generate')?.state).toBe('complete');
    expect(progress.activeStepId).toBe('sandbox');
  });

  it('advances to score when sandbox results exist', () => {
    const progress = getPipelineProgress(
      baseRun({
        testCases: [
          { id: 'tc_1', category: 'edge_case', input: 'hi', expectedBehavior: 'ok' },
        ],
        results: [
          {
            testCaseId: 'tc_1',
            response: 'hello',
            sandbox: {
              statusCode: 200,
              body: 'hello',
              latencyMs: 1,
              timedOut: false,
              error: null,
            },
            scores: null,
            total: null,
            flagged: false,
            reasoning: null,
          },
        ],
      }),
    );
    expect(progress.activeStepId).toBe('score');
  });

  it('detects stale runs with no cases after threshold', () => {
    const stale = baseRun({
      status: 'running',
      createdAt: Date.now() - 4 * 60 * 1000,
    });
    expect(isStaleRun(stale)).toBe(true);
    expect(isStaleRun(baseRun({ testCases: [{ id: 'tc_1', category: 'edge_case', input: 'x', expectedBehavior: 'y' }] }))).toBe(false);
  });
});
