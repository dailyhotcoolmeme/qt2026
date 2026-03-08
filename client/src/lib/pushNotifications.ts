import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  type ActionPerformed,
  type PermissionStatus,
  type PushNotificationSchema,
  type Token,
} from "@capacitor/push-notifications";

let nativeListenersReady = false;
let pendingRegisterResolve: ((token: string | null) => void) | null = null;
let latestNativeToken = "";
let openCallback: ((targetPath: string) => void) | null = null;
let receiveCallback: (() => void) | null = null;

function normalizeNotificationTarget(notification: PushNotificationSchema | ActionPerformed["notification"]) {
  const data = notification?.data && typeof notification.data === "object" ? notification.data : {};
  const rawTarget = String(data.targetPath || data.url || "/").trim();
  if (rawTarget.startsWith("/#/")) return rawTarget.slice(2);
  if (rawTarget.startsWith("#/")) return rawTarget.slice(1);
  if (rawTarget.startsWith("/")) return rawTarget;
  return `/${rawTarget.replace(/^\/+/, "")}`;
}

export function isNativePushAvailable() {
  return Capacitor.isNativePlatform();
}

export async function getNotificationPermissionState() {
  if (isNativePushAvailable()) {
    const permissions = await PushNotifications.checkPermissions();
    return permissions.receive;
  }

  if (typeof Notification === "undefined") return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (isNativePushAvailable()) {
    const current = await PushNotifications.checkPermissions();
    if (current.receive === "granted") return current.receive;
    const requested = await PushNotifications.requestPermissions();
    return requested.receive;
  }

  if (typeof Notification === "undefined") return "denied";
  return Notification.requestPermission();
}

export function getLatestNativePushToken() {
  return latestNativeToken;
}

export async function ensureNativePushListeners(
  onOpenTarget: (targetPath: string) => void,
  onReceive?: () => void
) {
  openCallback = onOpenTarget;
  receiveCallback = onReceive || null;
  if (nativeListenersReady || !isNativePushAvailable()) return;

  await PushNotifications.addListener("registration", (token: Token) => {
    latestNativeToken = token.value;
    if (pendingRegisterResolve) {
      pendingRegisterResolve(token.value);
      pendingRegisterResolve = null;
    }
  });

  await PushNotifications.addListener("registrationError", (error) => {
    console.error("native push registration error:", error);
    if (pendingRegisterResolve) {
      pendingRegisterResolve(null);
      pendingRegisterResolve = null;
    }
  });

  await PushNotifications.addListener("pushNotificationReceived", () => {
    receiveCallback?.();
  });

  await PushNotifications.addListener("pushNotificationActionPerformed", (notification: ActionPerformed) => {
    openCallback?.(normalizeNotificationTarget(notification.notification));
  });

  nativeListenersReady = true;
}

export async function registerForNativePush() {
  if (!isNativePushAvailable()) return null;

  const permission = await getNotificationPermissionState();
  if (permission !== "granted") return null;
  if (latestNativeToken) return latestNativeToken;

  return new Promise<string | null>(async (resolve) => {
    pendingRegisterResolve = resolve;
    try {
      await PushNotifications.register();
    } catch (error) {
      console.error("PushNotifications.register failed:", error);
      pendingRegisterResolve = null;
      resolve(null);
    }
  });
}
