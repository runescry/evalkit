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
}));

vi.mock('@/agents/generate-cases', () => ({
  generateTestCases: agentMocks.generateTestCases,
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

  it('runSandboxStep fans out stub results and persists them', async () => {
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

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      testCaseId: 'tc_1',
      sandbox: { error: 'Sandbox stub — Slice 05' },
    });
    expect(storeMocks.updateRun).toHaveBeenCalledWith(baseRun.id, { results });
  });

  it('scoreResultsStep is a no-op stub until Slice 06', async () => {
    storeMocks.getRun.mockResolvedValue({
      ...baseRun,
      results: [{ testCaseId: 'tc_1', flagged: false }],
    });

    await scoreResultsStep(baseRun.id);

    expect(storeMocks.updateRun).toHaveBeenCalledWith(baseRun.id, {
      results: [{ testCaseId: 'tc_1', flagged: false }],
    });
  });

  it('buildReportStep writes stub markdown report', async () => {
    await buildReportStep(baseRun.id);

    expect(storeMocks.updateRun).toHaveBeenCalledWith(
      baseRun.id,
      expect.objectContaining({
        report: expect.objectContaining({
          markdown: expect.stringContaining('Slice 07'),
        }),
      }),
    );
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
