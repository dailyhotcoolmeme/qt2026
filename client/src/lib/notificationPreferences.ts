import { supabase } from "./supabase";

export type NotificationSettings = {
  pushEnabled: boolean;
  groupActivityEnabled: boolean;
  systemEnabled: boolean;
};

export const defaultNotificationSettings: NotificationSettings = {
  pushEnabled: false,
  groupActivityEnabled: true,
  systemEnabled: true,
};

function storageKey(userId?: string | null) {
  return `notification-settings:${userId || "guest"}`;
}

export function isNotificationTypeEnabled(settings: NotificationSettings, type: string) {
  if (!settings.pushEnabled) return false;
  if (type === "system") return settings.systemEnabled;
  return settings.groupActivityEnabled;
}

export function readLocalNotificationSettings(userId?: string | null) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return defaultNotificationSettings;
    return { ...defaultNotificationSettings, ...(JSON.parse(raw) as Partial<NotificationSettings>) };
  } catch {
    return defaultNotificationSettings;
  }
}

export function writeLocalNotificationSettings(userId: string | null | undefined, settings: NotificationSettings) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(settings));
  } catch {
    // ignore storage failures
  }
}

export async function loadNotificationSettings(userId?: string | null) {
  const local = readLocalNotificationSettings(userId);
  if (!userId) return local;

  const tryNewTable = async () => {
    const { data, error } = await supabase
      .from("user_notification_settings")
      .select("push_enabled,group_activity_enabled,system_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      pushEnabled: data.push_enabled !== false,
      groupActivityEnabled: data.group_activity_enabled !== false,
      systemEnabled: data.system_enabled !== false,
    } satisfies NotificationSettings;
  };

  const tryLegacyTable = async () => {
    const { data, error } = await supabase
      .from("notification_settings")
      .select("is_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      pushEnabled: data.is_enabled !== false,
      groupActivityEnabled: local.groupActivityEnabled,
      systemEnabled: local.systemEnabled,
    } satisfies NotificationSettings;
  };

  try {
    const merged = (await tryNewTable()) || (await tryLegacyTable());
    if (!merged) return local;
    writeLocalNotificationSettings(userId, merged);
    return merged;
  } catch {
    return local;
  }
}

export async function saveNotificationSettings(userId: string | null | undefined, settings: NotificationSettings) {
  writeLocalNotificationSettings(userId, settings);
  if (!userId) return true;

  try {
    const { error } = await supabase.from("user_notification_settings").upsert(
      {
        user_id: userId,
        push_enabled: settings.pushEnabled,
        group_activity_enabled: settings.groupActivityEnabled,
        system_enabled: settings.systemEnabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (!error) return true;
  } catch {
    // fall through to legacy table
  }

  try {
    const { error } = await supabase.from("notification_settings").upsert(
      {
        user_id: userId,
        is_enabled: settings.pushEnabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    return !error;
  } catch {
    return false;
  }
}
