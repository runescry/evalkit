import { kv } from '@vercel/kv';
import {
  evalRunInputSchema,
  evalRunSchema,
  evalRunUpdateSchema,
  type EvalRun,
  type EvalRunInput,
  type EvalRunUpdate,
} from '@/lib/types';

export const RUN_KEY_PREFIX = 'run:';
export const RUNS_INDEX_KEY = 'runs:index';

export const DEFAULT_LIST_LIMIT = 20;

export class StoreValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoreValidationError';
  }
}

export class StoreNotFoundError extends Error {
  constructor(runId: string) {
    super(`Run not found: ${runId}`);
    this.name = 'StoreNotFoundError';
  }
}

export function runKey(runId: string): string {
  return `${RUN_KEY_PREFIX}${runId}`;
}

function createRunId(): string {
  return `run_${crypto.randomUUID().replace(/-/g, '')}`;
}

function parseRun(value: unknown, runId: string): EvalRun {
  const parsed = evalRunSchema.safeParse(value);
  if (!parsed.success) {
    throw new StoreValidationError(
      `Invalid run payload for ${runId}: ${parsed.error.issues[0]?.message ?? 'schema mismatch'}`,
    );
  }
  return parsed.data;
}

export type CreateRunParams = EvalRunInput;

export async function createRun(input: CreateRunParams): Promise<EvalRun> {
  const parsedInput = evalRunInputSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new StoreValidationError(
      parsedInput.error.issues[0]?.message ?? 'Invalid run input',
    );
  }

  const run: EvalRun = {
    id: createRunId(),
    createdAt: Date.now(),
    status: 'pending',
    input: parsedInput.data,
    testCases: [],
    results: [],
    report: null,
    suggestedFixes: null,
    approvedAt: null,
    error: null,
  };

  const validated = evalRunSchema.parse(run);
  await kv.set(runKey(validated.id), validated);
  await kv.zadd(RUNS_INDEX_KEY, { score: validated.createdAt, member: validated.id });

  return validated;
}

export async function getRun(runId: string): Promise<EvalRun | null> {
  const value = await kv.get<unknown>(runKey(runId));
  if (value == null) {
    return null;
  }
  return parseRun(value, runId);
}

export async function updateRun(runId: string, patch: EvalRunUpdate): Promise<EvalRun> {
  const parsedPatch = evalRunUpdateSchema.safeParse(patch);
  if (!parsedPatch.success) {
    throw new StoreValidationError(
      parsedPatch.error.issues[0]?.message ?? 'Invalid run update',
    );
  }

  const existing = await getRun(runId);
  if (!existing) {
    throw new StoreNotFoundError(runId);
  }

  const merged = evalRunSchema.parse({
    ...existing,
    ...parsedPatch.data,
    id: existing.id,
    createdAt: existing.createdAt,
    input: existing.input,
  });

  await kv.set(runKey(runId), merged);
  return merged;
}

export async function listRuns(limit = DEFAULT_LIST_LIMIT): Promise<EvalRun[]> {
  const boundedLimit = Math.max(1, Math.min(limit, DEFAULT_LIST_LIMIT));
  const runIds = await kv.zrange<string[]>(RUNS_INDEX_KEY, 0, boundedLimit - 1, { rev: true });

  if (!runIds?.length) {
    return [];
  }

  const runs = await Promise.all(
    runIds.map(async (id: string) => {
      const run = await getRun(id);
      return run;
    }),
  );

  return runs.filter((run: EvalRun | null): run is EvalRun => run != null);
}
