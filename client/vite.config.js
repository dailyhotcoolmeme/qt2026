import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      // "React is not defined" 에러를 해결하는 핵심 설정
      jsxRuntime: 'automatic',
    }),
  ],
  resolve: {
    alias: {
      // @ 경로를 src 폴더로 인식하게 합니다.
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
  },
});
