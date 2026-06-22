import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRun,
  getRun,
  listRuns,
  runKey,
  RUNS_INDEX_KEY,
  StoreNotFoundError,
  StoreValidationError,
  updateRun,
} from './store';

type ZMember = { score: number; member: string };

const mockState = vi.hoisted(() => {
  const strings = new Map<string, unknown>();
  const zsets = new Map<string, ZMember[]>();

  const kv = {
    get: vi.fn(async <T>(key: string): Promise<T | null> => {
      return (strings.get(key) as T | undefined) ?? null;
    }),
    set: vi.fn(async (key: string, value: unknown) => {
      strings.set(key, value);
    }),
    zadd: vi.fn(async (key: string, entry: ZMember | ZMember[]) => {
      const items = Array.isArray(entry) ? entry : [entry];
      const current = zsets.get(key) ?? [];
      for (const item of items) {
        const idx = current.findIndex((z) => z.member === item.member);
        if (idx >= 0) {
          current[idx] = item;
        } else {
          current.push(item);
        }
      }
      zsets.set(key, current);
    }),
    zrange: vi.fn(async <T>(
      key: string,
      start: number,
      end: number,
      options?: { rev?: boolean },
    ): Promise<T> => {
      const sorted = (zsets.get(key) ?? [])
        .slice()
        .sort((a, b) => (options?.rev ? b.score - a.score : a.score - b.score));
      const members = sorted.slice(start, end + 1).map((z) => z.member);
      return members as T;
    }),
  };

  return { strings, zsets, kv };
});

vi.mock('@vercel/kv', () => ({ kv: mockState.kv }));

describe('lib/store CRUD', () => {
  beforeEach(() => {
    mockState.strings.clear();
    mockState.zsets.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a run with Zod-validated defaults and indexes it', async () => {
    const run = await createRun({
      url: 'https://support.example-fintech.com/chat',
      description: 'Fintech support bot',
      caseCount: 10,
    });

    expect(run.status).toBe('pending');
    expect(run.testCases).toEqual([]);
    expect(mockState.kv.set).toHaveBeenCalledWith(runKey(run.id), run);
    expect(mockState.kv.zadd).toHaveBeenCalledWith(RUNS_INDEX_KEY, {
      score: run.createdAt,
      member: run.id,
    });

    const stored = await getRun(run.id);
    expect(stored).toEqual(run);
  });

  it('rejects invalid create input', async () => {
    await expect(
      createRun({
        url: 'https://example.com',
        description: '',
        caseCount: 0,
      }),
    ).rejects.toBeInstanceOf(StoreValidationError);
  });

  it('updates allowed fields and rejects invalid patches', async () => {
    const run = await createRun({
      url: 'https://example.com/chat',
      description: 'desc',
      caseCount: 5,
    });

    const updated = await updateRun(run.id, {
      status: 'running',
      testCases: [
        {
          id: 'tc_1',
          category: 'edge_case',
          input: 'hello',
          expectedBehavior: 'stay in scope',
        },
      ],
    });

    expect(updated.status).toBe('running');
    expect(updated.testCases).toHaveLength(1);
    expect(updated.input).toEqual(run.input);

    await expect(updateRun(run.id, { id: 'hijack' } as never)).rejects.toBeInstanceOf(
      StoreValidationError,
    );
    await expect(updateRun('missing', { status: 'failed' })).rejects.toBeInstanceOf(
      StoreNotFoundError,
    );
  });

  it('lists runs newest-first with default limit 20', async () => {
    const first = await createRun({
      url: 'https://a.example/chat',
      description: 'first',
      caseCount: 3,
    });
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = await createRun({
      url: 'https://b.example/chat',
      description: 'second',
      caseCount: 3,
    });

    const listed = await listRuns();
    expect(listed.map((r) => r.id)).toEqual([second.id, first.id]);
    expect(listed[0]!.createdAt).toBeGreaterThanOrEqual(listed[1]!.createdAt);
  });

  it('caps listRuns limit at 20', async () => {
    for (let i = 0; i < 25; i += 1) {
      await createRun({
        url: `https://example-${i}.com/chat`,
        description: `run ${i}`,
        caseCount: 1,
      });
    }

    const listed = await listRuns(100);
    expect(listed).toHaveLength(20);
  });

  it('keeps p99 store latency under 50ms locally (mocked KV)', async () => {
    const samples: number[] = [];

    for (let i = 0; i < 100; i += 1) {
      const started = performance.now();
      const run = await createRun({
        url: 'https://perf.example/chat',
        description: 'perf',
        caseCount: 1,
      });
      await getRun(run.id);
      await listRuns(5);
      samples.push(performance.now() - started);
    }

    samples.sort((a, b) => a - b);
    const p99 = samples[Math.floor(samples.length * 0.99)] ?? 0;
    expect(p99).toBeLessThan(50);
  });
});
