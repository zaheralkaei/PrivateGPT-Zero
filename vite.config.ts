import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'web-llm': ['@mlc-ai/web-llm'],
          'markdown': ['react-markdown', 'remark-gfm', 'react-syntax-highlighter'],
          'pdf': ['pdfjs-dist'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
});