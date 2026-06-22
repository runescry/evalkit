import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resumeHook, start } from 'workflow/api';
import { waitForHook } from '@workflow/vitest';
import { createInMemoryWorkflowStore } from '@/lib/test/workflow-store';
import { approvalHook, evalRunWorkflow } from '@/workflows/eval-run';

const memoryStore = createInMemoryWorkflowStore();

describe('evalRunWorkflow resume', () => {
  beforeEach(() => {
    memoryStore.reset();
    globalThis.__EVALKIT_WORKFLOW_STORE__ = {
      getRun: memoryStore.getRun,
      updateRun: memoryStore.updateRun,
    };
  });

  afterEach(() => {
    delete globalThis.__EVALKIT_WORKFLOW_STORE__;
  });

  it('resumes after approval hook and completes with stub fixes', async () => {
    const run = await memoryStore.createRun({
      url: 'https://example.com/chat',
      description: 'bot',
      caseCount: 2,
    });

    const workflowRun = await start(evalRunWorkflow, [run.id]);

    await waitForHook(workflowRun, { token: `approval:${run.id}` });
    await resumeHook(`approval:${run.id}`, { approved: true });

    const result = await workflowRun.returnValue;
    expect(result.status).toBe('complete');
    expect(result.suggestedFixes).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'fix_stub_1' })]),
    );
    expect(result.testCases).toHaveLength(2);
    expect(result.results).toHaveLength(2);
    expect(result.report).toMatchObject({
      markdown: expect.stringContaining('Slice 07'),
    });
    expect(await workflowRun.status).toBe('completed');
  });

  it('completes without fixes when approval is rejected', async () => {
    const run = await memoryStore.createRun({
      url: 'https://example.com/chat',
      description: 'bot',
      caseCount: 2,
    });

    const workflowRun = await start(evalRunWorkflow, [run.id]);

    await waitForHook(workflowRun, { token: `approval:${run.id}` });
    await resumeHook(`approval:${run.id}`, { approved: false });

    const result = await workflowRun.returnValue;
    expect(result.status).toBe('complete');
    expect(result.suggestedFixes).toBeNull();
    expect(result.approvedAt).toBeNull();
  });

  it('exports a typed approval hook for Slice 08', () => {
    expect(approvalHook).toBeDefined();
    expect(typeof approvalHook.create).toBe('function');
    expect(typeof approvalHook.resume).toBe('function');
  });
});
