import { streamWithTier } from '@/lib/ai';
import { recordLlmTrace } from '@/lib/llm-trace';
import { recordAiCallWithSpan } from '@/lib/observability';
import { BUILD_REPORT_PROMPT, getBuildReportPromptMeta } from '@/lib/prompts';
import { reportSchema, type Report, type TestCase, type TestResult } from '@/lib/types';
import { updateRun } from '@/workflows/store-bridge';

export const REPORT_KV_FLUSH_CHARS = 120;

export type BuildReportParams = {
  description: string;
  testCases: TestCase[];
  results: TestResult[];
};

export type BuildReportResult = {
  report: Report;
  promptVersion: { version: string; hash: string };
};

declare global {
  var __EVALKIT_BUILD_REPORT__:
    | ((runId: string, params: BuildReportParams) => Promise<BuildReportResult>)
    | undefined;
}

export function extractReportSummary(markdown: string): string | undefined {
  const lines = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  const summary = lines.find((line) => !line.startsWith('|') && !line.startsWith('-'));
  if (!summary) {
    return undefined;
  }

  return summary.slice(0, 280);
}

export async function buildReport(
  runId: string,
  params: BuildReportParams,
): Promise<BuildReportResult> {
  if (globalThis.__EVALKIT_BUILD_REPORT__) {
    return globalThis.__EVALKIT_BUILD_REPORT__(runId, params);
  }

  return buildReportWithAi(runId, params);
}

async function buildReportWithAi(
  runId: string,
  params: BuildReportParams,
): Promise<BuildReportResult> {
  const promptVersion = getBuildReportPromptMeta();
  const userPrompt = BUILD_REPORT_PROMPT.buildUserPrompt({
    description: params.description,
    testCases: params.testCases,
    results: params.results,
  });

  const stream = streamWithTier({
    tier: 'strong',
    step: 'build-report',
    runId,
    system: BUILD_REPORT_PROMPT.system,
    prompt: userPrompt,
  });

  let markdown = '';
  let charsSinceFlush = 0;

  await updateRun(runId, {
    report: { markdown: '', summary: undefined },
  });

  for await (const chunk of stream.textStream) {
    markdown += chunk;
    charsSinceFlush += chunk.length;

    if (charsSinceFlush >= REPORT_KV_FLUSH_CHARS) {
      charsSinceFlush = 0;
      await updateRun(runId, {
        report: {
          markdown,
          summary: extractReportSummary(markdown),
        },
      });
    }
  }

  const report = reportSchema.parse({
    markdown: markdown.trim(),
    summary: extractReportSummary(markdown),
  });

  const streamMeta = await stream.evalkit;
  await recordAiCallWithSpan(runId, streamMeta);

  await recordLlmTrace(runId, {
    step: 'build-report',
    tier: 'strong',
    system: BUILD_REPORT_PROMPT.system,
    user: userPrompt,
    assistant: report.markdown,
    assistantFormat: 'markdown',
    evalkit: streamMeta,
  });

  await updateRun(runId, { report });

  return { report, promptVersion };
}
