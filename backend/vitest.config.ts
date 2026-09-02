import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    setupFiles: ['src/tests/setup.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    pool: 'forks',
    fileParallelism: false,
  },
});