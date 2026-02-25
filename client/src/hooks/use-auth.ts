import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";

// User 타입 정의 (Supabase profiles 테이블 기반)
export interface User {
  id: string;
  nickname: string | null;
  username: string | null;
  avatar_url: string | null;
  church: string | null;
  rank: string | null;
  age_group: string | null;
  bible_complete_count: number;
  created_at: string;
}

let isSupabaseInitialized = false;
let initPromise: Promise<void> | null = null;

// Supabase 초기화 완료 대기
async function waitForSupabaseInit(): Promise<void> {
  if (isSupabaseInitialized) return;

  if (!initPromise) {
    initPromise = new Promise((resolve) => {
      supabase.auth.getSession().then(() => {
        isSupabaseInitialized = true;
        resolve();
      });
    });
  }

  return initPromise;
}

async function fetchUser(): Promise<User | null> {
  console.log('[use-auth] fetchUser 시작');

  // Supabase 초기화 완료 대기
  await waitForSupabaseInit();

  // 세션 확인
  const { data: sessionData } = await supabase.auth.getSession();
  console.log('[use-auth] getSession 결과:', sessionData?.session ? '세션 있음' : '세션 없음');

  if (!sessionData?.session) {
    console.log('[use-auth] 세션 없음, null 반환');
    return null;
  }

  // 세션이 있으면 getUser로 사용자 정보 가져오기
  const { data } = await supabase.auth.getUser();
  console.log('[use-auth] Supabase getUser 결과:', data?.user ? '사용자 있음' : '사용자 없음');
  if (!data?.user) return null;

  // profiles 테이블 조회 (에러 발생 시 user_metadata 사용)
  let profile = null;
  try {
    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("nickname, username, church, rank, age_group, avatar_url")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!error) {
      profile = profileData;
    }
  } catch (e) {
    console.warn("profiles 테이블 조회 실패, user_metadata 사용:", e);
  }

  // 카카오 로그인 시 username prefix(user_→myamen_) 및 avatar 자동 동기화
  const isKakao = data.user.app_metadata?.provider === 'kakao';
  if (isKakao) {
    const updates: { username?: string; avatar_url?: string } = {};

    // 1. username prefix: user_ → myamen_
    const rawUsername = profile?.username ?? null;
    if (rawUsername?.startsWith('user_')) {
      updates.username = `myamen_${rawUsername.slice(5)}`;
    }

    // 2. 프로필 사진 동기화 (아직 없을 때만)
    if (!profile?.avatar_url) {
      const meta = data.user.user_metadata as Record<string, unknown>;
      const kakaoAvatar =
        (typeof meta?.avatar_url === 'string' ? meta.avatar_url : null)
        ?? (typeof meta?.picture === 'string' ? meta.picture : null)
        ?? null;
      if (kakaoAvatar) updates.avatar_url = kakaoAvatar;
    }

    if (Object.keys(updates).length > 0) {
      const { data: synced } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', data.user.id)
        .select('nickname, username, church, rank, age_group, avatar_url')
        .maybeSingle();
      if (synced) profile = synced;
    }
  }

  return {
    id: data.user.id,
    nickname:
      profile?.nickname
      ?? (data.user.user_metadata as any)?.nickname
      ?? (data.user.user_metadata as any)?.full_name
      ?? (data.user.user_metadata as any)?.name
      ?? null,
    username: profile?.username ?? data.user.email ?? null,
    avatar_url: profile?.avatar_url ?? null,
    church: profile?.church ?? null,
    rank: profile?.rank ?? null,
    age_group: profile?.age_group ?? null,
    bible_complete_count: 0,
    created_at: data.user.created_at ?? new Date().toISOString(),
  };
}

async function logout(): Promise<void> {
  await supabase.auth.signOut();
  window.location.href = "/";
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5분 동안 캐시 유지
    gcTime: 1000 * 60 * 10, // 10분 동안 메모리 유지
  });

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[use-auth] Auth 상태 변경:', event, 'session:', session ? '있음' : '없음');
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [queryClient]);

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
