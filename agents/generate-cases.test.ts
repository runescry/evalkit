import pilotFixture from '@/fixtures/aidea-agent-matrix-pilot.json';
import fintechFixture from '@/fixtures/fintech-chatbot.json';
import { evalRunInputSchema } from '@/lib/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertAgentCoverage,
  assertCategoryCoverage,
  assertUniqueInputs,
  generateTestCases,
} from './generate-cases';
import { testCaseCategorySchema } from '@/lib/types';

const { generateWithTierMock } = vi.hoisted(() => ({
  generateWithTierMock: vi.fn(),
}));

vi.mock('@/lib/ai', () => ({
  generateWithTier: generateWithTierMock,
}));

function fintechInput(overrides: Record<string, unknown> = {}) {
  return evalRunInputSchema.parse({ ...fintechFixture, ...overrides });
}

const ALL_CATEGORIES = testCaseCategorySchema.options;

function buildFintechCases(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    category: ALL_CATEGORIES[index % ALL_CATEGORIES.length]!,
    input: `Fintech user message ${index + 1}`,
    expectedBehavior: `Expected behavior ${index + 1}`,
    scoringNotes: 'Check scope and safety',
  }));
}

describe('generateTestCases', () => {
  beforeEach(() => {
    generateWithTierMock.mockReset();
  });

  it('calls fast tier with structured output and stores prompt version metadata', async () => {
    const caseCount = 6;
    generateWithTierMock.mockResolvedValue({
      output: { testCases: buildFintechCases(caseCount) },
      evalkit: { evalkitTier: 'fast', evalkitStep: 'generate-test-cases' },
    });

    const result = await generateTestCases('run_abc', fintechInput({ caseCount }));

    expect(generateWithTierMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: 'fast',
        step: 'generate-test-cases',
        output: expect.any(Object),
        system: expect.stringContaining('hallucination'),
        prompt: expect.stringContaining(fintechFixture.url),
      }),
    );
    expect(result.testCases).toHaveLength(caseCount);
    expect(result.testCases[0]?.id).toBe('tc_run_abc_1');
    expect(result.promptVersion).toMatchObject({
      version: '1.2.0',
      hash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    });
  });

  it('covers all six categories for the fintech fixture when caseCount >= 6', async () => {
    generateWithTierMock.mockResolvedValue({
      output: { testCases: buildFintechCases(fintechFixture.caseCount) },
    });

    const result = await generateTestCases('run_fintech', fintechInput());

    const categories = new Set(result.testCases.map((testCase) => testCase.category));
    for (const category of ALL_CATEGORIES) {
      expect(categories.has(category)).toBe(true);
    }
  });

  it('rejects duplicate inputs', () => {
    const testCases = [
      {
        id: 'tc_1',
        category: 'edge_case' as const,
        input: 'What is my balance?',
        expectedBehavior: 'Ask for auth',
      },
      {
        id: 'tc_2',
        category: 'hallucination' as const,
        input: '  what is my balance?  ',
        expectedBehavior: 'Do not invent balance',
      },
    ];

    expect(() => assertUniqueInputs(testCases)).toThrow(/Duplicate test case input/);
  });

  it('requires one case per category when caseCount is at least six', () => {
    const testCases = ALL_CATEGORIES.slice(0, 5).map((category, index) => ({
      id: `tc_${index}`,
      category,
      input: `Input ${index}`,
      expectedBehavior: 'Behavior',
    }));

    expect(() => assertCategoryCoverage(testCases, 6)).toThrow(/Missing test case categories/);
  });

  it('throws when model returns wrong case count', async () => {
    generateWithTierMock.mockResolvedValue({
      output: { testCases: buildFintechCases(2) },
    });

    await expect(
      generateTestCases('run_short', fintechInput({ caseCount: 6 })),
    ).rejects.toThrow(/Expected 6 test cases/);
  });

  it('uses strong tier and adversarial prompt when generationMode is adversarial', async () => {
    const caseCount = 6;
    generateWithTierMock.mockResolvedValue({
      output: { testCases: buildFintechCases(caseCount) },
    });

    await generateTestCases('run_red', fintechInput({ caseCount, generationMode: 'adversarial' }));

    expect(generateWithTierMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: 'strong',
        step: 'generate-test-cases-adversarial',
        system: expect.stringContaining('red-team'),
      }),
    );
  });

  it('requires agentId per case in agent-matrix mode', () => {
    const matrixInput = evalRunInputSchema.parse(pilotFixture);
    const testCases = [
      {
        id: 'tc_1',
        agentId: 'inbox-triage',
        category: 'regression' as const,
        input: 'Triage inbox',
        expectedBehavior: 'Use gmail_read',
      },
      {
        id: 'tc_2',
        category: 'scope_drift' as const,
        input: 'Give medical advice',
        expectedBehavior: 'Decline',
      },
    ];

    expect(() => assertAgentCoverage(testCases, matrixInput)).toThrow(/Missing agentId/);
  });
});
