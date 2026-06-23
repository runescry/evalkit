import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getRunById } from './[id]/route';
import { GET, POST } from './route';

const storeMocks = vi.hoisted(() => ({
  createRun: vi.fn(),
  getRun: vi.fn(),
  listRuns: vi.fn(),
}));

const startMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/store', () => ({
  createRun: storeMocks.createRun,
  getRun: storeMocks.getRun,
  listRuns: storeMocks.listRuns,
  StoreValidationError: class StoreValidationError extends Error {
    name = 'StoreValidationError';
  },
}));

vi.mock('workflow/api', () => ({
  start: startMock,
}));

const sampleRun = {
  id: 'run_abc123',
  createdAt: 1_700_000_000_000,
  status: 'pending' as const,
  input: {
    url: 'https://example.com/chat',
    description: 'Support bot',
    caseCount: 5,
  },
  testCases: [],
  results: [],
  report: null,
  suggestedFixes: null,
  approvedAt: null,
  error: null,
};

describe('POST /api/runs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMocks.createRun.mockResolvedValue(sampleRun);
    startMock.mockResolvedValue({ runId: 'wrun_testworkflow' });
  });

  it('creates a run and starts the workflow', async () => {
    const request = new Request('http://localhost/api/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sampleRun.input),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      id: sampleRun.id,
      workflowRunId: 'wrun_testworkflow',
      status: 'pending',
      createdAt: sampleRun.createdAt,
    });
    expect(storeMocks.createRun).toHaveBeenCalledWith(sampleRun.input);
    expect(startMock).toHaveBeenCalledWith(expect.any(Function), [sampleRun.id]);
  });

  it('returns 400 for invalid JSON', async () => {
    const request = new Request('http://localhost/api/runs', {
      method: 'POST',
      body: 'not-json',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid input', async () => {
    const request = new Request('http://localhost/api/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'bad', description: '', caseCount: 0 }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

describe('GET /api/runs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMocks.listRuns.mockResolvedValue([sampleRun]);
  });

  it('returns recent runs summary', async () => {
    const response = await GET(new Request('http://localhost/api/runs?limit=5'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.runs).toHaveLength(1);
    expect(body.runs[0]).toMatchObject({
      id: sampleRun.id,
      status: 'pending',
      description: sampleRun.input.description,
    });
    expect(storeMocks.listRuns).toHaveBeenCalledWith(5);
  });
});

describe('GET /api/runs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns run status when found', async () => {
    storeMocks.getRun.mockResolvedValue({ ...sampleRun, status: 'running' });

    const response = await getRunById(new Request('http://localhost/api/runs/run_abc123'), {
      params: Promise.resolve({ id: sampleRun.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(sampleRun.id);
    expect(body.status).toBe('running');
  });

  it('returns 404 when run is missing', async () => {
    storeMocks.getRun.mockResolvedValue(null);

    const response = await getRunById(new Request('http://localhost/api/runs/missing'), {
      params: Promise.resolve({ id: 'missing' }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Run not found');
    expect(body.runId).toBe('missing');
  });
});
