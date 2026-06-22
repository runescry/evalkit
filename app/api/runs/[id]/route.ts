import { getRun } from '@/lib/store';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const run = await getRun(id);

  if (!run) {
    return Response.json({ error: 'Run not found', runId: id }, { status: 404 });
  }

  return Response.json(run);
}
