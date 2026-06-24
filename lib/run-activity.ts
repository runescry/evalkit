import type { EvalRun, TestCase, TestResult } from '@/lib/types';

export type ActivityKind =
  | 'status'
  | 'generate'
  | 'sandbox'
  | 'score'
  | 'report'
  | 'error'
  | 'info';

export type ActivityEntry = {
  id: string;
  at: number;
  kind: ActivityKind;
  message: string;
  detail?: string;
};

let activitySeq = 0;

function entry(kind: ActivityKind, message: string, detail?: string): ActivityEntry {
  activitySeq += 1;
  return {
    id: `act_${activitySeq}`,
    at: Date.now(),
    kind,
    message,
    detail,
  };
}

function formatCaseLine(testCase: TestCase): string {
  return `[${testCase.category.replaceAll('_', ' ')}] ${truncate(testCase.input, 72)}`;
}

function truncate(text: string, max: number): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) {
    return oneLine;
  }
  return `${oneLine.slice(0, max)}…`;
}

function sandboxLine(result: TestResult, testCase?: TestCase): string {
  const label = testCase?.id ?? result.testCaseId;
  const code = result.sandbox.statusCode ?? '—';
  const ms = result.sandbox.latencyMs ?? '—';
  const unverified = result.sandbox.unverified ? ' · unverified' : '';
  const scopeReject = result.sandbox.scopeRejected ? ' · scope reject (no model)' : '';
  const err = result.sandbox.error ? ` · ${result.sandbox.error}` : '';
  return `${label} → HTTP ${code} (${ms}ms)${unverified}${scopeReject}${err}`;
}

function scoreLine(result: TestResult): string {
  const total = result.total ?? '?';
  const flag = result.flagged ? 'FLAGGED' : 'ok';
  const dual =
    result.multiModelScore && !result.multiModelScore.flagAgreement
      ? ' · tier disagreement'
      : '';
  return `${result.testCaseId} → ${total}/20 (${flag})${dual}`;
}

export type DiffActivityState = {
  seenCaseIds: Set<string>;
  seenResultIds: Set<string>;
  scoredIds: Set<string>;
  lastStatus: string | null;
  lastReportLength: number;
  loggedError: boolean;
};

export function createActivityState(): DiffActivityState {
  return {
    seenCaseIds: new Set(),
    seenResultIds: new Set(),
    scoredIds: new Set(),
    lastStatus: null,
    lastReportLength: 0,
    loggedError: false,
  };
}

export function diffRunActivity(
  state: DiffActivityState,
  run: EvalRun,
  reportMarkdown: string,
): ActivityEntry[] {
  const events: ActivityEntry[] = [];

  if (state.lastStatus !== run.status) {
    state.lastStatus = run.status;
    events.push(
      entry('status', `Run status → ${run.status.replaceAll('_', ' ')}`, run.id),
    );
  }

  if (run.error && !state.loggedError) {
    state.loggedError = true;
    events.push(entry('error', 'Workflow error', run.error));
  }

  for (const testCase of run.testCases) {
    if (!state.seenCaseIds.has(testCase.id)) {
      state.seenCaseIds.add(testCase.id);
      events.push(entry('generate', 'Test case generated', formatCaseLine(testCase)));
    }
  }

  const caseById = new Map(run.testCases.map((tc) => [tc.id, tc]));

  for (const result of run.results) {
    if (!state.seenResultIds.has(result.testCaseId)) {
      state.seenResultIds.add(result.testCaseId);
      events.push(
        entry('sandbox', 'Sandbox response captured', sandboxLine(result, caseById.get(result.testCaseId))),
      );
    }

    if (result.total !== null && !state.scoredIds.has(result.testCaseId)) {
      state.scoredIds.add(result.testCaseId);
      const reasoning = result.reasoning ? truncate(result.reasoning, 120) : undefined;
      events.push(entry('score', 'Case scored', scoreLine(result) + (reasoning ? ` — ${reasoning}` : '')));
    }
  }

  const reportLen = reportMarkdown.length;
  if (reportLen > 0 && reportLen !== state.lastReportLength) {
    const delta = reportLen - state.lastReportLength;
    if (state.lastReportLength === 0) {
      events.push(entry('report', 'Report stream started', `${reportLen} characters received`));
      state.lastReportLength = reportLen;
    } else if (delta >= 80) {
      events.push(entry('report', 'Report stream update', `+${delta} characters (${reportLen} total)`));
      state.lastReportLength = reportLen;
    }
  }

  return events;
}

export function backfillActivity(
  run: EvalRun,
  reportMarkdown: string,
): { entries: ActivityEntry[]; state: DiffActivityState } {
  const state = createActivityState();
  const entries: ActivityEntry[] = [
    entry(
      'info',
      'Eval started',
      `${run.input.caseCount} cases · ${run.input.generationMode} · ${run.input.scoringMode}`,
    ),
  ];

  const pushed = diffRunActivity(state, run, reportMarkdown);
  return { entries: [...entries, ...pushed], state };
}

export const ACTIVITY_KIND_STYLES: Record<ActivityKind, string> = {
  status: 'text-foreground',
  generate: 'text-primary',
  sandbox: 'text-teal-700 dark:text-teal-300',
  score: 'text-amber-800 dark:text-amber-200',
  report: 'text-violet-700 dark:text-violet-300',
  error: 'text-destructive',
  info: 'text-muted-foreground',
};
