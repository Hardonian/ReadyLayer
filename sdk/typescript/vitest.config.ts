import { defineConfig } from 'vitest/config';

export default defineConfig({
  css: {
    postcss: { plugins: [] },
  },
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/__tests__/**'],
    },
  },
});
