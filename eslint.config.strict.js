/**
 * Stricter ESLint Configuration
 *
 * This file contains stricter lint rules that can be enabled once
 * all warnings in the lib/ directory are cleared.
 *
 * To enable:
 * 1. Fix all warnings in lib/ directory
 * 2. Copy contents of this file to eslint.config.js
 * 3. Run npm run lint to verify
 */

const safeRequire = (moduleName) => {
  try {
    return require(moduleName)
  } catch {
    return null
  }
}

const globalsModule = safeRequire('globals')
const js = safeRequire('@eslint/js')
const tseslint = safeRequire('@typescript-eslint/eslint-plugin')
const tsparser = safeRequire('@typescript-eslint/parser')
const nextPlugin = safeRequire('@next/eslint-plugin-next')
const reactPlugin = safeRequire('eslint-plugin-react')
const reactHooksPlugin = safeRequire('eslint-plugin-react-hooks')

const baseRecommended = js?.configs?.recommended ?? { rules: {} }
const globals = globalsModule ?? { browser: {}, node: {}, es2021: {} }

const baseRules = {
  'no-console': ['warn', { allow: ['warn', 'error', 'log', 'info'] }],
  'prefer-const': 'error',
  'no-var': 'error',
  'no-useless-escape': 'warn',
  'no-case-declarations': 'warn',
  'no-useless-catch': 'warn',
  'no-undef': 'warn',
}

const config = [
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
      'tests/behavior/**',
      'tests/invariants/**',
      'workers/__tests__/**',
      'e2e/golden-path.test.ts',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
  },
  baseRecommended,
]

const jsPlugins = {}
if (reactPlugin) jsPlugins['react'] = reactPlugin
if (reactHooksPlugin) jsPlugins['react-hooks'] = reactHooksPlugin

if (Object.keys(jsPlugins).length > 0) {
  config.push({
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: jsPlugins,
    rules: {
      ...baseRules,
      ...(reactHooksPlugin
        ? { 'react-hooks/exhaustive-deps': 'warn', 'react-hooks/rules-of-hooks': 'error' }
        : {}),
    },
  })
}

if (tsparser && tseslint) {
  const tsPlugins = {
    '@typescript-eslint': tseslint,
  }
  if (nextPlugin) tsPlugins['@next/next'] = nextPlugin
  if (reactPlugin) tsPlugins['react'] = reactPlugin
  if (reactHooksPlugin) tsPlugins['react-hooks'] = reactHooksPlugin

  const tsRules = {
    'no-unused-vars': 'off',
    ...baseRules,
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    // STRICT RULES - Only enable after fixing all warnings
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/no-unsafe-argument': 'error',
    // Require explicit return types for better documentation
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
  }

  if (reactHooksPlugin) {
    tsRules['react-hooks/exhaustive-deps'] = 'warn'
    tsRules['react-hooks/rules-of-hooks'] = 'error'
  }

  if (nextPlugin) {
    tsRules['@next/next/no-html-link-for-pages'] = 'warn'
    tsRules['@next/next/no-sync-scripts'] = 'error'
    tsRules['@next/next/no-img-element'] = 'warn'
  }

  config.push({
    files: ['**/*.{ts,tsx}'],
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
    plugins: tsPlugins,
    rules: tsRules,
  })

  // Library code - STRICTEST rules
  config.push({
    files: ['lib/**/*.ts', 'sdk/typescript/src/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
    },
  })

  // App Router pages - slightly relaxed
  config.push({
    files: ['app/**/*.ts', 'app/**/*.tsx'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  })

  // Components - relaxed for JSX
  config.push({
    files: ['components/**/*.ts', 'components/**/*.tsx'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  })
}

module.exports = config
