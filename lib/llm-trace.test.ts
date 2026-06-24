import { describe, expect, it } from 'vitest';
import {
  buildLlmTraceEntry,
  groupLlmTraceEntries,
  resolveRunLlmTrace,
} from '@/lib/llm-trace';
import type { EvalRun, LlmTraceEntry } from '@/lib/types';

function baseRun(overrides: Partial<EvalRun> = {}): EvalRun {
  return {
    id: 'run_trace',
    createdAt: Date.now(),
    status: 'complete',
    input: {
      url: 'https://example.com/api/eval/chat',
      description: 'Fast chat bot',
      caseCount: 1,
      generationMode: 'standard',
      scoringMode: 'strong',
      sandboxContract: 'message-json',
      sandboxTimeoutMs: 10_000,
    },
    testCases: [
      {
        id: 'tc_run_trace_1',
        category: 'edge_case',
        input: 'Hello',
        expectedBehavior: 'Greet politely',
      },
    ],
    results: [
      {
        testCaseId: 'tc_run_trace_1',
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

describe('lib/llm-trace', () => {
  it('buildLlmTraceEntry includes system, user, and assistant messages', () => {
    const entry = buildLlmTraceEntry({
      step: 'generate-test-cases',
      tier: 'fast',
      system: 'You are a test generator',
      user: 'Generate cases',
      assistant: '{"testCases":[]}',
      assistantFormat: 'json',
      evalkit: {
        evalkitTier: 'fast',
        evalkitStep: 'generate-test-cases',
        latencyMs: 42,
        modelId: 'anthropic/claude-haiku-4-5',
        inputTokens: 10,
        outputTokens: 20,
        totalCost: 0.001,
        generationId: 'gen-1',
      },
    });

    expect(entry.messages.map((message) => message.role)).toEqual(['system', 'user', 'assistant']);
    expect(entry.modelId).toBe('anthropic/claude-haiku-4-5');
    expect(entry.totalCost).toBe(0.001);
  });

  it('resolveRunLlmTrace prefers stored llmTrace over reconstruction', () => {
    const stored: LlmTraceEntry[] = [
      buildLlmTraceEntry({
        step: 'build-report',
        tier: 'strong',
        user: 'Build report',
        assistant: '# Stored report',
        assistantFormat: 'markdown',
      }),
    ];

    const resolved = resolveRunLlmTrace(baseRun({ llmTrace: stored }));
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.messages.find((m) => m.role === 'assistant')?.content).toBe('# Stored report');
  });

  it('resolveRunLlmTrace reconstructs assistant responses from run snapshot', () => {
    const resolved = resolveRunLlmTrace(baseRun());
    const scoreEntry = resolved.find((entry) => entry.step === 'score-results');
    expect(scoreEntry?.messages.some((message) => message.role === 'assistant')).toBe(true);
    expect(scoreEntry?.messages.find((message) => message.role === 'assistant')?.content).toContain(
      '"total": 20',
    );
  });

  it('groupLlmTraceEntries orders pipeline groups', () => {
    const entries = [
      buildLlmTraceEntry({
        step: 'suggest-fixes',
        user: 'Suggest',
        assistant: '{"fixes":[]}',
        assistantFormat: 'json',
      }),
      buildLlmTraceEntry({
        step: 'generate-test-cases',
        user: 'Generate',
        assistant: '{"testCases":[]}',
        assistantFormat: 'json',
      }),
    ];

    const groups = groupLlmTraceEntries(entries);
    expect(groups.map((group) => group.group)).toEqual(['Generate test cases', 'Suggest fixes']);
  });
});
