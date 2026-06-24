import { describe, expect, it } from 'vitest';
import { normalizeHarnessCapture, normalizeSandboxCapture } from '@/lib/sandbox-response';

describe('normalizeSandboxCapture', () => {
  it('extracts response field from 200 JSON wrapper', () => {
    const result = normalizeSandboxCapture(
      200,
      JSON.stringify({ response: 'Hello from fast chat', mode: 'fast' }),
    );
    expect(result.responseText).toBe('Hello from fast chat');
    expect(result.scopeRejected).toBe(false);
  });

  it('marks 422 full_path_required as scope reject', () => {
    const result = normalizeSandboxCapture(
      422,
      JSON.stringify({
        error: 'full_path_required',
        hint: 'This eval endpoint only supports fast-chat prompts.',
      }),
    );
    expect(result.scopeRejected).toBe(true);
    expect(result.responseText).toContain('full_path_required');
  });

  it('passes through plain text bodies', () => {
    const result = normalizeSandboxCapture(200, 'plain text');
    expect(result.responseText).toBe('plain text');
    expect(result.scopeRejected).toBe(false);
  });

  it('parses harness-json response with toolCalls', () => {
    const result = normalizeHarnessCapture(
      200,
      JSON.stringify({
        response: 'Done',
        toolCalls: [{ name: 'kb_read' }],
        validation: { ok: true },
      }),
    );
    expect(result.responseText).toBe('Done');
    expect(result.toolCalls).toEqual([{ name: 'kb_read' }]);
    expect(result.validationOk).toBe(true);
  });

  it('parses harness validation errors and warnings', () => {
    const result = normalizeHarnessCapture(
      200,
      JSON.stringify({
        response: 'Summary',
        toolCalls: [{ name: 'gmail_read', input: { query: 'is:unread' } }],
        validation: {
          ok: false,
          errors: ['write_state was not called'],
          warnings: ['kb_read was not called (profile context may be incomplete)'],
        },
      }),
    );
    expect(result.validationOk).toBe(false);
    expect(result.validationErrors).toEqual(['write_state was not called']);
    expect(result.validationWarnings).toContain(
      'kb_read was not called (profile context may be incomplete)',
    );
  });
});
