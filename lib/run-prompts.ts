import { descriptionForTestCase } from '@/lib/agent-matrix';
import type { ModelTier } from '@/lib/ai';
import {
  BUILD_REPORT_PROMPT,
  GENERATE_CASES_ADVERSARIAL_PROMPT,
  GENERATE_CASES_PROMPT,
  SCORE_RESULTS_PROMPT,
  SUGGEST_FIXES_PROMPT,
} from '@/lib/prompts';
import type { EvalRun, TestResult } from '@/lib/types';

export type PromptMessageRole = 'system' | 'user';

export type PromptContentFormat = 'text' | 'json' | 'markdown';

export type PromptMessage = {
  role: PromptMessageRole;
  content: string;
  format: PromptContentFormat;
};

export type PromptCallArtifact = {
  id: string;
  step: string;
  label: string;
  tier?: ModelTier;
  testCaseId?: string;
  /** Model output shape when not plain text. */
  outputFormat?: 'structured-json' | 'markdown';
  version?: string;
  hash?: string;
  messages: PromptMessage[];
};

export function detectPromptContentFormat(content: string): PromptContentFormat {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // not whole-block JSON
    }
  }
  if (/^#{1,6}\s/m.test(trimmed) || trimmed.includes('```')) {
    return 'markdown';
  }
  return 'text';
}

function message(role: PromptMessageRole, content: string): PromptMessage {
  return { role, content, format: detectPromptContentFormat(content) };
}

function flaggedForFixes(results: TestResult[]): TestResult[] {
  return results.filter((result) => result.flagged || (result.total !== null && result.total < 16));
}

function generateCall(run: EvalRun): PromptCallArtifact {
  const adversarial = run.input.generationMode === 'adversarial';
  const template = adversarial ? GENERATE_CASES_ADVERSARIAL_PROMPT : GENERATE_CASES_PROMPT;
  const meta = run.promptVersions?.generateCases;

  return {
    id: 'generate-test-cases',
    step: adversarial ? 'generate-test-cases-adversarial' : 'generate-test-cases',
    label: adversarial ? 'Generate cases (adversarial)' : 'Generate cases',
    tier: adversarial ? 'strong' : 'fast',
    outputFormat: 'structured-json',
    version: meta?.version ?? template.version,
    hash: meta?.hash,
    messages: [
      message('system', template.system),
      message(
        'user',
        template.buildUserPrompt({
          url: run.input.url,
          description: run.input.description,
          caseCount: run.input.caseCount,
          agents: run.input.agents,
        }),
      ),
    ],
  };
}

function scoreCalls(run: EvalRun): PromptCallArtifact[] {
  if (run.results.length === 0) {
    return [];
  }

  const meta = run.promptVersions?.scoreResults;
  const testCaseById = new Map(run.testCases.map((testCase) => [testCase.id, testCase]));
  const scoringMode = run.input.scoringMode;
  const calls: PromptCallArtifact[] = [];

  for (const result of run.results) {
    const testCase = testCaseById.get(result.testCaseId);
    if (!testCase) {
      continue;
    }

    const caseDescription = descriptionForTestCase(run.input, testCase);
    const userContent = SCORE_RESULTS_PROMPT.buildUserPrompt({
      description: caseDescription,
      testCase,
      response: result.response,
      sandbox: result.sandbox,
    });

    const tiers: Array<{ tier: ModelTier; step: string }> =
      scoringMode === 'dual'
        ? [
            { tier: 'fast', step: 'score-results-fast' },
            { tier: 'strong', step: 'score-results' },
          ]
        : scoringMode === 'multi-vendor'
          ? [
              { tier: 'strong', step: 'score-results' },
              { tier: 'openai', step: 'score-results-openai' },
            ]
          : [{ tier: 'strong', step: 'score-results' }];

    const multiJudge = scoringMode === 'dual' || scoringMode === 'multi-vendor';

    for (const { tier, step } of tiers) {
      calls.push({
        id: `${step}:${result.testCaseId}`,
        step,
        label: `Score ${result.testCaseId}${multiJudge ? ` (${tier})` : ''}`,
        tier,
        testCaseId: result.testCaseId,
        outputFormat: 'structured-json',
        version: meta?.version ?? SCORE_RESULTS_PROMPT.version,
        hash: meta?.hash,
        messages: [message('system', SCORE_RESULTS_PROMPT.system), message('user', userContent)],
      });
    }
  }

  return calls;
}

function reportCall(run: EvalRun): PromptCallArtifact | null {
  if (!run.report?.markdown && run.results.every((result) => result.total === null)) {
    return null;
  }

  const meta = run.promptVersions?.buildReport;
  const userContent = BUILD_REPORT_PROMPT.buildUserPrompt({
    description: run.input.description,
    testCases: run.testCases,
    results: run.results,
  });

  return {
    id: 'build-report',
    step: 'build-report',
    label: 'Build report',
    tier: 'strong',
    outputFormat: 'markdown',
    version: meta?.version ?? BUILD_REPORT_PROMPT.version,
    hash: meta?.hash,
    messages: [
      message('system', BUILD_REPORT_PROMPT.system),
      message('user', userContent),
    ],
  };
}

function suggestFixesCall(run: EvalRun): PromptCallArtifact | null {
  if (run.suggestedFixes === null) {
    return null;
  }

  const meta = run.promptVersions?.suggestFixes;
  const testCaseById = new Map(run.testCases.map((testCase) => [testCase.id, testCase]));
  const flaggedResults = flaggedForFixes(run.results).map((result) => {
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

  const userContent = SUGGEST_FIXES_PROMPT.buildUserPrompt({
    description: run.input.description,
    reportMarkdown: run.report?.markdown ?? '',
    flaggedResults,
  });

  return {
    id: 'suggest-fixes',
    step: 'suggest-fixes',
    label: 'Suggest fixes',
    tier: 'strong',
    outputFormat: 'structured-json',
    version: meta?.version ?? SUGGEST_FIXES_PROMPT.version,
    hash: meta?.hash,
    messages: [
      message('system', SUGGEST_FIXES_PROMPT.system),
      message('user', userContent),
    ],
  };
}

/** Reconstruct LLM prompt messages sent during this run (from templates + run snapshot). */
export function buildRunPromptCalls(run: EvalRun): PromptCallArtifact[] {
  const calls: PromptCallArtifact[] = [generateCall(run)];

  const scored = scoreCalls(run);
  calls.push(...scored);

  const report = reportCall(run);
  if (report) {
    calls.push(report);
  }

  const fixes = suggestFixesCall(run);
  if (fixes) {
    calls.push(fixes);
  }

  return calls;
}

export function groupPromptCalls(calls: PromptCallArtifact[]): Array<{
  group: string;
  calls: PromptCallArtifact[];
}> {
  const groups: Array<{ group: string; calls: PromptCallArtifact[] }> = [];
  const generate = calls.filter((call) => call.id === 'generate-test-cases');
  const score = calls.filter((call) => call.step.startsWith('score-results'));
  const report = calls.filter((call) => call.id === 'build-report');
  const fixes = calls.filter((call) => call.id === 'suggest-fixes');

  if (generate.length > 0) {
    groups.push({ group: 'Generate test cases', calls: generate });
  }
  if (score.length > 0) {
    groups.push({ group: 'Score results', calls: score });
  }
  if (report.length > 0) {
    groups.push({ group: 'Build report', calls: report });
  }
  if (fixes.length > 0) {
    groups.push({ group: 'Suggest fixes', calls: fixes });
  }

  return groups;
}
