import { Output } from 'ai';
import { z } from 'zod';
import { generateWithTier } from '@/lib/ai';
import { SUGGEST_FIXES_PROMPT, getSuggestFixesPromptMeta } from '@/lib/prompts';
import { promptFixSchema, type PromptFix, type TestCase, type TestResult } from '@/lib/types';

const llmFixSchema = z.object({
  target: z.string().min(1),
  description: z.string().min(1),
  diff: z.string().min(1),
});

const suggestFixesResponseSchema = z.object({
  fixes: z.array(llmFixSchema),
});

export type SuggestFixesParams = {
  description: string;
  reportMarkdown: string;
  testCases: TestCase[];
  results: TestResult[];
};

export type SuggestFixesResult = {
  fixes: PromptFix[];
  promptVersion: { version: string; hash: string };
};

declare global {
  var __EVALKIT_SUGGEST_FIXES__:
    | ((runId: string, params: SuggestFixesParams) => Promise<SuggestFixesResult>)
    | undefined;
}

export function assignFixIds(
  rawFixes: z.infer<typeof llmFixSchema>[],
  runId: string,
): PromptFix[] {
  return rawFixes.map((fix, index) =>
    promptFixSchema.parse({
      id: `fix_${runId}_${index + 1}`,
      target: fix.target.trim(),
      description: fix.description.trim(),
      diff: fix.diff.trim(),
      approved: null,
    }),
  );
}

export function selectFlaggedResults(
  _testCases: TestCase[],
  results: TestResult[],
): TestResult[] {
  return results.filter((result) => result.flagged || (result.total !== null && result.total < 16));
}

export async function suggestFixes(
  runId: string,
  params: SuggestFixesParams,
): Promise<SuggestFixesResult> {
  if (globalThis.__EVALKIT_SUGGEST_FIXES__) {
    return globalThis.__EVALKIT_SUGGEST_FIXES__(runId, params);
  }

  return suggestFixesWithAi(runId, params);
}

async function suggestFixesWithAi(
  runId: string,
  params: SuggestFixesParams,
): Promise<SuggestFixesResult> {
  const promptVersion = getSuggestFixesPromptMeta();
  const testCaseById = new Map(params.testCases.map((testCase) => [testCase.id, testCase]));
  const flaggedResults = selectFlaggedResults(params.testCases, params.results).map((result) => {
    const testCase = testCaseById.get(result.testCaseId);
    return {
      testCaseId: result.testCaseId,
      category: testCase?.category ?? 'unknown',
      input: testCase?.input ?? '',
      expectedBehavior: testCase?.expectedBehavior ?? '',
      response: result.response,
      total: result.total,
      reasoning: result.reasoning,
    };
  });

  const userPrompt = SUGGEST_FIXES_PROMPT.buildUserPrompt({
    description: params.description,
    reportMarkdown: params.reportMarkdown,
    flaggedResults,
  });

  const result = await generateWithTier({
    tier: 'strong',
    step: 'suggest-fixes',
    system: SUGGEST_FIXES_PROMPT.system,
    prompt: userPrompt,
    output: Output.object({ schema: suggestFixesResponseSchema }),
  });

  const parsed = suggestFixesResponseSchema.parse(result.output);
  const fixes = assignFixIds(parsed.fixes, runId);

  return { fixes, promptVersion };
}
