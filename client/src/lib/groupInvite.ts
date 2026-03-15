import { supabase } from "./supabase";

export const PENDING_GROUP_INVITE_KEY = "pending_group_invite";
export const PENDING_GROUP_INVITE_REDIRECTED_KEY = "pending_group_invite_redirected";
export const GROUP_INVITE_QUERY_KEY = "invite_group";
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidInviteGroupId(value?: string | null) {
  return UUID_REGEX.test(String(value || "").trim());
}

export function readInviteGroupIdFromUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  const fromSearch = String(searchParams.get(GROUP_INVITE_QUERY_KEY) || "").trim();
  if (isValidInviteGroupId(fromSearch)) return fromSearch;

  const hash = window.location.hash || "";
  const queryIdx = hash.indexOf("?");
  if (queryIdx >= 0) {
    const hashParams = new URLSearchParams(hash.substring(queryIdx + 1));
    const fromHash = String(hashParams.get(GROUP_INVITE_QUERY_KEY) || "").trim();
    if (isValidInviteGroupId(fromHash)) return fromHash;
  }

  return "";
}

export function readStoredInviteGroupId() {
  try {
    const fromStorage = String(localStorage.getItem(PENDING_GROUP_INVITE_KEY) || "").trim();
    if (isValidInviteGroupId(fromStorage)) return fromStorage;
  } catch {
    // ignore storage errors
  }

  return "";
}

export function readInviteGroupId() {
  return readInviteGroupIdFromUrl() || readStoredInviteGroupId();
}

export function buildInviteLandingUrl(inviteGroupId?: string | null) {
  const resolvedInviteGroupId = String(inviteGroupId || readInviteGroupId()).trim();
  if (!isValidInviteGroupId(resolvedInviteGroupId)) {
    return `${window.location.origin}/#/`;
  }

  return `${window.location.origin}/?${GROUP_INVITE_QUERY_KEY}=${encodeURIComponent(resolvedInviteGroupId)}`;
}

export function persistInviteGroupId(inviteGroupId: string) {
  if (!isValidInviteGroupId(inviteGroupId)) return;
  try {
    localStorage.setItem(PENDING_GROUP_INVITE_KEY, inviteGroupId);
    localStorage.removeItem(PENDING_GROUP_INVITE_REDIRECTED_KEY);
  } catch {
    // ignore storage errors
  }
}

export function clearInviteGroupId() {
  try {
    localStorage.removeItem(PENDING_GROUP_INVITE_KEY);
    localStorage.removeItem(PENDING_GROUP_INVITE_REDIRECTED_KEY);
  } catch {
    // ignore storage errors
  }
}

export function isAlreadyJoinedInviteError(error: any) {
  const msg = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`;
  return /already|duplicate|exists|member|joined|이미|참여 중|가입.*되어/i.test(msg);
}

export function resolveJoinedGroupId(rpcData: unknown, fallbackGroupId: string) {
  const direct = String(rpcData ?? "").trim();
  if (isValidInviteGroupId(direct)) return direct;

  if (rpcData && typeof rpcData === "object") {
    const candidate = String(
      (rpcData as any).group_id ??
      (rpcData as any).id ??
      (rpcData as any).groupId ??
      ""
    ).trim();
    if (isValidInviteGroupId(candidate)) return candidate;
  }

  return fallbackGroupId;
}

export async function joinInviteGroup(inviteGroupId: string) {
  if (!isValidInviteGroupId(inviteGroupId)) return "";

  const { data, error } = await supabase.rpc("join_group_by_invite_link", {
    p_group_id: inviteGroupId,
  });

  if (error && !isAlreadyJoinedInviteError(error)) {
    throw error;
  }

  return resolveJoinedGroupId(data, inviteGroupId);
}

export async function joinInviteGroupAndRedirect(inviteGroupId: string) {
  try {
    const joinedGroupId = await joinInviteGroup(inviteGroupId);
    if (!isValidInviteGroupId(joinedGroupId)) return false;

    clearInviteGroupId();
    window.location.href = `${window.location.origin}/#/group/${joinedGroupId}`;
    return true;
  } catch (error) {
    console.error("join invite flow failed:", error);
    return false;
  }
}
