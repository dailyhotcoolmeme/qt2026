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
    console.log(`[OTA] feature flag ota_update=${otaEnabled}, CURRENT_VERSION=${CURRENT_VERSION}`);
    if (!otaEnabled) return;

    const platform = Capacitor.getPlatform();
    const apiUrl = resolveApiUrl(`/api/app-update/check?platform=${platform}&currentVersion=${CURRENT_VERSION}`);
    console.log(`[OTA] checking: ${apiUrl}`);
    const res = await fetch(apiUrl);
    if (!res.ok) {
      console.error(`[OTA] check failed: ${res.status}`);
      return;
    }

    const data = await res.json() as {
      needsUpdate: boolean;
      latestVersion: string;
      bundleUrl: string;
    };
    console.log(`[OTA] check result:`, JSON.stringify(data));
    if (!data.needsUpdate || !data.bundleUrl) return;

    // 이미 이 버전으로 리로드한 적 있으면 스킵 (무한 리로드 방지)
    try {
      const applied = localStorage.getItem(OTA_APPLIED_KEY);
      console.log(`[OTA] previously applied: ${applied}`);
      if (applied === data.latestVersion) return;
    } catch {}

    const { LiveUpdate } = await import("@capawesome/capacitor-live-update");

    // 이미 다운로드된 번들이 있으면 바로 적용
    try {
      const bundles = await LiveUpdate.getBundles();
      console.log(`[OTA] existing bundles:`, JSON.stringify(bundles));
      if (bundles.bundleIds?.includes(data.latestVersion)) {
        localStorage.setItem(OTA_APPLIED_KEY, data.latestVersion);
        await LiveUpdate.setNextBundle({ bundleId: data.latestVersion });
        await LiveUpdate.reload();
        return;
      }
    } catch (e) {
      console.error(`[OTA] getBundles error:`, e);
    }

    console.log(`[OTA] downloading bundle ${data.latestVersion} from ${data.bundleUrl}`);
    await LiveUpdate.downloadBundle({ url: data.bundleUrl, bundleId: data.latestVersion });
    console.log(`[OTA] download complete, setting next bundle`);
    localStorage.setItem(OTA_APPLIED_KEY, data.latestVersion);
    await LiveUpdate.setNextBundle({ bundleId: data.latestVersion });
    console.log(`[OTA] reloading...`);
    await LiveUpdate.reload();
  } catch (e) {
    console.error(`[OTA] error:`, e);
  }
}

export { CURRENT_VERSION };
