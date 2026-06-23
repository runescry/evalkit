import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const storeMocks = vi.hoisted(() => ({
  createRun: vi.fn(),
  getRun: vi.fn(),
}));

const startMock = vi.hoisted(() => vi.fn());
const slackMocks = vi.hoisted(() => ({
  verifySlackSignature: vi.fn(),
  parseEvalCommandText: vi.fn(),
  postSlackMessage: vi.fn(),
  postSlackThreadedRunUpdates: vi.fn(),
}));

const afterMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/store', () => ({
  createRun: storeMocks.createRun,
  getRun: storeMocks.getRun,
}));

vi.mock('workflow/api', () => ({
  start: startMock,
}));

vi.mock('@/lib/slack', () => ({
  verifySlackSignature: slackMocks.verifySlackSignature,
  parseEvalCommandText: slackMocks.parseEvalCommandText,
  postSlackMessage: slackMocks.postSlackMessage,
  postSlackThreadedRunUpdates: slackMocks.postSlackThreadedRunUpdates,
}));

vi.mock('next/server', () => ({
  after: afterMock,
}));

const sampleRun = {
  id: 'run_slack1',
  createdAt: 1,
  status: 'pending' as const,
  input: {
    url: 'https://example.com/chat',
    description: 'Support bot',
    caseCount: 5,
  },
  testCases: [],
  results: [],
  report: null,
  suggestedFixes: null,
  approvedAt: null,
  error: null,
};

describe('POST /api/slack/eval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SLACK_BOT_TOKEN', 'xoxb-test');
    vi.stubEnv('SLACK_SIGNING_SECRET', 'secret');
    slackMocks.verifySlackSignature.mockReturnValue(true);
    slackMocks.parseEvalCommandText.mockReturnValue(sampleRun.input);
    storeMocks.createRun.mockResolvedValue(sampleRun);
    startMock.mockResolvedValue({ runId: 'wrun_slack' });
    slackMocks.postSlackMessage.mockResolvedValue({ ok: true, ts: '1234.5678' });
    slackMocks.postSlackThreadedRunUpdates.mockResolvedValue(undefined);
    afterMock.mockImplementation((callback: () => void) => callback());
  });

  it('starts a run and returns ephemeral confirmation', async () => {
    const body = new URLSearchParams({
      text: 'https://example.com/chat | Support bot',
      channel_id: 'C123',
      user_id: 'U123',
    }).toString();

    const request = new Request('http://localhost/api/slack/eval', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-slack-signature': 'v0=test',
        'x-slack-request-timestamp': '1700000000',
      },
      body,
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.response_type).toBe('ephemeral');
    expect(json.text).toContain('run_slack1');
    expect(storeMocks.createRun).toHaveBeenCalledWith(sampleRun.input);
    expect(startMock).toHaveBeenCalled();
    expect(slackMocks.postSlackMessage).toHaveBeenCalled();
    expect(afterMock).toHaveBeenCalled();
  });

  it('returns 401 for invalid signature', async () => {
    slackMocks.verifySlackSignature.mockReturnValue(false);

    const request = new Request('http://localhost/api/slack/eval', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'text=hello&channel_id=C123',
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 503 when Slack env is missing', async () => {
    vi.stubEnv('SLACK_BOT_TOKEN', '');
    vi.stubEnv('SLACK_SIGNING_SECRET', '');

    const request = new Request('http://localhost/api/slack/eval', {
      method: 'POST',
      body: 'text=hello',
    });

    const response = await POST(request);
    expect(response.status).toBe(503);
  });
});
