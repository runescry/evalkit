import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.crud.test.ts'],
  },
});
