import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401 || response.status === 404) {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname, church, rank, age_group")
      .eq("id", data.user.id)
      .single();

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
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function logout(): Promise<void> {
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 0,
  });

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
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
