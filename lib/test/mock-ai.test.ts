import { describe, expect, it } from 'vitest';
import { mockGenerateText, mockStreamText } from './mock-ai';

describe('mock-ai', () => {
  it('mockGenerateText returns structured output', () => {
    const result = mockGenerateText({ ok: true });
    expect(result.output).toEqual({ ok: true });
    expect(result.usage?.inputTokens).toBeGreaterThan(0);
  });

  it('mockStreamText yields chunks in order', async () => {
    const chunks: string[] = [];
    for await (const chunk of mockStreamText(['a', 'b'])) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(['a', 'b']);
  });
});
