import { FatalError, RetryableError, defineHook, getStepMetadata } from 'workflow';
import { generateTestCases } from '@/agents/generate-cases';
import { runTestCasesInSandbox } from '@/agents/run-sandbox';
import { scoreTestResults } from '@/agents/score-results';
import { getRun, updateRun } from './store-bridge';
import type { EvalRun, TestCase, TestResult } from '@/lib/types';

export const approvalHook = defineHook<{ approved: boolean }>();

const STEP_MAX_RETRIES = 3;

function rethrowWithBackoff(error: unknown, label: string): never {
  const { attempt } = getStepMetadata();
  const delay = 2 ** attempt * 1000;
  const message = error instanceof Error ? error.message : String(error);
  throw new RetryableError(`${label}: ${message}`, { retryAfter: delay });
}

export async function generateTestCasesStep(runId: string): Promise<TestCase[]> {
  'use step';

  try {
    await updateRun(runId, { status: 'running' });
    const run = await getRun(runId);
    if (!run) {
      throw new FatalError(`Run not found: ${runId}`);
    }

    const { testCases, promptVersion } = await generateTestCases(runId, run.input);
    await updateRun(runId, {
      testCases,
      promptVersions: { generateCases: promptVersion },
    });
    return testCases;
  } catch (error) {
    if (error instanceof FatalError) {
      throw error;
    }
    rethrowWithBackoff(error, 'generate-test-cases');
  }
}
generateTestCasesStep.maxRetries = STEP_MAX_RETRIES;

export async function runSandboxStep(runId: string, testCases: TestCase[]): Promise<TestResult[]> {
  'use step';

  try {
    const run = await getRun(runId);
    if (!run) {
      throw new FatalError(`Run not found: ${runId}`);
    }

    const results = await runTestCasesInSandbox(run.input.url, testCases);
    await updateRun(runId, { results });
    return results;
  } catch (error) {
    rethrowWithBackoff(error, 'run-sandbox');
  }
}
runSandboxStep.maxRetries = STEP_MAX_RETRIES;

export async function scoreResultsStep(runId: string): Promise<TestResult[]> {
  'use step';

  try {
    const run = await getRun(runId);
    if (!run) {
      throw new FatalError(`Run not found: ${runId}`);
    }

    const { results, promptVersion } = await scoreTestResults(runId, {
      description: run.input.description,
      testCases: run.testCases,
      results: run.results,
    });

    await updateRun(runId, {
      promptVersions: {
        ...run.promptVersions,
        scoreResults: promptVersion,
      },
    });

    return results;
  } catch (error) {
    if (error instanceof FatalError) {
      throw error;
    }
    rethrowWithBackoff(error, 'score-results');
  }
}
scoreResultsStep.maxRetries = STEP_MAX_RETRIES;

export async function buildReportStep(runId: string): Promise<void> {
  'use step';

  try {
    await updateRun(runId, {
      report: {
        markdown: '# Eval report (stub)\n\nReport streaming lands in Slice 07.',
        summary: 'Stub report',
      },
    });
  } catch (error) {
    rethrowWithBackoff(error, 'build-report');
  }
}
buildReportStep.maxRetries = STEP_MAX_RETRIES;

export async function markAwaitingApprovalStep(runId: string): Promise<void> {
  'use step';

  try {
    await updateRun(runId, { status: 'awaiting_approval' });
  } catch (error) {
    rethrowWithBackoff(error, 'await-approval');
  }
}
markAwaitingApprovalStep.maxRetries = STEP_MAX_RETRIES;

export async function applyFixesStep(runId: string): Promise<void> {
  'use step';

  try {
    await updateRun(runId, {
      suggestedFixes: [
        {
          id: 'fix_stub_1',
          target: 'system-prompt',
          description: 'Stub fix — Slice 09',
          diff: '--- a/prompt\n+++ b/prompt\n',
          approved: null,
        },
      ],
      approvedAt: Date.now(),
      status: 'complete',
    });
  } catch (error) {
    rethrowWithBackoff(error, 'apply-fixes');
  }
}
applyFixesStep.maxRetries = STEP_MAX_RETRIES;

export async function markRejectedStep(runId: string): Promise<void> {
  'use step';

  try {
    await updateRun(runId, { status: 'complete', approvedAt: null });
  } catch (error) {
    rethrowWithBackoff(error, 'mark-rejected');
  }
}
markRejectedStep.maxRetries = STEP_MAX_RETRIES;

export async function markFailedStep(runId: string, message: string): Promise<void> {
  'use step';

  try {
    await updateRun(runId, { status: 'failed', error: message });
  } catch {
    // Best-effort failure marker; do not mask the original workflow error.
  }
}
markFailedStep.maxRetries = STEP_MAX_RETRIES;

export async function loadRunStep(runId: string): Promise<EvalRun> {
  'use step';

  const run = await getRun(runId);
  if (!run) {
    throw new FatalError(`Run not found: ${runId}`);
  }
  return run;
}
loadRunStep.maxRetries = STEP_MAX_RETRIES;

export async function evalRunWorkflow(runId: string): Promise<EvalRun> {
  'use workflow';

  try {
    const testCases = await generateTestCasesStep(runId);
    await runSandboxStep(runId, testCases);
    await scoreResultsStep(runId);
    await buildReportStep(runId);
    await markAwaitingApprovalStep(runId);

    using hook = approvalHook.create({ token: `approval:${runId}` });
    const decision = await hook;

    if (decision.approved) {
      await applyFixesStep(runId);
    } else {
      await markRejectedStep(runId);
    }

    return await loadRunStep(runId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markFailedStep(runId, message);
    throw error;
  }
}
