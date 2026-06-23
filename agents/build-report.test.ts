import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockStreamText } from '@/lib/test/mock-ai';
import { buildReport, extractReportSummary, REPORT_KV_FLUSH_CHARS } from './build-report';

const storeMocks = vi.hoisted(() => ({
  updateRun: vi.fn(),
}));

const streamWithTierMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/ai', () => ({
  streamWithTier: streamWithTierMock,
}));

vi.mock('@/workflows/store-bridge', () => ({
  updateRun: storeMocks.updateRun,
}));

const observabilityMocks = vi.hoisted(() => ({
  recordAiCallWithSpan: vi.fn(),
}));

vi.mock('@/lib/observability', () => ({
  recordAiCallWithSpan: observabilityMocks.recordAiCallWithSpan,
}));

const params = {
  description: 'Fintech support bot',
  testCases: [
    {
      id: 'tc_1',
      category: 'edge_case' as const,
      input: 'What is my balance?',
      expectedBehavior: 'Ask for auth',
    },
  ],
  results: [
    {
      testCaseId: 'tc_1',
      response: 'Please log in',
      sandbox: {
        statusCode: 200,
        body: 'Please log in',
        latencyMs: 10,
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
      reasoning: 'Good auth gate',
    },
  ],
};

describe('extractReportSummary', () => {
  it('returns first non-heading body line', () => {
    const summary = extractReportSummary('# Title\n\nOverall the bot performed well.\n\n## Details');
    expect(summary).toBe('Overall the bot performed well.');
  });
});

describe('buildReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMocks.updateRun.mockResolvedValue({});
    observabilityMocks.recordAiCallWithSpan.mockResolvedValue(undefined);
    delete globalThis.__EVALKIT_BUILD_REPORT__;
  });

  it('streams markdown and flushes incremental KV updates', async () => {
    const chunks = ['# Eval report\n\n', 'The bot ', 'handled auth well.'];
    streamWithTierMock.mockReturnValue({
      textStream: mockStreamText(chunks),
      evalkit: Promise.resolve({
        evalkitTier: 'strong',
        evalkitStep: 'build-report',
        latencyMs: 50,
        modelId: 'anthropic/claude-sonnet-4-6',
        inputTokens: 10,
        outputTokens: 20,
        totalCost: 0.001,
        generationId: 'gen-stream',
      }),
    });

    const result = await buildReport('run_test', params);

    expect(result.report.markdown).toContain('# Eval report');
    expect(result.report.summary).toContain('handled auth');
    expect(result.promptVersion.version).toBe('1.0.0');
    expect(storeMocks.updateRun).toHaveBeenCalledWith('run_test', {
      report: { markdown: '', summary: undefined },
    });
    expect(storeMocks.updateRun).toHaveBeenCalledWith(
      'run_test',
      expect.objectContaining({
        report: expect.objectContaining({
          markdown: expect.stringContaining('handled auth'),
        }),
      }),
    );
    expect(REPORT_KV_FLUSH_CHARS).toBeGreaterThan(0);
    expect(observabilityMocks.recordAiCallWithSpan).toHaveBeenCalledWith(
      'run_test',
      expect.objectContaining({ evalkitStep: 'build-report' }),
    );
  });

  it('uses global hook when provided', async () => {
    const hook = vi.fn().mockResolvedValue({
      report: { markdown: '# Hook report', summary: 'Hook' },
      promptVersion: { version: '1.0.0', hash: 'sha256:hook' },
    });
    globalThis.__EVALKIT_BUILD_REPORT__ = hook;

    const result = await buildReport('run_hook', params);

    expect(hook).toHaveBeenCalledWith('run_hook', params);
    expect(result.report.markdown).toBe('# Hook report');
    expect(streamWithTierMock).not.toHaveBeenCalled();
  });
});
