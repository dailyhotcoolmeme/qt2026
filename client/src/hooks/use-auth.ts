import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    // Server session not present — try Supabase client session as a fallback
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        // Map Supabase user shape into server User model minimally
        return {
          id: data.user.id,
          nickname: (data.user.user_metadata as any)?.nickname ?? null,
          church: null,
          rank: null,
          age_group: null,
          bible_complete_count: 0,
          created_at: data.user.created_at ?? new Date().toISOString(),
        } as unknown as User;
      }
    } catch (e) {
      // ignore and fall through to null
    }
    return null;
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

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
