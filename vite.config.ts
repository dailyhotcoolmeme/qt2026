import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // 모든 자원을 현재 경로 기준으로 찾도록 설정 (빈 화면 해결 핵심)
  base: "./", 
  plugins: [
    react(),
    // 배포 시 에러를 유발할 수 있는 리플릿 전용 플러그인들을 제거했습니다.
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  // root 설정을 client로 유지하되, Vercel이 index.html을 찾을 수 있게 합니다.
  root: path.resolve(__dirname, "client"),
  build: {
    // 결과물이 배포 서버의 표준 위치에 저장되도록 설정
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});