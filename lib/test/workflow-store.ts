import type { EvalRun, EvalRunInputCreate, EvalRunUpdate } from '@/lib/types';
import { evalRunInputSchema, evalRunSchema } from '@/lib/types';

function createRunId(): string {
  return `run_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function createInMemoryWorkflowStore() {
  const runs = new Map<string, EvalRun>();

  return {
    async createRun(input: EvalRunInputCreate): Promise<EvalRun> {
      const parsedInput = evalRunInputSchema.parse(input);
      const run = evalRunSchema.parse({
        id: createRunId(),
        createdAt: Date.now(),
        status: 'pending',
        input: parsedInput,
        testCases: [],
        results: [],
        report: null,
        suggestedFixes: null,
        approvedAt: null,
        error: null,
      });
      runs.set(run.id, run);
      return run;
    },
    async getRun(runId: string): Promise<EvalRun | null> {
      return runs.get(runId) ?? null;
    },
    async updateRun(runId: string, patch: EvalRunUpdate): Promise<EvalRun> {
      const existing = runs.get(runId);
      if (!existing) {
        throw new Error(`Run not found: ${runId}`);
      }
      const merged = evalRunSchema.parse({
        ...existing,
        ...patch,
        id: existing.id,
        createdAt: existing.createdAt,
        input: existing.input,
      });
      runs.set(runId, merged);
      return merged;
    },
    reset() {
      runs.clear();
    },
  };
}
