import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const storeMocks = vi.hoisted(() => ({
  getRun: vi.fn(),
}));

const resumeHookMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/store', () => ({
  getRun: storeMocks.getRun,
}));

vi.mock('workflow/api', () => ({
  resumeHook: resumeHookMock,
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
    storeMocks.getRun
      .mockResolvedValueOnce(awaitingRun)
      .mockResolvedValueOnce({ ...awaitingRun, status: 'complete', approvedAt: 99 });
    resumeHookMock.mockResolvedValue(undefined);
  });

  it('resumes approval hook and returns updated run', async () => {
    const request = new Request('http://localhost/api/runs/run_approve1/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ approved: true }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'run_approve1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(resumeHookMock).toHaveBeenCalledWith('approval:run_approve1', { approved: true });
    expect(body.status).toBe('complete');
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
    expect(resumeHookMock).not.toHaveBeenCalled();
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
