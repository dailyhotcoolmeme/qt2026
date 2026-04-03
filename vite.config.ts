import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// client/package.json의 version을 빌드 시 앱 버전으로 사용
const clientPkg = JSON.parse(readFileSync(path.resolve(__dirname, "client/package.json"), "utf-8"));
const APP_VERSION: string = process.env.APP_VERSION || clientPkg.version || "0.0.0";

export default defineConfig({
  plugins: [react()],
  define: {
    // OTA 버전 체크용 — appUpdate.ts에서 import.meta.env.VITE_APP_VERSION으로 접근
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(APP_VERSION),
  },
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
  resolve: {
    alias: {
      // 절대 경로를 더 확실하게 잡아줍니다.
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  // root와 build 경로를 Vercel 기본값에 맞게 단순화합니다.
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
});
