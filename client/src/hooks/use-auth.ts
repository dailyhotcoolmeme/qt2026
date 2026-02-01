import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  // If server reports unauthorized or the route is missing (404), fall back to Supabase client session
  if (response.status === 401 || response.status === 404) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
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
  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 0, // Always refetch on mount/focus to catch OAuth login
  });

  // Refetch user when auth state changes (e.g., after OAuth redirect)
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // Invalidate query cache so next mount will refetch user
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    });

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
