import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic', // React is not defined 에러 해결 핵심
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // root가 client이므로 빌드 결과물은 dist에 생깁니다.
  build: {
    outDir: 'dist',
  },
});
