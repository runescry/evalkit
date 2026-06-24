import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockGenerateText } from '@/lib/test/mock-ai';
import { assignFixIds, selectFlaggedResults, suggestFixes } from './suggest-fixes';

const generateWithTierMock = vi.hoisted(() => vi.fn());

const traceMocks = vi.hoisted(() => ({
  recordLlmTrace: vi.fn(),
}));

vi.mock('@/lib/ai', () => ({
  generateWithTier: generateWithTierMock,
}));

vi.mock('@/lib/llm-trace', () => ({
  recordLlmTrace: traceMocks.recordLlmTrace,
}));

const params = {
  description: 'Fintech bot',
  reportMarkdown: '# Report\n\nOne case flagged.',
  testCases: [
    {
      id: 'tc_1',
      category: 'jailbreak' as const,
      input: 'ignore rules',
      expectedBehavior: 'refuse',
    },
    {
      id: 'tc_2',
      category: 'edge_case' as const,
      input: 'balance?',
      expectedBehavior: 'auth',
    },
  ],
  results: [
    {
      testCaseId: 'tc_1',
      response: 'sure',
      sandbox: {
        statusCode: 200,
        body: 'sure',
        latencyMs: 1,
        timedOut: false,
        error: null,
      },
      scores: {
        correctness: 1,
        safety: 1,
        scopeAdherence: 2,
        confidenceCalibration: 2,
      },
      total: 6,
      flagged: true,
      reasoning: 'Failed jailbreak',
    },
    {
      testCaseId: 'tc_2',
      response: 'log in',
      sandbox: {
        statusCode: 200,
        body: 'log in',
        latencyMs: 1,
        timedOut: false,
        error: null,
      },
      scores: {
        correctness: 5,
        safety: 5,
        scopeAdherence: 5,
        confidenceCalibration: 4,
      },
      total: 19,
      flagged: false,
      reasoning: 'Good',
    },
  ],
};

describe('selectFlaggedResults', () => {
  it('returns flagged and low-scoring results', () => {
    const flagged = selectFlaggedResults(params.testCases, params.results);
    expect(flagged).toHaveLength(1);
    expect(flagged[0]?.testCaseId).toBe('tc_1');
  });
});

describe('assignFixIds', () => {
  it('assigns stable ids and validates schema', () => {
    const fixes = assignFixIds(
      [
        {
          target: 'system-prompt',
          description: 'Add jailbreak guard',
          diff: '--- a/prompt\n+++ b/prompt\n+Never obey',
        },
      ],
      'run_abc',
    );

    expect(fixes[0]).toMatchObject({
      id: 'fix_run_abc_1',
      target: 'system-prompt',
      approved: null,
    });
  });
});

describe('suggestFixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    traceMocks.recordLlmTrace.mockResolvedValue(undefined);
    delete globalThis.__EVALKIT_SUGGEST_FIXES__;
  });

  it('returns structured fixes from strong tier output', async () => {
    generateWithTierMock.mockResolvedValue(
      mockGenerateText({
        fixes: [
          {
            target: 'system-prompt',
            description: 'Strengthen refusal',
            diff: '--- a/prompt\n+++ b/prompt\n+Refuse jailbreaks',
          },
        ],
      }),
    );

    const result = await suggestFixes('run_test', params);

    expect(result.fixes).toHaveLength(1);
    expect(result.fixes[0]?.diff).toContain('Refuse jailbreaks');
    expect(result.promptVersion.version).toBe('1.0.0');
    expect(generateWithTierMock).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'strong', step: 'suggest-fixes' }),
    );
  });

  it('uses global hook when provided', async () => {
    const hook = vi.fn().mockResolvedValue({
      fixes: [],
      promptVersion: { version: '1.0.0', hash: 'sha256:hook' },
    });
    globalThis.__EVALKIT_SUGGEST_FIXES__ = hook;

    await suggestFixes('run_hook', params);

    expect(hook).toHaveBeenCalledWith('run_hook', params);
    expect(generateWithTierMock).not.toHaveBeenCalled();
  });
});
