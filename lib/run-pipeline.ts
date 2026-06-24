import type { EvalRun } from '@/lib/types';

export type PipelineStepId = 'generate' | 'sandbox' | 'score' | 'report' | 'approval';

export type PipelineStepState = 'pending' | 'active' | 'complete';

export type PipelineStep = {
  id: PipelineStepId;
  label: string;
  state: PipelineStepState;
  detail: string;
};

export const STALE_RUN_MS = 3 * 60 * 1000;
export const APPROVAL_WAIT_MS = 110_000;
export const APPROVAL_POLL_MS = 750;

/** Poll KV until workflow leaves awaiting_approval (after resumeHook). */
export async function waitForRunAfterApproval(
  loadRun: () => Promise<EvalRun | null>,
  deadlineMs = APPROVAL_WAIT_MS,
): Promise<EvalRun | null> {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    const run = await loadRun();
    if (!run) {
      return null;
    }
    if (run.status !== 'awaiting_approval') {
      return run;
    }
    await new Promise((resolve) => setTimeout(resolve, APPROVAL_POLL_MS));
  }
  return loadRun();
}

export function isStaleRun(run: EvalRun, now = Date.now()): boolean {
  if (run.status !== 'pending' && run.status !== 'running') {
    return false;
  }
  if (run.testCases.length > 0) {
    return false;
  }
  return now - run.createdAt > STALE_RUN_MS;
}

function countScored(run: EvalRun): number {
  return run.results.filter((r) => r.total !== null).length;
}

export function getPipelineProgress(run: EvalRun): {
  steps: PipelineStep[];
  activeStepId: PipelineStepId | null;
  percent: number;
  isActive: boolean;
} {
  const caseCount = run.input.caseCount;
  const testCases = run.testCases.length;
  const results = run.results.length;
  const scored = countScored(run);
  const hasReport = Boolean(run.report?.markdown?.trim());
  const failed = run.status === 'failed';

  const steps: PipelineStep[] = [
    {
      id: 'generate',
      label: 'Generate test cases',
      state: 'pending',
      detail: `Creating ${caseCount} adversarial cases…`,
    },
    {
      id: 'sandbox',
      label: 'Run sandbox',
      state: 'pending',
      detail: `Executing cases against target (max 5 parallel)…`,
    },
    {
      id: 'score',
      label: 'Score results',
      state: 'pending',
      detail:
        run.input.scoringMode === 'dual'
          ? 'Dual-tier rubric scoring (fast + strong)…'
          : 'Strong-tier rubric scoring…',
    },
    {
      id: 'report',
      label: 'Build report',
      state: 'pending',
      detail: 'Streaming markdown report…',
    },
    {
      id: 'approval',
      label: 'Await approval',
      state: 'pending',
      detail: 'Human gate before prompt fixes',
    },
  ];

  const setState = (id: PipelineStepId, state: PipelineStepState, detail?: string) => {
    const step = steps.find((s) => s.id === id);
    if (step) {
      step.state = state;
      if (detail) {
        step.detail = detail;
      }
    }
  };

  if (testCases > 0) {
    setState('generate', 'complete', `${testCases} cases generated`);
  }

  if (results > 0) {
    const target = testCases || caseCount;
    setState(
      'sandbox',
      results >= target ? 'complete' : 'active',
      `${results}/${target} sandbox responses captured`,
    );
  }

  if (scored > 0) {
    const target = results || testCases || caseCount;
    setState(
      'score',
      scored >= target ? 'complete' : 'active',
      `${scored}/${target} cases scored`,
    );
  }

  if (hasReport) {
    setState('report', 'complete', 'Report ready');
  }

  if (run.status === 'awaiting_approval') {
    setState('approval', 'active', 'Review flagged findings and approve fixes');
  }

  if (run.status === 'complete') {
    setState('approval', 'complete', run.suggestedFixes ? 'Fixes generated' : 'Completed without fixes');
  }

  // Mark active step when nothing later has started
  if (run.status === 'pending' || run.status === 'running') {
    if (testCases === 0) {
      setState('generate', 'active');
    } else if (results < testCases) {
      setState('sandbox', 'active');
    } else if (scored < results) {
      setState('score', 'active');
    } else if (!hasReport) {
      setState('report', 'active');
    }
  }

  if (failed) {
    const active = steps.find((s) => s.state === 'active');
    if (active) {
      active.detail = run.error ?? 'Step failed';
    }
  }

  const activeStepId = steps.find((s) => s.state === 'active')?.id ?? null;
  const isActive = run.status === 'pending' || run.status === 'running';

  const weights = { generate: 0.12, sandbox: 0.38, score: 0.28, report: 0.17, approval: 0.05 };
  let percent = 0;
  for (const step of steps) {
    const w = weights[step.id];
    if (step.state === 'complete') {
      percent += w;
    } else if (step.state === 'active') {
      if (step.id === 'sandbox' && testCases > 0) {
        percent += w * (results / testCases);
      } else if (step.id === 'score' && results > 0) {
        percent += w * (scored / results);
      } else if (step.id === 'report' && hasReport) {
        percent += w * 0.6;
      } else {
        percent += w * 0.35;
      }
      break;
    } else {
      break;
    }
  }

  return {
    steps,
    activeStepId,
    percent: Math.min(99, Math.round(percent * 100)),
    isActive,
  };
}
