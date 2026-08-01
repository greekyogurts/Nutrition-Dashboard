// vitest/config re-exports Vite's defineConfig with the `test` field merged
// into its type, so the block below type-checks -- plain 'vite' doesn't
// know about it.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Served from https://greekyogurts.github.io/Nutrition-Dashboard/ — a project
  // page, not a user page, so assets live under the repo subpath. Getting this
  // wrong 404s every asset while index.html itself still loads, which looks
  // like a blank app rather than a config error.
  base: '/Nutrition-Dashboard/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    typecheck: { enabled: false },
  },
});
