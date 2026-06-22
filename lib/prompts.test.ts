import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import { GENERATE_CASES_PROMPT, getGenerateCasesPromptMeta, hashPrompt } from './prompts';

describe('lib/prompts', () => {
  it('hashPrompt returns stable sha256 prefix', () => {
    const hash = hashPrompt('hello\nworld');
    const expected = createHash('sha256').update('hello\nworld', 'utf8').digest('hex');
    expect(hash).toBe(`sha256:${expected}`);
  });

  it('getGenerateCasesPromptMeta exposes version and hash of system prompt', () => {
    const meta = getGenerateCasesPromptMeta();
    expect(meta.version).toBe(GENERATE_CASES_PROMPT.version);
    expect(meta.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
