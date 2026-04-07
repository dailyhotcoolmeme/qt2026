import { Capacitor } from "@capacitor/core";
import { isNativeApp, resolveApiUrl } from "./appUrl";

// 빌드 시점에 vite.config.js에서 주입됨
const CURRENT_VERSION: string = (import.meta as any).env?.VITE_APP_VERSION || "0.0.0";

export async function checkAndApplyUpdate(): Promise<void> {
  if (!isNativeApp()) return;

  try {
    const { LiveUpdate } = await import("@capawesome/capacitor-live-update");
    const platform = Capacitor.getPlatform();

    // ── 현재 실제 활성 번들 ID 확인 ──────────────────────────────────────
    // null = APK 기본 번들 실행 중, "1.0.12" 등 = OTA 번들 실행 중
    let currentBundleId: string | null = null;
    try {
      const current = await LiveUpdate.getCurrentBundle();
      currentBundleId = current?.bundleId ?? null;
    } catch {}

    // 현재 실행 중인 버전: OTA 번들 ID > 빌드 시 주입된 버전 순으로 신뢰
    const reportedVersion = currentBundleId ?? CURRENT_VERSION;

    // ── 서버에서 최신 버전 확인 ──────────────────────────────────────────
    const res = await fetch(
      resolveApiUrl(`/api/app-update/check?platform=${platform}&currentVersion=${reportedVersion}`)
    );
    if (!res.ok) return;

    const data = await res.json() as {
      needsUpdate: boolean;
      latestVersion: string;
      bundleUrl: string;
    };
    if (!data.needsUpdate || !data.bundleUrl) return;

    // 현재 번들이 이미 최신 버전이면 스킵 (reload 루프 방지 핵심)
    if (currentBundleId === data.latestVersion) return;

    // ── 이미 다운로드된 번들인지 확인 ────────────────────────────────────
    let existingBundles: string[] = [];
    try {
      const result = await LiveUpdate.getBundles();
      existingBundles = result.bundleIds ?? [];
    } catch {}

    if (!existingBundles.includes(data.latestVersion)) {
      // 새 번들 다운로드
      await LiveUpdate.downloadBundle({
        url: data.bundleUrl,
        bundleId: data.latestVersion,
      });
    }

    // ── 적용 및 리로드 ───────────────────────────────────────────────────
    await LiveUpdate.setNextBundle({ bundleId: data.latestVersion });

    // 오래된 번들 정리 (저장공간 + 플러그인 상태 안정화)
    try {
      const toDelete = existingBundles.filter(id => id !== data.latestVersion);
      for (const id of toDelete) {
        await LiveUpdate.deleteBundle({ bundleId: id });
      }
    } catch {}

    await LiveUpdate.reload();

  } catch (e) {
    console.error("[OTA] error:", e);
  }
}

export { CURRENT_VERSION };
