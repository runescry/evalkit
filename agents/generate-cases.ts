import { Output } from 'ai';
import { z } from 'zod';
import { generateWithTier } from '@/lib/ai';
import { GENERATE_CASES_PROMPT, getGenerateCasesPromptMeta } from '@/lib/prompts';
import {
  testCaseCategorySchema,
  type EvalRunInput,
  type TestCase,
  type TestCaseCategory,
} from '@/lib/types';

const ALL_CATEGORIES = testCaseCategorySchema.options;

const llmTestCaseSchema = z.object({
  category: testCaseCategorySchema,
  input: z.string().min(1),
  expectedBehavior: z.string().min(1),
  scoringNotes: z.string().optional(),
});

const generateTestCasesResponseSchema = z.object({
  testCases: z.array(llmTestCaseSchema).min(1),
});

export type GenerateTestCasesResult = {
  testCases: TestCase[];
  promptVersion: { version: string; hash: string };
};

declare global {
  var __EVALKIT_GENERATE_TEST_CASES__:
    | ((runId: string, input: EvalRunInput) => Promise<GenerateTestCasesResult>)
    | undefined;
}

function normalizeInput(input: string): string {
  return input.trim().toLowerCase();
}

function assignTestCaseIds(rawCases: z.infer<typeof llmTestCaseSchema>[], runId: string): TestCase[] {
  return rawCases.map((testCase, index) => ({
    id: `tc_${runId}_${index + 1}`,
    category: testCase.category,
    input: testCase.input.trim(),
    expectedBehavior: testCase.expectedBehavior.trim(),
    ...(testCase.scoringNotes ? { scoringNotes: testCase.scoringNotes.trim() } : {}),
  }));
}

export function assertUniqueInputs(testCases: TestCase[]): void {
  const seen = new Set<string>();
  for (const testCase of testCases) {
    const key = normalizeInput(testCase.input);
    if (seen.has(key)) {
      throw new Error(`Duplicate test case input: ${testCase.input.slice(0, 80)}`);
    }
    seen.add(key);
  }
}

export function assertCategoryCoverage(
  testCases: TestCase[],
  caseCount: number,
): void {
  if (caseCount < ALL_CATEGORIES.length) {
    return;
  }

  const covered = new Set<TestCaseCategory>(testCases.map((testCase) => testCase.category));
  const missing = ALL_CATEGORIES.filter((category) => !covered.has(category));
  if (missing.length > 0) {
    throw new Error(`Missing test case categories: ${missing.join(', ')}`);
  }
}

export async function generateTestCases(
  runId: string,
  input: EvalRunInput,
): Promise<GenerateTestCasesResult> {
  if (globalThis.__EVALKIT_GENERATE_TEST_CASES__) {
    return globalThis.__EVALKIT_GENERATE_TEST_CASES__(runId, input);
  }

  return generateTestCasesWithAi(runId, input);
}

async function generateTestCasesWithAi(
  runId: string,
  input: EvalRunInput,
): Promise<GenerateTestCasesResult> {
  const promptVersion = getGenerateCasesPromptMeta();
  const userPrompt = GENERATE_CASES_PROMPT.buildUserPrompt({
    url: input.url,
    description: input.description,
    caseCount: input.caseCount,
  });

  const result = await generateWithTier({
    tier: 'fast',
    step: 'generate-test-cases',
    runId,
    system: GENERATE_CASES_PROMPT.system,
    prompt: userPrompt,
    output: Output.object({ schema: generateTestCasesResponseSchema }),
  });

  const parsed = generateTestCasesResponseSchema.parse(result.output);
  if (parsed.testCases.length !== input.caseCount) {
    throw new Error(
      `Expected ${input.caseCount} test cases, got ${parsed.testCases.length}`,
    );
  }

  const testCases = assignTestCaseIds(parsed.testCases, runId);
  assertUniqueInputs(testCases);
  assertCategoryCoverage(testCases, input.caseCount);

  return { testCases, promptVersion };
}
