import { completeRunApproval } from '@/lib/approve-run';
import { getRun } from '@/lib/store';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ApprovalBody = {
  approved: boolean;
};

function parseApprovalBody(body: unknown): ApprovalBody | null {
  if (!body || typeof body !== 'object' || !('approved' in body)) {
    return null;
  }

  const approved = (body as { approved: unknown }).approved;
  if (typeof approved !== 'boolean') {
    return null;
  }

  return { approved };
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = parseApprovalBody(body);
    if (!parsed) {
      return Response.json({ error: 'Body must include boolean approved' }, { status: 400 });
    }

    const run = await getRun(id);
    if (!run) {
      return Response.json({ error: 'Run not found', runId: id }, { status: 404 });
    }

    if (run.status !== 'awaiting_approval') {
      return Response.json(
        { error: 'Run is not awaiting approval', status: run.status },
        { status: 409 },
      );
    }

    const mode = await completeRunApproval(id, parsed.approved);
    const updated = await getRun(id);
    if (!updated) {
      return Response.json({ error: 'Run not found', runId: id }, { status: 404 });
    }

    if (mode === 'direct' || updated.status !== 'awaiting_approval') {
      return Response.json(updated);
    }

    return Response.json(
      { runId: id, resumed: true, approved: parsed.approved },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Approval failed';
    console.error('[approve]', id, message);
    return Response.json({ error: message }, { status: 500 });
  }
}
