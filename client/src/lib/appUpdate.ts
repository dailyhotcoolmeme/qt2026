import { Capacitor } from "@capacitor/core";
import { isNativeApp, resolveApiUrl } from "./appUrl";

// 빌드 시점에 vite.config.js에서 주입됨
const CURRENT_VERSION: string = (import.meta as any).env?.VITE_APP_VERSION || "0.0.0";

// 디버그 로그 수집 (화면 표시용)
export const otaDebugLog: string[] = [];
function log(msg: string) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  otaDebugLog.push(line);
  console.log("[OTA]", msg);
}

export async function checkAndApplyUpdate(): Promise<void> {
  otaDebugLog.length = 0; // 초기화

  if (!isNativeApp()) {
    log("isNativeApp=false → 스킵");
    return;
  }

  log(`CURRENT_VERSION=${CURRENT_VERSION}`);
  log(`platform=${Capacitor.getPlatform()}`);

  try {
    const { LiveUpdate } = await import("@capawesome/capacitor-live-update");
    log("LiveUpdate 플러그인 로드 OK");

    // ── 현재 실제 활성 번들 ID 확인 ──────────────────────────────────────
    let currentBundleId: string | null = null;
    try {
      const current = await LiveUpdate.getCurrentBundle();
      currentBundleId = current?.bundleId ?? null;
      log(`getCurrentBundle=${currentBundleId ?? "null(APK기본)"}`);
    } catch (e) {
      log(`getCurrentBundle ERROR: ${e}`);
    }

    const reportedVersion = currentBundleId ?? CURRENT_VERSION;
    log(`reportedVersion=${reportedVersion}`);

    // ── 서버에서 최신 버전 확인 ──────────────────────────────────────────
    const url = resolveApiUrl(`/api/app-update/check?platform=${Capacitor.getPlatform()}&currentVersion=${reportedVersion}`);
    log(`fetch → ${url}`);

    let res: Response;
    try {
      res = await fetch(url);
      log(`응답 status=${res.status}`);
    } catch (e) {
      log(`fetch ERROR: ${e}`);
      return;
    }

    if (!res.ok) {
      log(`서버 오류 → 중단`);
      return;
    }

    const data = await res.json() as {
      needsUpdate: boolean;
      latestVersion: string;
      bundleUrl: string;
    };
    log(`needsUpdate=${data.needsUpdate} latestVersion=${data.latestVersion}`);

    if (!data.needsUpdate || !data.bundleUrl) {
      log("업데이트 없음 → 종료");
      return;
    }

    if (currentBundleId === data.latestVersion) {
      log("이미 최신 번들 실행 중 → 스킵");
      return;
    }

    // ── 기존 번들 목록 확인 ──────────────────────────────────────────────
    let existingBundles: string[] = [];
    try {
      const result = await LiveUpdate.getBundles();
      existingBundles = result.bundleIds ?? [];
      log(`기존 번들: [${existingBundles.join(", ")}]`);
    } catch (e) {
      log(`getBundles ERROR: ${e}`);
    }

    // ── 다운로드 ─────────────────────────────────────────────────────────
    if (!existingBundles.includes(data.latestVersion)) {
      log(`다운로드 시작: ${data.bundleUrl}`);
      try {
        await LiveUpdate.downloadBundle({ url: data.bundleUrl, bundleId: data.latestVersion });
        log("다운로드 완료");
      } catch (e) {
        log(`다운로드 ERROR: ${e}`);
        return;
      }
    } else {
      log("이미 다운로드된 번들 존재");
    }

    // ── 적용 및 리로드 ───────────────────────────────────────────────────
    try {
      await LiveUpdate.setNextBundle({ bundleId: data.latestVersion });
      log("setNextBundle OK");
    } catch (e) {
      log(`setNextBundle ERROR: ${e}`);
      return;
    }

    // 오래된 번들 정리
    try {
      const toDelete = existingBundles.filter(id => id !== data.latestVersion);
      for (const id of toDelete) {
        await LiveUpdate.deleteBundle({ bundleId: id });
        log(`구버전 삭제: ${id}`);
      }
    } catch {}

    log("reload() 호출 → 앱 재시작");
    await LiveUpdate.reload();

  } catch (e) {
    log(`최상위 ERROR: ${e}`);
  }
}

export { CURRENT_VERSION };
