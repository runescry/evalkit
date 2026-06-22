import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { workflow } from '@workflow/vitest';

export default defineConfig({
  plugins: [workflow()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 60_000,
    execArgv: ['--import', 'tsx'],
  },
});
