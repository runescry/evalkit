import { Output } from 'ai';
import { z } from 'zod';
import { generateWithTier } from '@/lib/ai';
import { recordLlmTrace } from '@/lib/llm-trace';
import {
  GENERATE_CASES_ADVERSARIAL_PROMPT,
  GENERATE_CASES_PROMPT,
  getGenerateCasesAdversarialPromptMeta,
  getGenerateCasesPromptMeta,
} from '@/lib/prompts';
import { isAgentMatrixMode } from '@/lib/agent-matrix';
import {
  testCaseCategorySchema,
  type EvalRunInput,
  type TestCase,
  type TestCaseCategory,
} from '@/lib/types';

const ALL_CATEGORIES = testCaseCategorySchema.options;

const llmTestCaseSchema = z.object({
  category: testCaseCategorySchema,
  agentId: z.string().min(1).optional(),
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
    ...(testCase.agentId ? { agentId: testCase.agentId.trim() } : {}),
    input: testCase.input.trim(),
    expectedBehavior: testCase.expectedBehavior.trim(),
    ...(testCase.scoringNotes ? { scoringNotes: testCase.scoringNotes.trim() } : {}),
  }));
}

export function assertAgentCoverage(testCases: TestCase[], input: EvalRunInput): void {
  if (!isAgentMatrixMode(input) || !input.agents?.length) {
    return;
  }

  const allowed = new Set(input.agents.map((agent) => agent.id));
  for (const testCase of testCases) {
    if (!testCase.agentId) {
      throw new Error(`Missing agentId on test case ${testCase.id} in agent-matrix mode`);
    }
    if (!allowed.has(testCase.agentId)) {
      throw new Error(`Unknown agentId on test case ${testCase.id}: ${testCase.agentId}`);
    }
  }

  if (input.caseCount < input.agents.length) {
    return;
  }

  const covered = new Set(testCases.map((testCase) => testCase.agentId));
  const missing = input.agents.filter((agent) => !covered.has(agent.id));
  if (missing.length > 0) {
    throw new Error(`Missing test cases for agents: ${missing.map((a) => a.id).join(', ')}`);
  }
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
  const adversarial = input.generationMode === 'adversarial';
  const promptTemplate = adversarial ? GENERATE_CASES_ADVERSARIAL_PROMPT : GENERATE_CASES_PROMPT;
  const promptVersion = adversarial
    ? getGenerateCasesAdversarialPromptMeta()
    : getGenerateCasesPromptMeta();
  const userPrompt = promptTemplate.buildUserPrompt({
    url: input.url,
    description: input.description,
    caseCount: input.caseCount,
    agents: input.agents,
  });

  const result = await generateWithTier({
    tier: adversarial ? 'strong' : 'fast',
    step: adversarial ? 'generate-test-cases-adversarial' : 'generate-test-cases',
    runId,
    system: promptTemplate.system,
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
  assertAgentCoverage(testCases, input);

  await recordLlmTrace(runId, {
    step: adversarial ? 'generate-test-cases-adversarial' : 'generate-test-cases',
    tier: adversarial ? 'strong' : 'fast',
    system: promptTemplate.system,
    user: userPrompt,
    assistant: JSON.stringify(parsed, null, 2),
    assistantFormat: 'json',
    evalkit: result.evalkit,
  });

  return { testCases, promptVersion };
}
