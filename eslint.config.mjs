// @ts-check
import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default defineConfig([
  {
    ignores: ['eslint.config.mjs', 'dist', 'node_modules', 'coverage'],
  },

  eslint.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.strictTypeChecked,

  eslintPluginPrettierRecommended,

  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    rules: {
      // -----------------------------
      // 🧠 TypeScript Best Practices
      // -----------------------------
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-misused-spread': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
        },
      ],

      // -----------------------------
      // 🛑 Unsafe Operations
      // -----------------------------
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',

      '@typescript-eslint/no-floating-promises': 'off',

      // -----------------------------
      // 🧹 Code Quality
      // -----------------------------
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'sort-imports': [
        'warn',
        {
          ignoreDeclarationSort: true,
        },
      ],

      // -----------------------------
      // 🎨 Prettier
      // -----------------------------
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto',
        },
      ],
    },
  },

  {
    files: ['**/*.module.ts', '**/*.service.ts', '**/*.controller.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
]);
