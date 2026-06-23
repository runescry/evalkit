import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const getRunMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/store', () => ({
  getRun: getRunMock,
}));

const baseRun = {
  id: 'run_stream1',
  createdAt: 1,
  status: 'running' as const,
  input: {
    url: 'https://example.com/chat',
    description: 'bot',
    caseCount: 2,
  },
  testCases: [{ id: 'tc_1', category: 'edge_case', input: 'hi', expectedBehavior: 'reply' }],
  results: [],
  report: null,
  suggestedFixes: null,
  approvedAt: null,
  error: null,
};

describe('GET /api/runs/[id]/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns text/event-stream and emits run + done events', async () => {
    getRunMock
      .mockResolvedValueOnce({ ...baseRun, status: 'running', results: [] })
      .mockResolvedValueOnce({
        ...baseRun,
        status: 'awaiting_approval',
        report: { markdown: '# Report', summary: 'Done' },
        results: [{ testCaseId: 'tc_1', total: 18, flagged: false }],
      });

    const response = await GET(new Request('http://localhost/api/runs/run_stream1/stream'), {
      params: Promise.resolve({ id: 'run_stream1' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';

    while (!accumulated.includes('event: done')) {
      await vi.advanceTimersByTimeAsync(500);
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }
      accumulated += decoder.decode(chunk.value);
    }

    expect(accumulated).toContain('event: run');
    expect(accumulated).toContain('"status":"running"');
    expect(accumulated).toContain('event: report');
    expect(accumulated).toContain('# Report');
    expect(accumulated).toContain('event: done');
    expect(accumulated).toContain('awaiting_approval');
  });

  it('emits error when run is missing', async () => {
    getRunMock.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/runs/missing/stream'), {
      params: Promise.resolve({ id: 'missing' }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const chunk = await reader.read();
    const text = decoder.decode(chunk.value);

    expect(text).toContain('event: error');
    expect(text).toContain('Run not found');
  });
});
