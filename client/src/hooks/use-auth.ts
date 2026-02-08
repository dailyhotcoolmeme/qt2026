import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<User | null> {
  console.log('[use-auth] fetchUser 시작, DEV:', import.meta.env.DEV);
  
  // 로컬 개발 환경에서는 서버를 거치지 않고 바로 Supabase 사용
  if (import.meta.env.DEV) {
    const { data } = await supabase.auth.getUser();
    console.log('[use-auth] DEV - Supabase getUser 결과:', data?.user ? '사용자 있음' : '사용자 없음');
    if (!data?.user) return null;

    // profiles 테이블 조회 (에러 발생 시 user_metadata 사용)
    let profile = null;
    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("nickname, church, rank, age_group")
        .eq("id", data.user.id)
        .maybeSingle();
      
      if (!error) {
        profile = profileData;
      }
    } catch (e) {
      // profiles 테이블이 없거나 접근 불가 시 user_metadata 사용
      console.warn("profiles 테이블 조회 실패, user_metadata 사용:", e);
    }

    return {
      id: data.user.id,
      nickname:
        profile?.nickname
        ?? (data.user.user_metadata as any)?.nickname
        ?? (data.user.user_metadata as any)?.full_name
        ?? (data.user.user_metadata as any)?.name
        ?? null,
      church: profile?.church ?? null,
      rank: profile?.rank ?? null,
      age_group: profile?.age_group ?? null,
      bible_complete_count: 0,
      created_at: data.user.created_at ?? new Date().toISOString(),
    };
  }

  // 프로덕션에서는 서버 API 사용
  console.log('[use-auth] 프로덕션 - /api/auth/user 호출');
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });
  console.log('[use-auth] API 응답 상태:', response.status);

  if (response.status === 401 || response.status === 404) {
    console.log('[use-auth] API 실패, Supabase fallback 사용');
    const { data } = await supabase.auth.getUser();
    console.log('[use-auth] Supabase fallback 결과:', data?.user ? '사용자 있음' : '사용자 없음');
    if (!data?.user) return null;

    // profiles 테이블 조회 (에러 발생 시 user_metadata 사용)
    let profile = null;
    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("nickname, church, rank, age_group")
        .eq("id", data.user.id)
        .maybeSingle();
      
      if (!error) {
        profile = profileData;
      }
    } catch (e) {
      // 에러 무시
      console.warn("profiles 조회 실패:", e);
    }

    return {
      id: data.user.id,
      nickname:
        profile?.nickname
        ?? (data.user.user_metadata as any)?.nickname
        ?? (data.user.user_metadata as any)?.full_name
        ?? (data.user.user_metadata as any)?.name
        ?? null,
      church: profile?.church ?? null,
      rank: profile?.rank ?? null,
      age_group: profile?.age_group ?? null,
      bible_complete_count: 0,
      created_at: data.user.created_at ?? new Date().toISOString(),
    };
  }

  if (!response.ok) {
    console.error('[use-auth] API 오류:', response.status, response.statusText);
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  const userData = await response.json();
  console.log('[use-auth] API에서 사용자 반환:', userData ? '있음' : '없음');
  return userData;
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
