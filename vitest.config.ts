import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['lib/**/*.test.ts', 'agents/**/*.test.ts', 'workflows/**/*.test.ts'],
    exclude: ['tests/integration/**', 'app/api/**/*.contract.test.ts', 'lib/**/*.crud.test.ts'],
  },
});
