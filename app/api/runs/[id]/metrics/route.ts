import { emptyRunMetrics } from '@/lib/observability';
import { getRun } from '@/lib/store';
import type { RunMetrics } from '@/lib/types';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export type RunMetricsResponse = {
  runId: string;
  metrics: RunMetrics;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const run = await getRun(id);

  if (!run) {
    return Response.json({ error: 'Run not found', runId: id }, { status: 404 });
  }

  const metrics = run.metrics ?? emptyRunMetrics(run.createdAt);
  const body: RunMetricsResponse = { runId: run.id, metrics };
  return Response.json(body);
}
