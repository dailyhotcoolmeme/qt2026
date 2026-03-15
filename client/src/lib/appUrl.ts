import { Capacitor } from "@capacitor/core";

const env =
  (typeof import.meta !== "undefined" && (import.meta as any).env) ||
  (globalThis as any).importMetaEnv ||
  {};

const FALLBACK_PUBLIC_WEB_ORIGIN = "https://myamen.co.kr";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export function getBrowserOrigin() {
  return trimTrailingSlash(window.location.origin);
}

export function getPublicWebOrigin() {
  return trimTrailingSlash(String(env.VITE_PUBLIC_WEB_ORIGIN || FALLBACK_PUBLIC_WEB_ORIGIN));
}

export function isKnownAppOrigin(origin?: string | null) {
  const normalized = trimTrailingSlash(String(origin || ""));
  return (
    normalized === getBrowserOrigin() ||
    normalized === getPublicWebOrigin() ||
    normalized === "http://localhost" ||
    normalized === "https://localhost" ||
    normalized === "capacitor://localhost"
  );
}

export function resolveAppUrl(rawUrl: string) {
  if (!rawUrl) return rawUrl;
  if (/^[a-z][a-z0-9+.-]*:/i.test(rawUrl)) return rawUrl;
  if (rawUrl.startsWith("//")) return `https:${rawUrl}`;
  return new URL(rawUrl, isNativeApp() ? `${getPublicWebOrigin()}/` : `${getBrowserOrigin()}/`).toString();
}

export function resolveApiUrl(path: string) {
  return resolveAppUrl(path);
}

function getUserAgent() {
  return typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
}

export function isKakaoInAppBrowser() {
  return /KAKAOTALK/i.test(getUserAgent());
}

export function isEmbeddedInAppBrowser() {
  const ua = getUserAgent();
  return /KAKAOTALK|FBAN|FBAV|Instagram|Line|NAVER\(inapp|; wv\)|WebView/i.test(ua);
}

export function openUrlInExternalBrowser(url: string) {
  const targetUrl = url || window.location.href;

  if (isKakaoInAppBrowser()) {
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(targetUrl)}`;
    return;
  }

  const ua = getUserAgent();
  if (/Android/i.test(ua)) {
    const stripped = targetUrl.replace(/^https?:\/\//i, "");
    window.location.href = `intent://${stripped}#Intent;scheme=https;package=com.android.chrome;end`;
    return;
  }

  if (/iPhone|iPad|iPod/i.test(ua)) {
    if (targetUrl.startsWith("https://")) {
      window.location.href = targetUrl.replace(/^https:\/\//i, "googlechromes://");
      return;
    }
    if (targetUrl.startsWith("http://")) {
      window.location.href = targetUrl.replace(/^http:\/\//i, "googlechrome://");
      return;
    }
  }

  window.open(targetUrl, "_blank", "noopener,noreferrer");
}
