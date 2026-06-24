import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const storeMocks = vi.hoisted(() => ({
  getRun: vi.fn(),
}));

const approveMocks = vi.hoisted(() => ({
  completeRunApproval: vi.fn(),
}));

vi.mock('@/lib/store', () => ({
  getRun: storeMocks.getRun,
}));

vi.mock('@/lib/approve-run', () => ({
  completeRunApproval: approveMocks.completeRunApproval,
}));

const awaitingRun = {
  id: 'run_approve1',
  createdAt: 1,
  status: 'awaiting_approval' as const,
  input: {
    url: 'https://example.com/chat',
    description: 'bot',
    caseCount: 2,
  },
  testCases: [],
  results: [],
  report: { markdown: '# Report', summary: 'ok' },
  suggestedFixes: null,
  approvedAt: null,
  error: null,
};

describe('POST /api/runs/[id]/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    approveMocks.completeRunApproval.mockResolvedValue('hook');
    storeMocks.getRun.mockReset();
    storeMocks.getRun
      .mockResolvedValueOnce(awaitingRun)
      .mockResolvedValueOnce(awaitingRun);
  });

  it('returns 202 when workflow hook resumes asynchronously', async () => {
    const request = new Request('http://localhost/api/runs/run_approve1/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ approved: true }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'run_approve1' }) });
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(approveMocks.completeRunApproval).toHaveBeenCalledWith('run_approve1', true);
    expect(body).toEqual({ runId: 'run_approve1', resumed: true, approved: true });
  });

  it('returns completed run when approval finishes inline', async () => {
    approveMocks.completeRunApproval.mockResolvedValue('direct');
    storeMocks.getRun.mockReset();
    storeMocks.getRun
      .mockResolvedValueOnce(awaitingRun)
      .mockResolvedValueOnce({ ...awaitingRun, status: 'complete', approvedAt: 99, suggestedFixes: [] });

    const request = new Request('http://localhost/api/runs/run_approve1/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ approved: true }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'run_approve1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('complete');
  });

  it('returns 500 with error message when approval throws', async () => {
    approveMocks.completeRunApproval.mockRejectedValue(new Error('AI Gateway rate limit'));
    storeMocks.getRun.mockReset();
    storeMocks.getRun.mockResolvedValue(awaitingRun);

    const request = new Request('http://localhost/api/runs/run_approve1/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ approved: true }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'run_approve1' }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain('rate limit');
  });

  it('returns 409 when run is not awaiting approval', async () => {
    storeMocks.getRun.mockReset();
    storeMocks.getRun.mockResolvedValue({ ...awaitingRun, status: 'running' });

    const request = new Request('http://localhost/api/runs/run_approve1/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ approved: true }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'run_approve1' }) });
    expect(response.status).toBe(409);
    expect(approveMocks.completeRunApproval).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid body', async () => {
    const request = new Request('http://localhost/api/runs/run_approve1/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ approved: 'yes' }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'run_approve1' }) });
    expect(response.status).toBe(400);
  });
});
