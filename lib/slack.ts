import { createHmac, timingSafeEqual } from 'node:crypto';
import { evalRunInputSchema, type EvalRunInput } from '@/lib/types';

const SLACK_SIGNATURE_VERSION = 'v0';
const MAX_SIGNATURE_AGE_SEC = 60 * 5;

export type SlackEvalCommand = EvalRunInput;

export type SlackPostMessageParams = {
  token: string;
  channel: string;
  text: string;
  threadTs?: string;
};

export type SlackPostMessageResult = {
  ok: boolean;
  ts?: string;
  error?: string;
};

declare global {
  var __EVALKIT_SLACK_FETCH__:
    | ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>)
    | undefined;
}

function slackFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const fetchImpl = globalThis.__EVALKIT_SLACK_FETCH__ ?? fetch;
  return fetchImpl(input, init);
}

export function verifySlackSignature(params: {
  signingSecret: string;
  signature: string | null;
  timestamp: string | null;
  rawBody: string;
  nowSec?: number;
}): boolean {
  const { signingSecret, signature, timestamp, rawBody, nowSec = Math.floor(Date.now() / 1000) } =
    params;

  if (!signature?.startsWith(`${SLACK_SIGNATURE_VERSION}=`) || !timestamp) {
    return false;
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > MAX_SIGNATURE_AGE_SEC) {
    return false;
  }

  const base = `${SLACK_SIGNATURE_VERSION}:${timestamp}:${rawBody}`;
  const digest = createHmac('sha256', signingSecret).update(base, 'utf8').digest('hex');
  const expected = `${SLACK_SIGNATURE_VERSION}=${digest}`;

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function parseEvalCommandText(text: string): SlackEvalCommand | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  let caseCount = 10;
  let payload = trimmed;

  const casesMatch = payload.match(/\s+--cases=(\d+)\s*$/);
  if (casesMatch) {
    caseCount = Number(casesMatch[1]);
    payload = payload.slice(0, casesMatch.index).trim();
  }

  const pipeIndex = payload.indexOf('|');
  const url = (pipeIndex >= 0 ? payload.slice(0, pipeIndex) : payload.split(/\s+/)[0] ?? '').trim();
  const description = (
    pipeIndex >= 0 ? payload.slice(pipeIndex + 1) : payload.slice(url.length)
  ).trim();

  const parsed = evalRunInputSchema.safeParse({ url, description, caseCount });
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export async function postSlackMessage(
  params: SlackPostMessageParams,
): Promise<SlackPostMessageResult> {
  const body = new URLSearchParams({
    channel: params.channel,
    text: params.text,
    ...(params.threadTs ? { thread_ts: params.threadTs } : {}),
  });

  const response = await slackFetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${params.token}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const json = (await response.json()) as SlackPostMessageResult;
  return json;
}

export function formatRunStatusMessage(runId: string, status: string, appOrigin?: string): string {
  const base = appOrigin?.replace(/\/$/, '') ?? '';
  const link = base ? `<${base}/runs/${runId}|${runId}>` : runId;
  return `Eval ${link} — *${status.replaceAll('_', ' ')}*`;
}

export async function postSlackThreadedRunUpdates(params: {
  token: string;
  channel: string;
  threadTs: string;
  runId: string;
  getRun: (runId: string) => Promise<{ status: string } | null>;
  appOrigin?: string;
  maxPolls?: number;
  pollMs?: number;
}): Promise<void> {
  const { token, channel, threadTs, runId, getRun, appOrigin } = params;
  const maxPolls = params.maxPolls ?? 30;
  const pollMs = params.pollMs ?? 2000;
  let lastStatus = '';

  for (let attempt = 0; attempt < maxPolls; attempt++) {
    const run = await getRun(runId);
    if (!run) {
      break;
    }

    if (run.status !== lastStatus) {
      lastStatus = run.status;
      await postSlackMessage({
        token,
        channel,
        threadTs,
        text: formatRunStatusMessage(runId, run.status, appOrigin),
      });
    }

    if (
      run.status === 'awaiting_approval' ||
      run.status === 'complete' ||
      run.status === 'failed'
    ) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}
