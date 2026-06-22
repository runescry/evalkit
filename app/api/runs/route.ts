import { start } from 'workflow/api';
import { createRun, StoreValidationError } from '@/lib/store';
import { evalRunInputSchema } from '@/lib/types';
import { evalRunWorkflow } from '@/workflows/eval-run';

export const runtime = 'nodejs';

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
