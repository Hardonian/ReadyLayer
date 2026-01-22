const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const nextPlugin = require('@next/eslint-plugin-next');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const globals = require('globals');

module.exports = [
  // Global ignores (must come first)
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      '*.config.js',
      '*.config.ts',
      'eslint.config.js',
      'next.config.js',
      'tailwind.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
      'postcss.config.js',
      // Test files excluded from tsconfig
      'tests/behavior/**',
      'tests/invariants/**',
      'workers/__tests__/**',
      'e2e/golden-path.test.ts',
      // All test files
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
  },

  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript and React files configuration
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        React: 'writable',
        JSX: 'writable',
        NodeJS: 'writable',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      '@next/next': nextPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      // Disable base no-unused-vars (TypeScript version is more accurate)
      'no-unused-vars': 'off',

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // React Hooks rules
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',

      // General JavaScript rules
      'no-console': ['warn', { allow: ['warn', 'error', 'log', 'info'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-useless-escape': 'warn',
      'no-case-declarations': 'warn',
      'no-useless-catch': 'warn',
      'no-undef': 'warn', // Downgraded to warning (TypeScript catches most issues)

      // Next.js specific rules (from next/core-web-vitals)
      '@next/next/no-html-link-for-pages': 'warn', // Allow in some legacy components
      '@next/next/no-sync-scripts': 'error',
      '@next/next/no-img-element': 'warn',
    },
  },
];
