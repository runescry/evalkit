import { Sandbox } from '@vercel/sandbox';
import type { SandboxResult, TestCase, TestResult } from '@/lib/types';

export const SANDBOX_TIMEOUT_MS = 10_000;
export const SANDBOX_FANOUT = 5;

export type RunSandboxParams = {
  targetUrl: string;
  testCase: TestCase;
};

declare global {
  var __EVALKIT_RUN_SANDBOX__:
    | ((params: RunSandboxParams) => Promise<TestResult>)
    | undefined;
}

const SANDBOX_REQUEST_SCRIPT = `
const url = process.env.EVALKIT_TARGET_URL;
const message = process.env.EVALKIT_MESSAGE;
const timeoutMs = Number(process.env.EVALKIT_TIMEOUT_MS || '10000');
const started = Date.now();
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    });
    const body = await res.text();
    console.log(JSON.stringify({
      statusCode: res.status,
      body,
      latencyMs: Date.now() - started,
      timedOut: false,
      error: null,
    }));
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError';
    console.log(JSON.stringify({
      statusCode: null,
      body: null,
      latencyMs: Date.now() - started,
      timedOut,
      error: timedOut ? 'Request timed out' : (err instanceof Error ? err.message : String(err)),
    }));
  } finally {
    clearTimeout(timer);
  }
})();
`.trim();

type SandboxCommandPayload = {
  statusCode: number | null;
  body: string | null;
  latencyMs: number | null;
  timedOut: boolean;
  error: string | null;
};

export function targetDomain(url: string): string {
  return new URL(url).hostname;
}

export function parseSandboxCommandOutput(stdout: string): SandboxCommandPayload {
  const lines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const lastLine = lines.at(-1);
  if (!lastLine) {
    throw new Error('Sandbox command produced no output');
  }

  const parsed = JSON.parse(lastLine) as Partial<SandboxCommandPayload>;
  return {
    statusCode: parsed.statusCode ?? null,
    body: parsed.body ?? null,
    latencyMs: parsed.latencyMs ?? null,
    timedOut: parsed.timedOut ?? false,
    error: parsed.error ?? null,
  };
}

/** Direct HTTP POST — same payload as the sandbox script. See ADR-007 in docs/DECISIONS.md. */
export async function executeDirectHttpRequest(
  targetUrl: string,
  message: string,
  timeoutMs: number = SANDBOX_TIMEOUT_MS,
): Promise<SandboxCommandPayload> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    });
    const body = await res.text();
    return {
      statusCode: res.status,
      body,
      latencyMs: Date.now() - started,
      timedOut: false,
      error: null,
    };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError';
    return {
      statusCode: null,
      body: null,
      latencyMs: Date.now() - started,
      timedOut,
      error: timedOut ? 'Request timed out' : err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

export function payloadToSandboxResult(
  payload: SandboxCommandPayload,
  unverified: boolean,
): SandboxResult {
  return {
    statusCode: payload.statusCode,
    body: payload.body,
    latencyMs: payload.latencyMs,
    timedOut: payload.timedOut,
    error: payload.error,
    unverified,
  };
}

export function buildUnscoredTestResult(
  testCaseId: string,
  sandbox: SandboxResult,
  response: string | null,
): TestResult {
  return {
    testCaseId,
    response,
    sandbox,
    scores: null,
    total: null,
    flagged: false,
    reasoning: null,
  };
}

export async function runTestCaseInSandbox(params: RunSandboxParams): Promise<TestResult> {
  if (globalThis.__EVALKIT_RUN_SANDBOX__) {
    return globalThis.__EVALKIT_RUN_SANDBOX__(params);
  }

  return runTestCaseInVercelSandbox(params);
}

async function runTestCaseInVercelSandbox(params: RunSandboxParams): Promise<TestResult> {
  const { targetUrl, testCase } = params;
  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.create({
      timeout: SANDBOX_TIMEOUT_MS,
      runtime: 'node22',
    });

    const finished = await sandbox.runCommand({
      cmd: 'node',
      args: ['-e', SANDBOX_REQUEST_SCRIPT],
      env: {
        EVALKIT_TARGET_URL: targetUrl,
        EVALKIT_MESSAGE: testCase.input,
        EVALKIT_TIMEOUT_MS: String(SANDBOX_TIMEOUT_MS),
      },
    });

    const stdout = await finished.stdout();
    const payload = parseSandboxCommandOutput(stdout);
    const sandboxResult = payloadToSandboxResult(payload, false);

    return buildUnscoredTestResult(testCase.id, sandboxResult, payload.body);
  } catch {
    // ADR-007: prefer completing the run over hard-failing when sandbox infra is unavailable.
    const payload = await executeDirectHttpRequest(targetUrl, testCase.input);
    const sandboxResult = payloadToSandboxResult(payload, true);

    return buildUnscoredTestResult(testCase.id, sandboxResult, payload.body);
  } finally {
    if (sandbox) {
      await sandbox.stop().catch(() => undefined);
    }
  }
}

export async function runTestCasesInSandbox(
  targetUrl: string,
  testCases: TestCase[],
  concurrency: number = SANDBOX_FANOUT,
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (let offset = 0; offset < testCases.length; offset += concurrency) {
    const batch = testCases.slice(offset, offset + concurrency);
    const batchResults = await Promise.all(
      batch.map((testCase) => runTestCaseInSandbox({ targetUrl, testCase })),
    );
    results.push(...batchResults);
  }

  return results;
}
