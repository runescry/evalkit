import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['app/api/**/*.contract.test.ts'],
  },
});
