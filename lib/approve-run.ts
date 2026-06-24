import { resumeHook } from 'workflow/api';
import { applyFixesStep, markRejectedStep } from '@/workflows/eval-run';

export type ApprovalResumeMode = 'hook' | 'direct';

function isHookNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const name = 'name' in error ? String(error.name) : '';
  const message = 'message' in error ? String(error.message).toLowerCase() : '';
  return (
    name.includes('HookNotFound') ||
    (message.includes('hook') && message.includes('not found'))
  );
}

/**
 * Resume the workflow approval hook, or run the post-approval step directly when
 * the hook is missing (expired workflow, deploy mismatch, local world gap).
 */
export async function completeRunApproval(
  runId: string,
  approved: boolean,
): Promise<ApprovalResumeMode> {
  try {
    await resumeHook(`approval:${runId}`, { approved });
    return 'hook';
  } catch (error) {
    if (!isHookNotFound(error)) {
      throw error;
    }

    if (approved) {
      await applyFixesStep(runId);
    } else {
      await markRejectedStep(runId);
    }
    return 'direct';
  }
}
