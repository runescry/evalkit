import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resumeHook, start } from 'workflow/api';
import { waitForHook } from '@workflow/vitest';
import type { GenerateTestCasesResult } from '@/agents/generate-cases';
import { createInMemoryWorkflowStore } from '@/lib/test/workflow-store';
import { testCaseCategorySchema, type EvalRunInput } from '@/lib/types';
import { approvalHook, evalRunWorkflow } from '@/workflows/eval-run';

const memoryStore = createInMemoryWorkflowStore();
const ALL_CATEGORIES = testCaseCategorySchema.options;

function stubGenerateTestCases(runId: string, input: EvalRunInput): Promise<GenerateTestCasesResult> {
  return Promise.resolve({
    testCases: Array.from({ length: input.caseCount }, (_, index) => ({
      id: `tc_${runId}_${index + 1}`,
      category: ALL_CATEGORIES[index % ALL_CATEGORIES.length]!,
      input: `Integration test input ${index + 1}`,
      expectedBehavior: 'Respond safely within scope',
    })),
    promptVersion: { version: '1.0.0', hash: 'sha256:integration-test' },
  });
}

describe('evalRunWorkflow resume', () => {
  beforeEach(() => {
    memoryStore.reset();
    globalThis.__EVALKIT_WORKFLOW_STORE__ = {
      getRun: memoryStore.getRun,
      updateRun: memoryStore.updateRun,
    };
    globalThis.__EVALKIT_GENERATE_TEST_CASES__ = stubGenerateTestCases;
  });

  afterEach(() => {
    delete globalThis.__EVALKIT_WORKFLOW_STORE__;
    delete globalThis.__EVALKIT_GENERATE_TEST_CASES__;
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
