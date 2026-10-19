import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    watch: false,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts']
  }
});

