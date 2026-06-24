import { resumeHook } from 'workflow/api';
import { getRun } from '@/lib/store';
import { waitForRunAfterApproval } from '@/lib/run-pipeline';

export const runtime = 'nodejs';
export const maxDuration = 120;

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

  await resumeHook(`approval:${id}`, { approved: parsed.approved });

  const updated = await waitForRunAfterApproval(() => getRun(id));
  if (!updated) {
    return Response.json({ error: 'Run not found', runId: id }, { status: 404 });
  }

  return Response.json(updated);
}
