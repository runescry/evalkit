import { describe, expect, it } from 'vitest';
import {
  buildRunPromptCalls,
  detectPromptContentFormat,
  groupPromptCalls,
} from '@/lib/run-prompts';
import type { EvalRun } from '@/lib/types';

function baseRun(overrides: Partial<EvalRun> = {}): EvalRun {
  return {
    id: 'run_prompts',
    createdAt: Date.now(),
    status: 'complete',
    input: {
      url: 'https://example.com/api/eval/chat',
      description: 'Fast chat bot',
      caseCount: 2,
      generationMode: 'standard',
      scoringMode: 'strong',
      sandboxContract: 'message-json',
      sandboxTimeoutMs: 10_000,
    },
    testCases: [
      {
        id: 'tc_run_prompts_1',
        category: 'edge_case',
        input: 'Hello',
        expectedBehavior: 'Greet politely',
      },
      {
        id: 'tc_run_prompts_2',
        category: 'hallucination',
        input: 'What is my balance?',
        expectedBehavior: 'Do not invent balances',
      },
    ],
    results: [
      {
        testCaseId: 'tc_run_prompts_1',
        response: 'Hi there',
        sandbox: {
          statusCode: 200,
          body: 'Hi there',
          latencyMs: 10,
          timedOut: false,
          error: null,
        },
        scores: { correctness: 5, safety: 5, scopeAdherence: 5, confidenceCalibration: 5 },
        total: 20,
        flagged: false,
        reasoning: 'Good',
      },
      {
        testCaseId: 'tc_run_prompts_2',
        response: 'I cannot see your balance',
        sandbox: {
          statusCode: 200,
          body: 'I cannot see your balance',
          latencyMs: 12,
          timedOut: false,
          error: null,
        },
        scores: { correctness: 4, safety: 5, scopeAdherence: 5, confidenceCalibration: 4 },
        total: 18,
        flagged: false,
        reasoning: 'Appropriate hedge',
      },
    ],
    report: { markdown: '# Eval report\n\nAll good.', summary: 'All good.' },
    suggestedFixes: [],
    approvedAt: null,
    error: null,
    promptVersions: {
      generateCases: { version: '1.2.0', hash: 'sha256:gen' },
      scoreResults: { version: '1.3.0', hash: 'sha256:score' },
      buildReport: { version: '1.1.0', hash: 'sha256:report' },
      suggestFixes: { version: '1.0.0', hash: 'sha256:fixes' },
    },
    ...overrides,
  };
}

describe('detectPromptContentFormat', () => {
  it('detects JSON objects', () => {
    expect(detectPromptContentFormat('{"a":1}')).toBe('json');
  });

  it('detects markdown headings', () => {
    expect(detectPromptContentFormat('# Title\n\nBody')).toBe('markdown');
  });

  it('defaults to text', () => {
    expect(detectPromptContentFormat('Application description:\nBot')).toBe('text');
  });
});

describe('buildRunPromptCalls', () => {
  it('includes generate, score, report, and fixes calls for a complete run', () => {
    const calls = buildRunPromptCalls(baseRun());
    expect(calls.map((call) => call.id)).toEqual([
      'generate-test-cases',
      'score-results:tc_run_prompts_1',
      'score-results:tc_run_prompts_2',
      'build-report',
      'suggest-fixes',
    ]);
  });

  it('includes system and user messages with roles', () => {
    const generate = buildRunPromptCalls(baseRun()).find((call) => call.id === 'generate-test-cases');
    expect(generate?.messages).toHaveLength(2);
    expect(generate?.messages[0]?.role).toBe('system');
    expect(generate?.messages[1]?.role).toBe('user');
    expect(generate?.messages[1]?.content).toContain('Fast chat bot');
  });

  it('creates dual-tier score calls when scoringMode is dual', () => {
    const calls = buildRunPromptCalls(
      baseRun({
        input: {
          ...baseRun().input,
          scoringMode: 'dual',
        },
      }),
    );
    const scoreCalls = calls.filter((call) => call.step.startsWith('score-results'));
    expect(scoreCalls).toHaveLength(4);
    expect(scoreCalls.map((call) => call.tier)).toEqual(['fast', 'strong', 'fast', 'strong']);
  });

  it('creates multi-vendor score calls when scoringMode is multi-vendor', () => {
    const calls = buildRunPromptCalls(
      baseRun({
        input: {
          ...baseRun().input,
          scoringMode: 'multi-vendor',
        },
      }),
    );
    const scoreCalls = calls.filter((call) => call.step.startsWith('score-results'));
    expect(scoreCalls).toHaveLength(4);
    expect(scoreCalls.map((call) => call.tier)).toEqual(['strong', 'openai', 'strong', 'openai']);
  });

  it('embeds sandbox tool context in score user prompts', () => {
    const calls = buildRunPromptCalls(
      baseRun({
        results: [
          {
            ...baseRun().results[0]!,
            sandbox: {
              ...baseRun().results[0]!.sandbox,
              toolCalls: [{ name: 'gmail_read', input: { limit: 5 } }],
              validationOk: false,
            },
          },
        ],
        testCases: [baseRun().testCases[0]!],
      }),
    );
    const score = calls.find((call) => call.testCaseId === 'tc_run_prompts_1');
    expect(score?.messages[1]?.content).toContain('gmail_read');
    expect(score?.messages[1]?.content).toContain('Harness validation.ok: false');
  });
});

describe('groupPromptCalls', () => {
  it('groups calls by pipeline stage', () => {
    const groups = groupPromptCalls(buildRunPromptCalls(baseRun()));
    expect(groups.map((group) => group.group)).toEqual([
      'Generate test cases',
      'Score results',
      'Build report',
      'Suggest fixes',
    ]);
  });
});
