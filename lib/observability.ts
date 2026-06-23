import { createHash } from 'node:crypto';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { EvalkitCallMeta } from '@/lib/ai';
import type { RunMetrics } from '@/lib/types';
import { getRun, updateRun } from '@/workflows/store-bridge';

const TRACER_NAME = 'evalkit';

export function urlDomainOnly(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'invalid-url';
  }
}

export function hashDescription(description: string): string {
  return createHash('sha256').update(description).digest('hex').slice(0, 12);
}

export function scrubRunInputAttributes(input: {
  url?: string;
  description?: string;
}): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (input.url) {
    attrs['evalkit.target_domain'] = urlDomainOnly(input.url);
  }
  if (input.description) {
    attrs['evalkit.description_hash'] = hashDescription(input.description);
  }
  return attrs;
}

export function mergeAiCallIntoMetrics(
  metrics: RunMetrics | undefined,
  meta: EvalkitCallMeta,
): RunMetrics {
  const now = Date.now();
  const steps = metrics?.steps ? [...metrics.steps] : [];
  const stepName = meta.evalkitStep;
  const existingIndex = steps.findIndex((step) => step.step === stepName);
  const inputTokens = meta.inputTokens ?? 0;
  const outputTokens = meta.outputTokens ?? 0;
  const totalCost = meta.totalCost ?? 0;

  if (existingIndex >= 0) {
    const existing = steps[existingIndex]!;
    steps[existingIndex] = {
      step: stepName,
      latencyMs: existing.latencyMs + meta.latencyMs,
      inputTokens: existing.inputTokens + inputTokens,
      outputTokens: existing.outputTokens + outputTokens,
      totalCost: existing.totalCost + totalCost,
      callCount: existing.callCount + 1,
    };
  } else {
    steps.push({
      step: stepName,
      latencyMs: meta.latencyMs,
      inputTokens,
      outputTokens,
      totalCost,
      callCount: 1,
    });
  }

  return summarizeRunMetrics(steps, (metrics?.aiCallCount ?? 0) + 1, now);
}

export function mergeWorkflowStepLatency(
  metrics: RunMetrics | undefined,
  stepName: string,
  latencyMs: number,
): RunMetrics {
  const now = Date.now();
  const steps = metrics?.steps ? [...metrics.steps] : [];
  const existingIndex = steps.findIndex((step) => step.step === stepName);

  if (existingIndex >= 0) {
    const existing = steps[existingIndex]!;
    steps[existingIndex] = {
      ...existing,
      latencyMs: existing.latencyMs + latencyMs,
    };
  } else {
    steps.push({
      step: stepName,
      latencyMs,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
      callCount: 0,
    });
  }

  return summarizeRunMetrics(steps, metrics?.aiCallCount ?? 0, now);
}

function summarizeRunMetrics(
  steps: RunMetrics['steps'],
  aiCallCount: number,
  updatedAt: number,
): RunMetrics {
  return {
    steps,
    totalCost: steps.reduce((sum, step) => sum + step.totalCost, 0),
    totalLatencyMs: steps.reduce((sum, step) => sum + step.latencyMs, 0),
    aiCallCount,
    updatedAt,
  };
}

export function emptyRunMetrics(updatedAt: number): RunMetrics {
  return {
    steps: [],
    totalCost: 0,
    totalLatencyMs: 0,
    aiCallCount: 0,
    updatedAt,
  };
}

export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: () => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer(TRACER_NAME);
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await fn();
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}

function aiSpanAttributes(runId: string, meta: EvalkitCallMeta): Record<string, string | number> {
  return {
    'evalkit.run_id': runId,
    'evalkit.step': meta.evalkitStep,
    'evalkit.tier': meta.evalkitTier,
    'evalkit.latency_ms': meta.latencyMs,
    'evalkit.input_tokens': meta.inputTokens ?? 0,
    'evalkit.output_tokens': meta.outputTokens ?? 0,
    'evalkit.total_cost': meta.totalCost ?? 0,
    ...(meta.modelId ? { 'evalkit.model_id': meta.modelId } : {}),
    ...(meta.generationId ? { 'evalkit.generation_id': meta.generationId } : {}),
  };
}

export async function recordAiCallMetrics(runId: string, meta: EvalkitCallMeta): Promise<void> {
  const run = await getRun(runId);
  if (!run) {
    return;
  }

  const metrics = mergeAiCallIntoMetrics(run.metrics, meta);
  await updateRun(runId, { metrics });
}

export async function recordAiCallWithSpan(runId: string, meta: EvalkitCallMeta): Promise<void> {
  await withSpan(`evalkit.ai.${meta.evalkitStep}`, aiSpanAttributes(runId, meta), async () => {
    await recordAiCallMetrics(runId, meta);
  });
}

export async function recordWorkflowStepMetrics(
  runId: string,
  stepName: string,
  latencyMs: number,
): Promise<void> {
  const run = await getRun(runId);
  if (!run) {
    return;
  }

  const metrics = mergeWorkflowStepLatency(run.metrics, stepName, latencyMs);
  await updateRun(runId, { metrics });
}

export type ObserveWorkflowStepOptions = {
  recordStepLatency?: boolean;
};

export async function observeWorkflowStep<T>(
  runId: string,
  stepName: string,
  fn: () => Promise<T>,
  options: ObserveWorkflowStepOptions = {},
): Promise<T> {
  const run = await getRun(runId);
  const attributes = {
    'evalkit.run_id': runId,
    'evalkit.step': stepName,
    ...scrubRunInputAttributes({
      url: run?.input.url,
      description: run?.input.description,
    }),
  };

  const started = Date.now();
  return withSpan(`evalkit.workflow.${stepName}`, attributes, async () => {
    const result = await fn();
    const latencyMs = Date.now() - started;
    if (options.recordStepLatency) {
      await recordWorkflowStepMetrics(runId, stepName, latencyMs);
    }
    return result;
  });
}
