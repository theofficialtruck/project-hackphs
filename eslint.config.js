import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default defineConfig([
  globalIgnores(['dist/', 'coverage/']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    // The engine must never depend on UI code (temporary or final).
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/dev-ui', '**/dev-ui/**', '**/ui', '**/ui/**'],
              message: 'The engine (src/core) must not import UI code.',
            },
          ],
        },
      ],
    },
  },
  // Must be last: turns off style rules that would fight with Prettier.
  prettier,
]);
