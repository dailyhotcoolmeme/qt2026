import { Browser } from "@capacitor/browser";
import { getBrowserOrigin, getPublicWebOrigin, isKnownAppOrigin, isNativeApp } from "./appUrl";
import { GROUP_INVITE_QUERY_KEY, readInviteGroupId } from "./groupInvite";
import { supabase } from "./supabase";

export type OAuthProvider = "kakao" | "google" | "apple";
type OAuthStartOptions = {
  forceNativeBridge?: boolean;
};

const NATIVE_OAUTH_BRIDGE_QUERY_KEY = "native_oauth";
const NATIVE_CALLBACK_URL = "com.myamen.app://auth/callback";

function safeDecodeURIComponent(value?: string | null) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function resolveOAuthReturnTo(rawReturnTo?: string | null) {
  const decoded = safeDecodeURIComponent(rawReturnTo);
  const appOrigin = getBrowserOrigin();
  const fallback = `${appOrigin}/#/`;
  if (!decoded) return fallback;

  if (decoded.startsWith("/#/")) return `${appOrigin}${decoded}`;
  if (decoded.startsWith("#/")) return `${appOrigin}/${decoded}`;

  try {
    const url = new URL(decoded);
    if (url.hash && url.hash.startsWith("#/")) {
      return `${appOrigin}/${url.hash}`;
    }
    if (isKnownAppOrigin(url.origin)) {
      return `${appOrigin}${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // ignore parse errors
  }

  return fallback;
}

function resolveNativeOAuthReturnTo(rawReturnTo?: string | null) {
  const decoded = safeDecodeURIComponent(rawReturnTo);
  const fallback = window.location.hash?.startsWith("#/") ? window.location.hash : "#/";
  if (!decoded) return fallback;

  if (decoded.startsWith("/#/")) return decoded.slice(1);
  if (decoded.startsWith("#/")) return decoded;

  try {
    const url = new URL(decoded);
    if (url.hash && url.hash.startsWith("#/")) {
      return url.hash;
    }
  } catch {
    // ignore parse errors
  }

  return fallback;
}

export function getOAuthRedirectTo(targetReturnTo?: string | null, options?: OAuthStartOptions) {
  const inviteGroupId = readInviteGroupId();

  if (isNativeApp() || options?.forceNativeBridge) {
    if (isNativeApp()) {
      return NATIVE_CALLBACK_URL;
    }

    const returnTo = resolveNativeOAuthReturnTo(targetReturnTo);
    const inviteQuery = inviteGroupId ? `&${GROUP_INVITE_QUERY_KEY}=${encodeURIComponent(inviteGroupId)}` : "";
    return `${getPublicWebOrigin()}/?${NATIVE_OAUTH_BRIDGE_QUERY_KEY}=1&returnTo=${encodeURIComponent(returnTo)}${inviteQuery}`;
  }

  const returnTo = resolveOAuthReturnTo(targetReturnTo);
  const inviteQuery = inviteGroupId ? `&${GROUP_INVITE_QUERY_KEY}=${encodeURIComponent(inviteGroupId)}` : "";
  return `${getBrowserOrigin()}/?returnTo=${encodeURIComponent(returnTo)}${inviteQuery}`;
}

export function getHostedNativeOAuthStartUrl(provider: OAuthProvider, targetReturnTo?: string | null) {
  const returnTo = resolveNativeOAuthReturnTo(targetReturnTo);
  return `${getPublicWebOrigin()}/?native_login=1&provider=${encodeURIComponent(provider)}&returnTo=${encodeURIComponent(returnTo)}#/auth`;
}

export async function startHostedNativeOAuthSignIn(provider: OAuthProvider, targetReturnTo?: string | null) {
  await Browser.open({
    url: getHostedNativeOAuthStartUrl(provider, targetReturnTo),
    windowName: "_self",
  });
}

export async function startOAuthSignIn(provider: OAuthProvider, targetReturnTo?: string | null, options?: OAuthStartOptions) {
  const redirectTo = getOAuthRedirectTo(targetReturnTo, options);

  if (!isNativeApp()) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });
    if (error) throw error;
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) {
    throw new Error("OAuth URL을 받지 못했습니다.");
  }

  await Browser.open({
    url: data.url,
    windowName: "_self",
  });
}
