import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resumeHook, start } from 'workflow/api';
import { waitForHook } from '@workflow/vitest';
import type { BuildReportParams, BuildReportResult } from '@/agents/build-report';
import type { SuggestFixesResult } from '@/agents/suggest-fixes';
import type { GenerateTestCasesResult } from '@/agents/generate-cases';
import type { RunSandboxParams } from '@/agents/run-sandbox';
import { buildUnscoredTestResult } from '@/agents/run-sandbox';
import type { ScoreTestResultsParams, ScoreTestResultsResult } from '@/agents/score-results';
import { buildScoredTestResult } from '@/agents/score-results';
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

function stubRunSandbox(params: RunSandboxParams) {
  return Promise.resolve(
    buildUnscoredTestResult(
      params.testCase.id,
      {
        statusCode: 200,
        body: 'integration sandbox response',
        latencyMs: 3,
        timedOut: false,
        error: null,
      },
      'integration sandbox response',
    ),
  );
}

async function stubScoreResults(
  runId: string,
  params: ScoreTestResultsParams,
): Promise<ScoreTestResultsResult> {
  const results = params.results.map((result, index) =>
    buildScoredTestResult(
      result,
      {
        correctness: index === 0 ? 5 : 3,
        safety: 4,
        scopeAdherence: 4,
        confidenceCalibration: 4,
      },
      'Integration stub score',
    ),
  );

  await memoryStore.updateRun(runId, { results });

  return {
    results,
    promptVersion: { version: '1.0.0', hash: 'sha256:integration-score' },
  };
}

async function stubBuildReport(
  runId: string,
  params: BuildReportParams,
): Promise<BuildReportResult> {
  const report = {
    markdown: `# Eval report\n\nReviewed ${params.results.length} results.`,
    summary: `Reviewed ${params.results.length} results.`,
  };
  await memoryStore.updateRun(runId, { report });

  return {
    report,
    promptVersion: { version: '1.0.0', hash: 'sha256:integration-report' },
  };
}

async function stubSuggestFixes(
  runId: string,
): Promise<SuggestFixesResult> {
  return {
    fixes: [
      {
        id: `fix_${runId}_1`,
        target: 'system-prompt',
        description: 'Integration stub fix',
        diff: '--- a/prompt\n+++ b/prompt\n+integration guard',
        approved: null,
      },
    ],
    promptVersion: { version: '1.0.0', hash: 'sha256:integration-fixes' },
  };
}

describe('evalRunWorkflow resume', () => {
  beforeEach(() => {
    memoryStore.reset();
    globalThis.__EVALKIT_WORKFLOW_STORE__ = {
      getRun: memoryStore.getRun,
      updateRun: memoryStore.updateRun,
    };
    globalThis.__EVALKIT_GENERATE_TEST_CASES__ = stubGenerateTestCases;
    globalThis.__EVALKIT_RUN_SANDBOX__ = stubRunSandbox;
    globalThis.__EVALKIT_SCORE_RESULTS__ = stubScoreResults;
    globalThis.__EVALKIT_BUILD_REPORT__ = stubBuildReport;
    globalThis.__EVALKIT_SUGGEST_FIXES__ = stubSuggestFixes;
  });

  afterEach(() => {
    delete globalThis.__EVALKIT_WORKFLOW_STORE__;
    delete globalThis.__EVALKIT_GENERATE_TEST_CASES__;
    delete globalThis.__EVALKIT_RUN_SANDBOX__;
    delete globalThis.__EVALKIT_SCORE_RESULTS__;
    delete globalThis.__EVALKIT_BUILD_REPORT__;
    delete globalThis.__EVALKIT_SUGGEST_FIXES__;
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
      expect.arrayContaining([
        expect.objectContaining({
          id: `fix_${run.id}_1`,
          diff: expect.stringContaining('integration guard'),
        }),
      ]),
    );
    expect(result.testCases).toHaveLength(2);
    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toMatchObject({
      total: 17,
      flagged: false,
      reasoning: 'Integration stub score',
    });
    expect(result.promptVersions?.scoreResults).toMatchObject({
      version: '1.0.0',
      hash: 'sha256:integration-score',
    });
    expect(result.report).toMatchObject({
      markdown: expect.stringContaining('Eval report'),
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
