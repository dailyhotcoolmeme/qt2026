/**
 * OTA 번들 업로드 스크립트 (wrangler CLI 방식)
 *
 * 사용법:
 *   APP_VERSION=1.0.3 node scripts/upload-bundle.mjs [android|ios|both]
 *
 * 필요 조건:
 *   npx wrangler login 으로 Cloudflare 인증 완료
 *   R2_BUCKET_NAME (.env 또는 기본값: myamen-assets)
 *   R2_PUBLIC_URL  (.env 또는 기본값)
 *   APP_VERSION    (예: APP_VERSION=1.0.3 ...)
 */

import { execSync, execFileSync } from "child_process";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve } from "path";

// ── 환경변수 로드 ──────────────────────────────────────────────────────────────
const envPath = new URL("../.env", import.meta.url).pathname;
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const {
  R2_BUCKET_NAME = "myamen-assets",
  R2_PUBLIC_URL = "https://pub-240da6bd4a6140de8f7f6bfca3372b13.r2.dev",
  APP_VERSION,
} = process.env;

if (!APP_VERSION) {
  console.error("❌ APP_VERSION 환경변수가 없습니다. 예: APP_VERSION=1.0.3 node scripts/upload-bundle.mjs");
  process.exit(1);
}

const distDir = resolve(new URL("../dist", import.meta.url).pathname);
if (!existsSync(distDir)) {
  console.error(`❌ dist/ 디렉토리가 없습니다. 먼저 빌드를 실행하세요: npm run build`);
  process.exit(1);
}

const platforms = (process.argv[2] || "both") === "both"
  ? ["android", "ios"]
  : [process.argv[2]];

// ── 번들 zip 생성 ──────────────────────────────────────────────────────────────
const tmpZip = `/tmp/myamen-bundle-${APP_VERSION}.zip`;
console.log(`📦 dist/ → ${tmpZip} 압축 중...`);
execSync(`cd "${distDir}" && zip -r "${tmpZip}" . -x "*.DS_Store"`, { stdio: "inherit" });

const bundleKey = `app-bundles/bundle-${APP_VERSION}.zip`;
const bundleUrl = `${R2_PUBLIC_URL}/${bundleKey}`;

// ── wrangler로 번들 zip 업로드 ─────────────────────────────────────────────────
console.log(`⬆️  R2에 번들 업로드: ${bundleKey}`);
execSync(
  `npx wrangler r2 object put "${R2_BUCKET_NAME}/${bundleKey}" --file "${tmpZip}" --content-type "application/zip" --remote`,
  { stdio: "inherit" }
);
console.log(`✅ 번들 업로드 완료: ${bundleUrl}`);

// ── 플랫폼별 version.json 업데이트 ────────────────────────────────────────────
for (const platform of platforms) {
  const versionInfo = JSON.stringify({
    latestVersion: APP_VERSION,
    bundleUrl,
    updatedAt: new Date().toISOString(),
  });
  const tmpJson = `/tmp/myamen-version-${platform}.json`;
  writeFileSync(tmpJson, versionInfo);

  const versionKey = `app-bundles/version-${platform}.json`;
  console.log(`📝 ${versionKey} 업데이트...`);
  execSync(
    `npx wrangler r2 object put "${R2_BUCKET_NAME}/${versionKey}" --file "${tmpJson}" --content-type "application/json" --remote`,
    { stdio: "inherit" }
  );
  console.log(`✅ ${platform} 버전 정보 업데이트: v${APP_VERSION}`);
}

console.log("\n🎉 OTA 번들 배포 완료!");
console.log(`   버전: ${APP_VERSION}`);
console.log(`   플랫폼: ${platforms.join(", ")}`);
console.log(`   번들 URL: ${bundleUrl}`);
