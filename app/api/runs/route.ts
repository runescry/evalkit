import { start } from 'workflow/api';
import { createRun, listRuns, StoreValidationError } from '@/lib/store';
import { evalRunInputSchema } from '@/lib/types';
import { evalRunWorkflow } from '@/workflows/eval-run';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const runs = await listRuns(Number.isFinite(limit) ? limit : 20);

  return Response.json({
    runs: runs.map((run) => ({
      id: run.id,
      status: run.status,
      createdAt: run.createdAt,
      description: run.input.description,
      url: run.input.url,
      caseCount: run.input.caseCount,
    })),
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = evalRunInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 },
    );
  }

  try {
    const run = await createRun(parsed.data);
    const workflowRun = await start(evalRunWorkflow, [run.id]);

    return Response.json(
      {
        id: run.id,
        workflowRunId: workflowRun.runId,
        status: run.status,
        createdAt: run.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof StoreValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to start eval run';
    return Response.json({ error: message }, { status: 500 });
  }
}
