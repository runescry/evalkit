import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('scaffold', () => {
  it('has Next.js app directory and config', () => {
    expect(existsSync('app/page.tsx')).toBe(true);
    expect(existsSync('next.config.ts')).toBe(true);
    expect(existsSync('vercel.json')).toBe(true);
  });

  it('has shadcn components from slice 00b', () => {
    expect(existsSync('components/ui/button.tsx')).toBe(true);
    expect(existsSync('components.json')).toBe(true);
  });

  it('documents env vars without secrets', () => {
    expect(existsSync('.env.example')).toBe(true);
  });
});
