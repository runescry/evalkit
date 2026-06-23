import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const storeMocks = vi.hoisted(() => ({
  getRun: vi.fn(),
}));

vi.mock('@/lib/store', () => ({
  getRun: storeMocks.getRun,
}));

const sampleMetrics = {
  steps: [
    {
      step: 'generate-test-cases',
      latencyMs: 200,
      inputTokens: 100,
      outputTokens: 50,
      totalCost: 0.002,
      callCount: 1,
    },
    {
      step: 'run-sandbox',
      latencyMs: 1500,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
      callCount: 0,
    },
  ],
  totalCost: 0.002,
  totalLatencyMs: 1700,
  aiCallCount: 1,
  updatedAt: 99,
};

const sampleRun = {
  id: 'run_metrics1',
  createdAt: 1,
  status: 'awaiting_approval' as const,
  input: {
    url: 'https://example.com/chat',
    description: 'Support bot',
    caseCount: 2,
  },
  testCases: [],
  results: [],
  report: { markdown: '# Report', summary: 'ok' },
  suggestedFixes: null,
  approvedAt: null,
  error: null,
  metrics: sampleMetrics,
};

describe('GET /api/runs/[id]/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMocks.getRun.mockResolvedValue(sampleRun);
  });

  it('returns run metrics with cost breakdown', async () => {
    const response = await GET(new Request('http://localhost/api/runs/run_metrics1/metrics'), {
      params: Promise.resolve({ id: 'run_metrics1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.runId).toBe('run_metrics1');
    expect(body.metrics.totalCost).toBe(0.002);
    expect(body.metrics.steps).toHaveLength(2);
    expect(body.metrics.steps[0].step).toBe('generate-test-cases');
  });

  it('returns empty metrics when run has none yet', async () => {
    storeMocks.getRun.mockResolvedValue({ ...sampleRun, metrics: undefined });

    const response = await GET(new Request('http://localhost/api/runs/run_metrics1/metrics'), {
      params: Promise.resolve({ id: 'run_metrics1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.metrics.totalCost).toBe(0);
    expect(body.metrics.steps).toEqual([]);
    expect(body.metrics.updatedAt).toBe(sampleRun.createdAt);
  });

  it('returns 404 when run is missing', async () => {
    storeMocks.getRun.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/runs/run_missing/metrics'), {
      params: Promise.resolve({ id: 'run_missing' }),
    });

    expect(response.status).toBe(404);
  });
});
