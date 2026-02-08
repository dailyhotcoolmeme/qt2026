import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<User | null> {
  console.log('[use-auth] fetchUser 시작');
  
  // 먼저 getSession으로 localStorage의 세션 확인 (동기적)
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
      .select("nickname, church, rank, age_group")
      .eq("id", data.user.id)
      .maybeSingle();
    
    if (!error) {
      profile = profileData;
    }
  } catch (e) {
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
