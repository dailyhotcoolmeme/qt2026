import { Capacitor } from "@capacitor/core";
import { isNativeApp, resolveApiUrl } from "./appUrl";

// 빌드 시점에 vite.config.js에서 주입됨
const CURRENT_VERSION: string = (import.meta as any).env?.VITE_APP_VERSION || "0.0.0";

export async function checkAndApplyUpdate(): Promise<void> {
  if (!isNativeApp()) return;

  try {
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
    console.error("[OTA] error:", e);
  }
}

export { CURRENT_VERSION };
