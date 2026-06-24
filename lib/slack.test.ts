import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  parseEvalCommandText,
  verifySlackSignature,
} from '@/lib/slack';

function signBody(secret: string, timestamp: string, body: string): string {
  const base = `v0:${timestamp}:${body}`;
  const digest = createHmac('sha256', secret).update(base, 'utf8').digest('hex');
  return `v0=${digest}`;
}

describe('parseEvalCommandText', () => {
  it('parses url, description, and optional case count', () => {
    const parsed = parseEvalCommandText(
      'https://example.com/chat | Fintech support bot --cases=12',
    );
    expect(parsed).toEqual({
      url: 'https://example.com/chat',
      description: 'Fintech support bot',
      caseCount: 12,
      generationMode: 'standard',
      scoringMode: 'dual',
      sandboxContract: 'message-json',
      sandboxTimeoutMs: 10_000,
    });
  });

  it('returns null for invalid url', () => {
    expect(parseEvalCommandText('not-a-url | desc')).toBeNull();
  });
});

describe('verifySlackSignature', () => {
  it('accepts valid signatures within the time window', () => {
    const secret = 'test-secret';
    const body = 'text=https%3A%2F%2Fexample.com';
    const timestamp = '1700000000';
    const signature = signBody(secret, timestamp, body);

    expect(
      verifySlackSignature({
        signingSecret: secret,
        signature,
        timestamp,
        rawBody: body,
        nowSec: 1700000000,
      }),
    ).toBe(true);
  });

  it('rejects stale timestamps', () => {
    const secret = 'test-secret';
    const body = 'text=hello';
    const timestamp = '1700000000';
    const signature = signBody(secret, timestamp, body);

    expect(
      verifySlackSignature({
        signingSecret: secret,
        signature,
        timestamp,
        rawBody: body,
        nowSec: 1700001000,
      }),
    ).toBe(false);
  });
});
