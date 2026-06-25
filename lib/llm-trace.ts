import type { EvalkitCallMeta } from '@/lib/ai';
import { detectPromptContentFormat } from '@/lib/run-prompts';
import { buildRunPromptCalls } from '@/lib/run-prompts';
import { llmTraceEntrySchema, type EvalRun, type LlmTraceEntry, type LlmTraceMessage } from '@/lib/types';
import { getRun, updateRun } from '@/workflows/store-bridge';

const TRACE_APPEND_RETRIES = 6;

export type AppendLlmTraceParams = {
  step: string;
  tier?: 'fast' | 'strong' | 'openai';
  testCaseId?: string;
  system?: string;
  user: string;
  assistant: string;
  assistantFormat?: LlmTraceMessage['format'];
  evalkit?: EvalkitCallMeta;
};

function traceMessage(
  role: LlmTraceMessage['role'],
  content: string,
  format?: LlmTraceMessage['format'],
): LlmTraceMessage {
  return {
    role,
    content,
    format: format ?? detectPromptContentFormat(content),
  };
}

export function buildLlmTraceEntry(params: AppendLlmTraceParams): LlmTraceEntry {
  const messages: LlmTraceMessage[] = [];
  if (params.system?.trim()) {
    messages.push(traceMessage('system', params.system));
  }
  messages.push(traceMessage('user', params.user));
  messages.push(
    traceMessage('assistant', params.assistant, params.assistantFormat ?? detectPromptContentFormat(params.assistant)),
  );

  const suffix = params.testCaseId ? `:${params.testCaseId}` : '';
  const tierSuffix = params.tier ? `:${params.tier}` : '';

  return llmTraceEntrySchema.parse({
    id: `${params.step}${tierSuffix}${suffix}:${Date.now()}`,
    step: params.step,
    tier: params.tier,
    testCaseId: params.testCaseId,
    modelId: params.evalkit?.modelId ?? null,
    latencyMs: params.evalkit?.latencyMs,
    totalCost: params.evalkit?.totalCost ?? null,
    generationId: params.evalkit?.generationId ?? null,
    messages,
  });
}

export async function appendLlmTraceEntry(runId: string, entry: LlmTraceEntry): Promise<void> {
  const validated = llmTraceEntrySchema.parse(entry);

  for (let attempt = 0; attempt < TRACE_APPEND_RETRIES; attempt += 1) {
    const run = await getRun(runId);
    if (!run) {
      return;
    }

    const beforeLength = run.llmTrace?.length ?? 0;
    const llmTrace = [...(run.llmTrace ?? []), validated];
    await updateRun(runId, { llmTrace });

    const verify = await getRun(runId);
    if ((verify?.llmTrace?.length ?? 0) > beforeLength) {
      return;
    }

    if (attempt < TRACE_APPEND_RETRIES - 1) {
      await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
    }
  }
}

export async function recordLlmTrace(runId: string, params: AppendLlmTraceParams): Promise<void> {
  await appendLlmTraceEntry(runId, buildLlmTraceEntry(params));
}

function responseForPromptCall(run: EvalRun, callId: string, testCaseId?: string): string | null {
  if (callId === 'generate-test-cases' || callId.startsWith('generate-test-cases')) {
    return JSON.stringify({ testCases: run.testCases }, null, 2);
  }

  if (callId === 'build-report') {
    return run.report?.markdown ?? null;
  }

  if (callId === 'suggest-fixes') {
    return run.suggestedFixes != null ? JSON.stringify({ fixes: run.suggestedFixes }, null, 2) : null;
  }

  if (callId.startsWith('score-results') && testCaseId) {
    const result = run.results.find((item) => item.testCaseId === testCaseId);
    if (!result) {
      return null;
    }
    return JSON.stringify(
      {
        scores: result.scores,
        total: result.total,
        flagged: result.flagged,
        reasoning: result.reasoning,
        multiModelScore: result.multiModelScore,
      },
      null,
      2,
    );
  }

  return null;
}

/** Stored trace when present; otherwise reconstruct prompts + attach responses from run snapshot. */
export function resolveRunLlmTrace(run: EvalRun): LlmTraceEntry[] {
  if (run.llmTrace && run.llmTrace.length > 0) {
    return run.llmTrace;
  }

  return buildRunPromptCalls(run).map((call) => {
    const assistant = responseForPromptCall(run, call.id, call.testCaseId);
    const messages: LlmTraceMessage[] = call.messages.map((message) => ({
      role: message.role,
      content: message.content,
      format: message.format,
    }));

    if (assistant) {
      messages.push(traceMessage('assistant', assistant, detectPromptContentFormat(assistant)));
    }

    return llmTraceEntrySchema.parse({
      id: call.id,
      step: call.step,
      tier: call.tier,
      testCaseId: call.testCaseId,
      messages,
    });
  });
}

export function groupLlmTraceEntries(entries: LlmTraceEntry[]): Array<{ group: string; entries: LlmTraceEntry[] }> {
  const order = ['Generate test cases', 'Score results', 'Build report', 'Suggest fixes'];
  const buckets = new Map<string, LlmTraceEntry[]>();

  for (const entry of entries) {
    let group = 'Other';
    if (entry.step.startsWith('generate-test-cases')) {
      group = 'Generate test cases';
    } else if (entry.step.startsWith('score-results')) {
      group = 'Score results';
    } else if (entry.step === 'build-report') {
      group = 'Build report';
    } else if (entry.step === 'suggest-fixes') {
      group = 'Suggest fixes';
    }

    const list = buckets.get(group) ?? [];
    list.push(entry);
    buckets.set(group, list);
  }

  return order
    .filter((group) => buckets.has(group))
    .map((group) => ({ group, entries: buckets.get(group)! }));
}
