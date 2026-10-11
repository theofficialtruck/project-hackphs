import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    rolldownOptions: {
      // Two pages: index.html belongs to the final UI, dev.html is the
      // temporary development/testing UI.
      input: {
        main: 'index.html',
        dev: 'dev.html',
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
