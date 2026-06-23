import { describe, expect, it } from 'vitest';
import { formatSseMessage } from './sse';

describe('formatSseMessage', () => {
  it('formats event and JSON data with blank line terminator', () => {
    const message = formatSseMessage('report', { markdown: '# Hi' });
    expect(message).toBe('event: report\ndata: {"markdown":"# Hi"}\n\n');
  });
});
