import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseApprovalResponse, pollRunAfterApproval } from '@/lib/poll-run-after-approval';
import type { EvalRun } from '@/lib/types';

function mockRun(status: EvalRun['status']): EvalRun {
  return {
    id: 'run_poll',
    createdAt: 1,
    status,
    input: {
      url: 'https://example.com/chat',
      description: 'bot',
      caseCount: 1,
      generationMode: 'standard',
      scoringMode: 'strong',
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
}

describe('poll-run-after-approval', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parseApprovalResponse handles 202 resumed payload', async () => {
    const response = new Response(JSON.stringify({ runId: 'run_poll', resumed: true, approved: true }), {
      status: 202,
    });
    const parsed = await parseApprovalResponse(response);
    expect(parsed).toEqual({ resumed: true });
  });

  it('parseApprovalResponse handles completed run payload', async () => {
    const response = new Response(JSON.stringify({ id: 'run_poll', status: 'complete' }), {
      status: 200,
    });
    const parsed = await parseApprovalResponse(response);
    expect(parsed.run?.status).toBe('complete');
    expect(parsed.resumed).toBe(false);
  });

  it('parseApprovalResponse surfaces API errors without throwing on empty body', async () => {
    const response = new Response('', { status: 504 });
    const parsed = await parseApprovalResponse(response);
    expect(parsed.resumed).toBe(false);
    expect(parsed.error).toContain('504');
  });

  it('pollRunAfterApproval waits until status changes', async () => {
    vi.useFakeTimers();
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        const status = calls < 3 ? 'awaiting_approval' : 'complete';
        return new Response(JSON.stringify(mockRun(status)), { status: 200 });
      }),
    );

    const promise = pollRunAfterApproval('run_poll', 10_000);
    await vi.runAllTimersAsync();
    const run = await promise;

    expect(run.status).toBe('complete');
    expect(calls).toBeGreaterThanOrEqual(3);
    vi.useRealTimers();
  });
});
