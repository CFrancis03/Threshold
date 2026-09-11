/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Hash routing means the built site drops onto any static host with no rewrite rules.
  base: './',
  build: { target: 'es2022', cssCodeSplit: false },
  test: {
    globals: true,
    // Node by default (the maths tests are the bulk and need no DOM); component
    // tests opt in with a `@vitest-environment jsdom` docblock.
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
