import { Capacitor } from "@capacitor/core";
import { isNativeApp, resolveApiUrl } from "./appUrl";
import { getFeatureFlag } from "./useFeatureFlag";

// 빌드 시점에 vite.config.ts에서 주입됨 (예: "1.0.3")
const CURRENT_VERSION: string = (import.meta as any).env?.VITE_APP_VERSION || "0.0.0";

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * 앱 시작 시 호출. 새 번들이 있으면 다운로드 후 즉시 적용.
 * - 웹 브라우저에서는 실행되지 않음 (isNativeApp 가드)
 * - @capawesome/capacitor-live-update 플러그인이 없으면 조용히 무시
 *   (스토어 제출 전 `npx cap sync` 실행 시 활성화됨)
 */
export async function checkAndApplyUpdate(): Promise<void> {
  if (!isNativeApp()) return;

  try {
    // feature_flags 테이블에서 OTA 활성화 여부 확인
    const otaEnabled = await getFeatureFlag("ota_update", true);
    if (!otaEnabled) return;

    const platform = Capacitor.getPlatform(); // 'android' | 'ios'
    const res = await fetch(
      resolveApiUrl(`/api/app-update/check?platform=${platform}&currentVersion=${CURRENT_VERSION}`)
    );
    if (!res.ok) return;

    const data = await res.json() as {
      needsUpdate: boolean;
      latestVersion: string;
      bundleUrl: string;
    };
    if (!data.needsUpdate || !data.bundleUrl) return;

    // 라이브 업데이트 플러그인 동적 로드
    // 스토어 제출 전 `npm install @capawesome/capacitor-live-update && npx cap sync` 필요
    const { LiveUpdate } = await import("@capawesome/capacitor-live-update");
    await LiveUpdate.downloadBundle({ url: data.bundleUrl, bundleId: data.latestVersion });
    await LiveUpdate.setNextBundle({ bundleId: data.latestVersion });
    await LiveUpdate.reload();
  } catch {
    // 비치명적 — 네트워크 오류 또는 플러그인 미설치 시 조용히 무시
  }
}

export { CURRENT_VERSION };
