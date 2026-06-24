import { beforeEach, describe, expect, it, vi } from 'vitest';
import { evalRunInputSchema } from '@/lib/types';
import fintechFixture from '@/fixtures/fintech-chatbot.json';
import {
  SANDBOX_FANOUT,
  SANDBOX_TIMEOUT_MS,
  buildUnscoredTestResult,
  executeDirectHttpRequest,
  parseSandboxCommandOutput,
  payloadToSandboxResult,
  responseTextFromPayload,
  runTestCaseInSandbox,
  runTestCasesInSandbox,
  targetDomain,
} from './run-sandbox';
import type { TestCase } from '@/lib/types';

const sandboxMocks = vi.hoisted(() => ({
  create: vi.fn(),
  runCommand: vi.fn(),
  stop: vi.fn(),
}));

vi.mock('@vercel/sandbox', () => ({
  Sandbox: {
    create: sandboxMocks.create,
  },
}));

function defaultRunInput() {
  return evalRunInputSchema.parse(fintechFixture);
}

const testCase: TestCase = {
  id: 'tc_run_1',
  category: 'edge_case',
  input: 'What is my balance?',
  expectedBehavior: 'Ask for authentication',
};

describe('run-sandbox helpers', () => {
  it('targetDomain returns hostname only', () => {
    expect(targetDomain('https://support.example-fintech.com/chat?q=1')).toBe(
      'support.example-fintech.com',
    );
  });

  it('parseSandboxCommandOutput reads the last JSON line', () => {
    const payload = parseSandboxCommandOutput(
      'noise\n{"statusCode":200,"body":"ok","latencyMs":42,"timedOut":false,"error":null}\n',
    );
    expect(payload).toMatchObject({
      statusCode: 200,
      body: 'ok',
      latencyMs: 42,
      timedOut: false,
      error: null,
    });
  });

  it('buildUnscoredTestResult leaves scoring fields empty', () => {
    const result = buildUnscoredTestResult(
      testCase.id,
      {
        statusCode: 200,
        body: 'ok',
        latencyMs: 10,
        timedOut: false,
        error: null,
      },
      'ok',
    );

    expect(result).toMatchObject({
      testCaseId: testCase.id,
      response: 'ok',
      scores: null,
      total: null,
      flagged: false,
      reasoning: null,
    });
  });
});

describe('runTestCaseInSandbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete globalThis.__EVALKIT_RUN_SANDBOX__;
    sandboxMocks.stop.mockResolvedValue(undefined);
    sandboxMocks.create.mockResolvedValue({
      runCommand: sandboxMocks.runCommand,
      stop: sandboxMocks.stop,
    });
    sandboxMocks.runCommand.mockResolvedValue({
      stdout: vi.fn().mockResolvedValue(
        '{"statusCode":200,"body":"hello back","latencyMs":15,"timedOut":false,"error":null}',
      ),
    });
  });

  it('uses one Vercel sandbox per case with a 10s timeout', async () => {
    const result = await runTestCaseInSandbox({
      runInput: defaultRunInput(),
      testCase,
    });

    expect(sandboxMocks.create).toHaveBeenCalledWith({
      timeout: SANDBOX_TIMEOUT_MS,
      runtime: 'node22',
    });
    expect(sandboxMocks.runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        cmd: 'node',
        env: expect.objectContaining({
          EVALKIT_TARGET_URL: fintechFixture.url,
          EVALKIT_REQUEST_BODY: JSON.stringify({ message: testCase.input }),
          EVALKIT_TIMEOUT_MS: String(SANDBOX_TIMEOUT_MS),
        }),
      }),
    );
    expect(sandboxMocks.stop).toHaveBeenCalled();
    expect(result.response).toBe('hello back');
    expect(result.sandbox.statusCode).toBe(200);
    expect(result.sandbox.unverified).toBe(false);
  });

  it('falls back to direct HTTP when sandbox creation fails', async () => {
    sandboxMocks.create.mockRejectedValue(new Error('Sandbox quota exceeded'));
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      text: vi.fn().mockResolvedValue('direct response'),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await runTestCaseInSandbox({
      runInput: defaultRunInput(),
      testCase,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      fintechFixture.url,
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: testCase.input }),
      }),
    );
    expect(result.response).toBe('direct response');
    expect(result.sandbox.unverified).toBe(true);
    expect(result.sandbox.statusCode).toBe(200);

    vi.unstubAllGlobals();
  });

  it('executeDirectHttpRequest mirrors sandbox POST payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 502,
      text: vi.fn().mockResolvedValue('bad gateway'),
    });
    vi.stubGlobal('fetch', fetchMock);

    const payload = await executeDirectHttpRequest('https://example.com/chat', {
      message: 'ping',
    });

    expect(payload).toMatchObject({
      statusCode: 502,
      body: 'bad gateway',
      timedOut: false,
      error: null,
    });

    vi.unstubAllGlobals();
  });

  it('honors the integration test hook without calling Vercel', async () => {
    globalThis.__EVALKIT_RUN_SANDBOX__ = vi.fn().mockResolvedValue(
      buildUnscoredTestResult(testCase.id, {
        statusCode: 200,
        body: 'hooked',
        latencyMs: 1,
        timedOut: false,
        error: null,
      }, 'hooked'),
    );

    const result = await runTestCaseInSandbox({
      runInput: defaultRunInput(),
      testCase,
    });

    expect(globalThis.__EVALKIT_RUN_SANDBOX__).toHaveBeenCalled();
    expect(sandboxMocks.create).not.toHaveBeenCalled();
    expect(result.response).toBe('hooked');
  });
});

describe('runTestCasesInSandbox', () => {
  beforeEach(() => {
    delete globalThis.__EVALKIT_RUN_SANDBOX__;
  });

  it('fans out at most five concurrent cases per batch', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    globalThis.__EVALKIT_RUN_SANDBOX__ = vi.fn(async ({ testCase: currentCase }) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return buildUnscoredTestResult(currentCase.id, {
        statusCode: 200,
        body: 'ok',
        latencyMs: 5,
        timedOut: false,
        error: null,
      }, 'ok');
    });

    const cases = Array.from({ length: 7 }, (_, index) => ({
      ...testCase,
      id: `tc_${index + 1}`,
      input: `message ${index + 1}`,
    }));

    const results = await runTestCasesInSandbox(defaultRunInput(), cases, SANDBOX_FANOUT);

    expect(results).toHaveLength(7);
    expect(maxInFlight).toBeLessThanOrEqual(SANDBOX_FANOUT);
    expect(globalThis.__EVALKIT_RUN_SANDBOX__).toHaveBeenCalledTimes(7);
  });
});

describe('sandbox response normalization', () => {
  it('extracts JSON response wrapper from direct HTTP', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify({ response: 'Hello', mode: 'fast' }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const payload = await executeDirectHttpRequest('https://example.com/chat', {
      message: 'hi',
    });
    expect(responseTextFromPayload(payload)).toBe('Hello');
    expect(payloadToSandboxResult(payload, false, 'message-json').scopeRejected).toBeUndefined();
  });

  it('flags 422 full_path_required as scope reject', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 422,
      text: async () =>
        JSON.stringify({ error: 'full_path_required', hint: 'fast-chat only' }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const payload = await executeDirectHttpRequest('https://example.com/chat', {
      message: 'send email',
    });
    const sandbox = payloadToSandboxResult(payload, false, 'message-json');
    expect(sandbox.scopeRejected).toBe(true);
    expect(responseTextFromPayload(payload)).toContain('full_path_required');
  });

  it('parses harness-json toolCalls from direct HTTP', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      text: async () =>
        JSON.stringify({
          response: 'Triage complete',
          toolCalls: [{ name: 'gmail_read', input: { query: 'is:unread' } }],
          validation: { ok: true },
        }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const payload = await executeDirectHttpRequest('https://example.com/api/eval/agent', {
      agentId: 'inbox-triage',
      mission: 'triage',
    });
    const sandbox = payloadToSandboxResult(payload, false, 'harness-json', 'inbox-triage');
    expect(sandbox.toolCalls).toHaveLength(1);
    expect(sandbox.validationOk).toBe(true);
    expect(responseTextFromPayload(payload, 'harness-json')).toBe('Triage complete');
  });
});
