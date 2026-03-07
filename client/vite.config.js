import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic', // React is not defined 에러 해결 핵심
    }),
  ],
  server: {
    // When running the client dev server on :5173, proxy API calls to the Express server on :5000.
    // This avoids 404s from Vite and avoids CORS issues.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
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
