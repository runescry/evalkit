import { APPROVAL_POLL_MS } from '@/lib/run-pipeline';
import type { EvalRun } from '@/lib/types';

export const APPROVAL_CLIENT_WAIT_MS = 120_000;

export async function fetchRunClient(runId: string): Promise<EvalRun> {
  const response = await fetch(`/api/runs/${runId}`);
  if (!response.ok) {
    throw new Error(`Failed to refresh run (${response.status})`);
  }
  const text = await response.text();
  if (!text.trim()) {
    throw new Error('Empty response while refreshing run');
  }
  return JSON.parse(text) as EvalRun;
}

/** Poll until workflow leaves awaiting_approval after resumeHook. */
export async function pollRunAfterApproval(
  runId: string,
  deadlineMs = APPROVAL_CLIENT_WAIT_MS,
): Promise<EvalRun> {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    const run = await fetchRunClient(runId);
    if (run.status !== 'awaiting_approval') {
      return run;
    }
    await new Promise((resolve) => setTimeout(resolve, APPROVAL_POLL_MS));
  }
  throw new Error(
    'Fix generation is taking longer than expected. Refresh the page in a moment to see results.',
  );
}

export async function parseApprovalResponse(response: Response): Promise<{
  resumed: boolean;
  run?: EvalRun;
  error?: string;
}> {
  const text = await response.text();
  if (!text.trim()) {
    return { resumed: false, error: `Approval failed (${response.status})` };
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { resumed: false, error: 'Invalid response from approval API' };
  }

  if (!response.ok) {
    const error =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Approval failed (${response.status})`;
    return { resumed: false, error };
  }

  if (response.status === 202 && body && typeof body === 'object' && 'resumed' in body) {
    return { resumed: Boolean((body as { resumed: unknown }).resumed) };
  }

  if (body && typeof body === 'object' && 'status' in body) {
    return { resumed: false, run: body as EvalRun };
  }

  return { resumed: false, error: 'Unexpected approval response' };
}
