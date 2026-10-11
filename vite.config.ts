import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    rolldownOptions: {
      // Two pages: the game (index.html) and the numbers page (dev.html).
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
