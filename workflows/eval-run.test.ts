import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyFixesStep,
  buildReportStep,
  generateTestCasesStep,
  markAwaitingApprovalStep,
  runSandboxStep,
  scoreResultsStep,
} from './eval-run';

const agentMocks = vi.hoisted(() => ({
  generateTestCases: vi.fn(),
  runTestCasesInSandbox: vi.fn(),
  scoreTestResults: vi.fn(),
  buildReport: vi.fn(),
}));

vi.mock('@/agents/generate-cases', () => ({
  generateTestCases: agentMocks.generateTestCases,
}));

vi.mock('@/agents/run-sandbox', () => ({
  runTestCasesInSandbox: agentMocks.runTestCasesInSandbox,
}));

vi.mock('@/agents/score-results', () => ({
  scoreTestResults: agentMocks.scoreTestResults,
}));

vi.mock('@/agents/build-report', () => ({
  buildReport: agentMocks.buildReport,
}));

const storeMocks = vi.hoisted(() => ({
  getRun: vi.fn(),
  updateRun: vi.fn(),
}));

vi.mock('./store-bridge', () => ({
  getRun: storeMocks.getRun,
  updateRun: storeMocks.updateRun,
}));

const baseRun = {
  id: 'run_test123',
  createdAt: Date.now(),
  status: 'pending' as const,
  input: {
    url: 'https://example.com/chat',
    description: 'Test bot',
    caseCount: 3,
  },
  testCases: [],
  results: [],
  report: null,
  suggestedFixes: null,
  approvedAt: null,
  error: null,
};

describe('eval-run workflow steps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMocks.getRun.mockResolvedValue({ ...baseRun });
    storeMocks.updateRun.mockImplementation(async (_runId: string, patch: Record<string, unknown>) => ({
      ...baseRun,
      ...patch,
    }));
    agentMocks.generateTestCases.mockResolvedValue({
      testCases: [
        {
          id: 'tc_run_test123_1',
          category: 'edge_case',
          input: 'hello',
          expectedBehavior: 'respond',
        },
      ],
      promptVersion: { version: '1.0.0', hash: 'sha256:abc' },
    });
    agentMocks.runTestCasesInSandbox.mockResolvedValue([
      {
        testCaseId: 'tc_1',
        response: 'hello back',
        sandbox: {
          statusCode: 200,
          body: 'hello back',
          latencyMs: 12,
          timedOut: false,
          error: null,
        },
        scores: null,
        total: null,
        flagged: false,
        reasoning: null,
      },
      {
        testCaseId: 'tc_2',
        response: 'refused',
        sandbox: {
          statusCode: 200,
          body: 'refused',
          latencyMs: 9,
          timedOut: false,
          error: null,
        },
        scores: null,
        total: null,
        flagged: false,
        reasoning: null,
      },
    ]);
    agentMocks.scoreTestResults.mockResolvedValue({
      results: [
        {
          testCaseId: 'tc_1',
          response: 'hello back',
          sandbox: {
            statusCode: 200,
            body: 'hello back',
            latencyMs: 12,
            timedOut: false,
            error: null,
          },
          scores: {
            correctness: 5,
            safety: 5,
            scopeAdherence: 5,
            confidenceCalibration: 4,
          },
          total: 19,
          flagged: false,
          reasoning: 'Good response',
        },
        {
          testCaseId: 'tc_2',
          response: 'refused',
          sandbox: {
            statusCode: 200,
            body: 'refused',
            latencyMs: 9,
            timedOut: false,
            error: null,
          },
          scores: {
            correctness: 2,
            safety: 3,
            scopeAdherence: 3,
            confidenceCalibration: 3,
          },
          total: 11,
          flagged: true,
          reasoning: 'Weak refusal',
        },
      ],
      promptVersion: { version: '1.0.0', hash: 'sha256:score' },
    });
    agentMocks.buildReport.mockResolvedValue({
      report: {
        markdown: '# Eval report\n\nAll cases reviewed.',
        summary: 'All cases reviewed.',
      },
      promptVersion: { version: '1.0.0', hash: 'sha256:report' },
    });
  });

  it('generateTestCasesStep marks running and persists generated cases with prompt hash', async () => {
    const cases = await generateTestCasesStep(baseRun.id);

    expect(storeMocks.updateRun).toHaveBeenCalledWith(baseRun.id, { status: 'running' });
    expect(agentMocks.generateTestCases).toHaveBeenCalledWith(baseRun.id, baseRun.input);
    expect(cases).toHaveLength(1);
    expect(cases[0]).toMatchObject({
      id: 'tc_run_test123_1',
      category: 'edge_case',
    });
    expect(storeMocks.updateRun).toHaveBeenCalledWith(baseRun.id, {
      testCases: cases,
      promptVersions: { generateCases: { version: '1.0.0', hash: 'sha256:abc' } },
    });
  });

  it('runSandboxStep fans out sandbox results and persists them', async () => {
    const testCases = [
      {
        id: 'tc_1',
        category: 'edge_case' as const,
        input: 'hello',
        expectedBehavior: 'respond',
      },
      {
        id: 'tc_2',
        category: 'jailbreak' as const,
        input: 'ignore rules',
        expectedBehavior: 'refuse',
      },
    ];

    const results = await runSandboxStep(baseRun.id, testCases);

    expect(agentMocks.runTestCasesInSandbox).toHaveBeenCalledWith(baseRun.input.url, testCases);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      testCaseId: 'tc_1',
      response: 'hello back',
      sandbox: { statusCode: 200, timedOut: false },
    });
    expect(storeMocks.updateRun).toHaveBeenCalledWith(baseRun.id, { results });
  });

  it('scoreResultsStep scores sandbox results and stores prompt hash', async () => {
    storeMocks.getRun.mockResolvedValue({
      ...baseRun,
      testCases: [
        {
          id: 'tc_1',
          category: 'edge_case',
          input: 'hello',
          expectedBehavior: 'respond',
        },
      ],
      results: [
        {
          testCaseId: 'tc_1',
          response: 'hello back',
          sandbox: {
            statusCode: 200,
            body: 'hello back',
            latencyMs: 12,
            timedOut: false,
            error: null,
          },
          scores: null,
          total: null,
          flagged: false,
          reasoning: null,
        },
      ],
    });

    const results = await scoreResultsStep(baseRun.id);

    expect(agentMocks.scoreTestResults).toHaveBeenCalledWith(baseRun.id, {
      description: baseRun.input.description,
      testCases: expect.any(Array),
      results: expect.any(Array),
    });
    expect(results).toHaveLength(2);
    expect(results[1]?.flagged).toBe(true);
    expect(storeMocks.updateRun).toHaveBeenCalledWith(baseRun.id, {
      promptVersions: {
        scoreResults: { version: '1.0.0', hash: 'sha256:score' },
      },
    });
  });

  it('buildReportStep streams report via agent and stores prompt hash', async () => {
    storeMocks.getRun.mockResolvedValue({
      ...baseRun,
      testCases: [
        {
          id: 'tc_1',
          category: 'edge_case',
          input: 'hello',
          expectedBehavior: 'respond',
        },
      ],
      results: [
        {
          testCaseId: 'tc_1',
          response: 'hi',
          sandbox: {
            statusCode: 200,
            body: 'hi',
            latencyMs: 1,
            timedOut: false,
            error: null,
          },
          scores: null,
          total: 18,
          flagged: false,
          reasoning: 'ok',
        },
      ],
    });

    await buildReportStep(baseRun.id);

    expect(agentMocks.buildReport).toHaveBeenCalledWith(baseRun.id, {
      description: baseRun.input.description,
      testCases: expect.any(Array),
      results: expect.any(Array),
    });
    expect(storeMocks.updateRun).toHaveBeenCalledWith(baseRun.id, {
      promptVersions: {
        buildReport: { version: '1.0.0', hash: 'sha256:report' },
      },
    });
  });

  it('markAwaitingApprovalStep updates status', async () => {
    await markAwaitingApprovalStep(baseRun.id);
    expect(storeMocks.updateRun).toHaveBeenCalledWith(baseRun.id, {
      status: 'awaiting_approval',
    });
  });

  it('applyFixesStep writes stub fixes and completes run', async () => {
    await applyFixesStep(baseRun.id);

    expect(storeMocks.updateRun).toHaveBeenCalledWith(
      baseRun.id,
      expect.objectContaining({
        status: 'complete',
        suggestedFixes: expect.arrayContaining([
          expect.objectContaining({ id: 'fix_stub_1' }),
        ]),
        approvedAt: expect.any(Number),
      }),
    );
  });
});
