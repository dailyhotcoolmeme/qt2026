import { Capacitor } from "@capacitor/core";
import { isNativeApp, resolveApiUrl } from "./appUrl";
import { getFeatureFlag } from "./useFeatureFlag";

// 빌드 시점에 vite.config.js에서 주입됨
const CURRENT_VERSION: string = (import.meta as any).env?.VITE_APP_VERSION || "0.0.0";

const OTA_APPLIED_KEY = "ota_applied_version";

/**
 * 앱 시작 시 호출. 새 번들이 있으면 다운로드 후 즉시 적용.
 */
export async function checkAndApplyUpdate(): Promise<void> {
  if (!isNativeApp()) return;

  try {
    const otaEnabled = await getFeatureFlag("ota_update", true);
    if (!otaEnabled) return;

    const platform = Capacitor.getPlatform();
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

    // 이미 이 버전으로 리로드한 적 있으면 스킵 (무한 리로드 방지)
    try {
      const applied = localStorage.getItem(OTA_APPLIED_KEY);
      if (applied === data.latestVersion) return;
    } catch {}

    const { LiveUpdate } = await import("@capawesome/capacitor-live-update");

    // 이미 다운로드된 번들이 있으면 바로 적용
    try {
      const bundles = await LiveUpdate.getBundles();
      if (bundles.bundleIds?.includes(data.latestVersion)) {
        localStorage.setItem(OTA_APPLIED_KEY, data.latestVersion);
        await LiveUpdate.setNextBundle({ bundleId: data.latestVersion });
        await LiveUpdate.reload();
        return;
      }
    } catch {}

    await LiveUpdate.downloadBundle({ url: data.bundleUrl, bundleId: data.latestVersion });
    localStorage.setItem(OTA_APPLIED_KEY, data.latestVersion);
    await LiveUpdate.setNextBundle({ bundleId: data.latestVersion });
    await LiveUpdate.reload();
  } catch {
    // 비치명적 — 네트워크 오류 또는 플러그인 미설치 시 조용히 무시
  }
}

export { CURRENT_VERSION };
