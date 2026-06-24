import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completeRunApproval } from '@/lib/approve-run';

const resumeHookMock = vi.hoisted(() => vi.fn());
const applyFixesStepMock = vi.hoisted(() => vi.fn());
const markRejectedStepMock = vi.hoisted(() => vi.fn());

vi.mock('workflow/api', () => ({
  resumeHook: resumeHookMock,
}));

vi.mock('@/workflows/eval-run', () => ({
  applyFixesStep: applyFixesStepMock,
  markRejectedStep: markRejectedStepMock,
}));

describe('completeRunApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resumeHookMock.mockResolvedValue(undefined);
    applyFixesStepMock.mockResolvedValue(undefined);
    markRejectedStepMock.mockResolvedValue(undefined);
  });

  it('resumes the workflow hook when available', async () => {
    const mode = await completeRunApproval('run_abc', true);
    expect(mode).toBe('hook');
    expect(resumeHookMock).toHaveBeenCalledWith('approval:run_abc', { approved: true });
    expect(applyFixesStepMock).not.toHaveBeenCalled();
  });

  it('runs applyFixesStep directly when the hook is missing', async () => {
    resumeHookMock.mockRejectedValue(new Error('Hook not found for token approval:run_abc'));

    const mode = await completeRunApproval('run_abc', true);
    expect(mode).toBe('direct');
    expect(applyFixesStepMock).toHaveBeenCalledWith('run_abc');
  });

  it('runs markRejectedStep directly when the hook is missing and rejected', async () => {
    resumeHookMock.mockRejectedValue(new Error('Hook not found'));

    const mode = await completeRunApproval('run_abc', false);
    expect(mode).toBe('direct');
    expect(markRejectedStepMock).toHaveBeenCalledWith('run_abc');
  });

  it('rethrows non-hook errors', async () => {
    resumeHookMock.mockRejectedValue(new Error('Gateway unavailable'));
    await expect(completeRunApproval('run_abc', true)).rejects.toThrow('Gateway unavailable');
  });
});
