/**
 * OTA 번들 빌드 + 업로드 스크립트 (wrangler CLI 방식)
 *
 * 사용법:
 *   APP_VERSION=1.0.12 node scripts/upload-bundle.mjs [android|ios|both]
 *
 * 이 스크립트는:
 *   1. APP_VERSION을 번들에 굽기 위해 npm run build를 재실행
 *   2. client/package.json version을 APP_VERSION으로 동기화
 *   3. dist/를 zip으로 묶어 R2에 업로드
 *   4. version-{platform}.json 업데이트
 */

import { execSync } from "child_process";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve } from "path";

// ── 환경변수 로드 ──────────────────────────────────────────────────────────────
const scriptDir = new URL(".", import.meta.url).pathname;
const rootDir   = resolve(scriptDir, "..");
const envPath   = resolve(rootDir, ".env");

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const {
  R2_BUCKET_NAME = "myamen-assets",
  R2_PUBLIC_URL  = "https://pub-240da6bd4a6140de8f7f6bfca3372b13.r2.dev",
  APP_VERSION,
} = process.env;

if (!APP_VERSION) {
  console.error("❌ APP_VERSION 환경변수가 없습니다. 예: APP_VERSION=1.0.12 node scripts/upload-bundle.mjs");
  process.exit(1);
}

// ── client/package.json version 동기화 ──────────────────────────────────────
const clientPkgPath = resolve(rootDir, "client/package.json");
const clientPkg = JSON.parse(readFileSync(clientPkgPath, "utf-8"));
if (clientPkg.version !== APP_VERSION) {
  console.log(`📝 client/package.json version: ${clientPkg.version} → ${APP_VERSION}`);
  clientPkg.version = APP_VERSION;
  writeFileSync(clientPkgPath, JSON.stringify(clientPkg, null, 2) + "\n");
}

// ── APP_VERSION을 번들에 굽기 위해 반드시 재빌드 ─────────────────────────────
console.log(`🔨 APP_VERSION=${APP_VERSION} 로 재빌드 중...`);
execSync(`APP_VERSION=${APP_VERSION} npm run build`, {
  cwd: rootDir,
  stdio: "inherit",
  env: { ...process.env, APP_VERSION },
});
console.log(`✅ 빌드 완료 (VITE_APP_VERSION=${APP_VERSION} 번들에 포함됨)`);

// ── 번들 zip 생성 ──────────────────────────────────────────────────────────────
const distDir = resolve(rootDir, "dist");
const tmpZip  = `/tmp/myamen-bundle-${APP_VERSION}.zip`;
console.log(`📦 dist/ → ${tmpZip} 압축 중...`);
execSync(`cd "${distDir}" && zip -r "${tmpZip}" . -x "*.DS_Store"`, { stdio: "inherit" });

const bundleKey = `app-bundles/bundle-${APP_VERSION}.zip`;
const bundleUrl = `${R2_PUBLIC_URL}/${bundleKey}`;

// ── wrangler로 번들 zip 업로드 ─────────────────────────────────────────────────
console.log(`⬆️  R2에 번들 업로드: ${bundleKey}`);
execSync(
  `npx wrangler r2 object put "${R2_BUCKET_NAME}/${bundleKey}" --file "${tmpZip}" --content-type "application/zip" --remote`,
  { cwd: rootDir, stdio: "inherit" }
);
console.log(`✅ 번들 업로드 완료: ${bundleUrl}`);

// ── 플랫폼별 version.json 업데이트 ────────────────────────────────────────────
const platforms = (process.argv[2] || "both") === "both"
  ? ["android", "ios"]
  : [process.argv[2]];

for (const platform of platforms) {
  const versionInfo = JSON.stringify({
    latestVersion: APP_VERSION,
    bundleUrl,
    updatedAt: new Date().toISOString(),
  });
  const tmpJson    = `/tmp/myamen-version-${platform}.json`;
  writeFileSync(tmpJson, versionInfo);

  const versionKey = `app-bundles/version-${platform}.json`;
  console.log(`📝 ${versionKey} 업데이트...`);
  execSync(
    `npx wrangler r2 object put "${R2_BUCKET_NAME}/${versionKey}" --file "${tmpJson}" --content-type "application/json" --remote`,
    { cwd: rootDir, stdio: "inherit" }
  );
  console.log(`✅ ${platform} 버전 정보 업데이트: v${APP_VERSION}`);
}

console.log("\n🎉 OTA 번들 배포 완료!");
console.log(`   버전: ${APP_VERSION}`);
console.log(`   플랫폼: ${platforms.join(", ")}`);
console.log(`   번들 URL: ${bundleUrl}`);
console.log(`\n⚠️  Cloudflare Worker도 함께 배포하려면:`);
console.log(`   npx wrangler deploy`);
