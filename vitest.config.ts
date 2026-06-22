import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts', 'agents/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['tests/integration/**', 'app/api/**/*.contract.test.ts'],
  },
});
