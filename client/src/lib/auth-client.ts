export interface AuthUser {
  id: string;
  email: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  church: string | null;
  rank: string | null;
  age_group: string | null;
  bible_complete_count: number;
  created_at: string;
  auth_provider: string;
  kakao_id: string | null;
  full_name: string | null;
  phone: string | null;
}

const AUTH_CHANGED_EVENT = "qt-auth-changed";

function getApiBaseUrl(): string {
  return String(import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
}

function toApiUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!base) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseError(response: Response): Promise<Error> {
  try {
    const data = (await response.json()) as { error?: string; details?: unknown };
    const details = data?.details ? ` (${String(data.details)})` : "";
    return new Error(`${data?.error || response.statusText}${details}`);
  } catch {
    const text = await response.text().catch(() => "");
    return new Error(text || response.statusText);
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  return (await response.json()) as T;
}

export function emitAuthChanged(): void {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}

export function subscribeAuthChange(listener: () => void): () => void {
  const handler = () => listener();
  window.addEventListener(AUTH_CHANGED_EVENT, handler);
  return () => window.removeEventListener(AUTH_CHANGED_EVENT, handler);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return requestJson<AuthUser | null>("/api/auth/user");
}

export async function login(payload: { identifier: string; password: string }): Promise<AuthUser> {
  const data = await requestJson<{ success: true; user: AuthUser }>("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  emitAuthChanged();
  return data.user;
}

export async function registerUser(payload: {
  username: string;
  email: string;
  password: string;
  nickname: string;
  full_name?: string;
  phone?: string;
  church?: string;
  rank?: string;
  age_group?: string;
}): Promise<AuthUser> {
  const data = await requestJson<{ success: true; user: AuthUser }>("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  emitAuthChanged();
  return data.user;
}

export async function logout(): Promise<void> {
  await requestJson<{ success: true }>("/api/auth/logout", {
    method: "POST",
  });
  emitAuthChanged();
}

export async function deleteAccount(): Promise<void> {
  await requestJson<{ success: true }>("/api/user/delete", {
    method: "DELETE",
  });
  emitAuthChanged();
}

export async function checkAvailability(field: "username" | "email" | "nickname", value: string): Promise<boolean> {
  const data = await requestJson<{ field: string; available: boolean }>("/api/auth/check-availability", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ field, value }),
  });
  return Boolean(data.available);
}

export async function findIdByEmail(email: string): Promise<string | null> {
  const data = await requestJson<{ success: true; found: boolean; username: string | null }>("/api/auth/find-id", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  return data.found ? data.username : null;
}

export async function resetPassword(payload: {
  username: string;
  email: string;
  newPassword: string;
}): Promise<AuthUser> {
  const data = await requestJson<{ success: true; user: AuthUser }>("/api/auth/reset-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  emitAuthChanged();
  return data.user;
}

export function startKakaoLogin(returnTo?: string): void {
  const target = returnTo || window.location.href;
  window.location.href = `${toApiUrl("/api/auth/oauth/kakao/start")}?returnTo=${encodeURIComponent(target)}`;
}
