/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves the build from /Trivia-React/
  base: command === 'build' ? '/Trivia-React/' : '/',
  test: {
    environment: 'happy-dom',
    setupFiles: ['src/test/setup.ts'],
  },
}));
