import { Capacitor } from "@capacitor/core";
import { isNativeApp, resolveApiUrl } from "./appUrl";
import { getFeatureFlag } from "./useFeatureFlag";

// 빌드 시점에 vite.config.js에서 주입됨
const CURRENT_VERSION: string = (import.meta as any).env?.VITE_APP_VERSION || "0.0.0";

/**
 * 앱 시작 시 호출. 새 번들이 있으면 다운로드 후 즉시 적용.
 *
 * 루프 방지: OTA 성공 후 새 번들의 CURRENT_VERSION이 latestVersion과 같아지므로
 * 서버가 needsUpdate=false를 반환 → 자동 종료.
 * localStorage 가드는 reload 실패 시 영구적으로 업데이트를 막는 부작용이 있어 제거.
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

    const { LiveUpdate } = await import("@capawesome/capacitor-live-update");

    // 이미 다운로드된 번들이 있으면 바로 적용
    try {
      const bundles = await LiveUpdate.getBundles();
      if (bundles.bundleIds?.includes(data.latestVersion)) {
        await LiveUpdate.setNextBundle({ bundleId: data.latestVersion });
        await LiveUpdate.reload();
        return;
      }
    } catch {}

    await LiveUpdate.downloadBundle({ url: data.bundleUrl, bundleId: data.latestVersion });
    await LiveUpdate.setNextBundle({ bundleId: data.latestVersion });
    await LiveUpdate.reload();
  } catch (e) {
    console.error(`[OTA] error:`, e);
  }
}

export { CURRENT_VERSION };
