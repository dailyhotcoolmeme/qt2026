import { resolveApiUrl } from "./appUrl";
import { supabase } from "./supabase";

async function getAuthHeader(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? `Bearer ${token}` : null;
}

/**
 * 그룹 멤버 전체(발신자 제외)에게 푸시 알림을 발송합니다.
 * 서버에서 멤버십 검증 후 발송. 실패해도 조용히 무시.
 */
export async function sendPushToGroupMembers(params: {
  groupId: string;
  title: string;
  body: string;
  targetPath?: string;
}): Promise<void> {
  try {
    const auth = await getAuthHeader();
    if (!auth) return;

    await fetch(resolveApiUrl("/api/push/send-group"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify({
        groupId: params.groupId,
        title: params.title,
        body: params.body,
        targetPath: params.targetPath,
      }),
    });
  } catch {
    // 비치명적
  }
}

/**
 * 특정 유저들에게만 그룹 푸시 알림을 발송합니다.
 * 서버에서 그룹 멤버십 검증 후 발송. 실패해도 조용히 무시.
 */
export async function sendPushToGroupUsers(params: {
  groupId: string;
  targetUserIds: string[];
  title: string;
  body: string;
  targetPath?: string;
}): Promise<void> {
  try {
    const auth = await getAuthHeader();
    if (!auth) return;

    await fetch(resolveApiUrl("/api/push/send-group"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify({
        groupId: params.groupId,
        targetUserIds: params.targetUserIds,
        title: params.title,
        body: params.body,
        targetPath: params.targetPath,
      }),
    });
  } catch {
    // 비치명적
  }
}
