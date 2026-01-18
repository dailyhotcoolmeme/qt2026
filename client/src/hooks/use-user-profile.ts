import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UserProfile {
  id: string;
  kakao_id?: string;
  nickname?: string;
  church?: string;
  rank?: string;
  age_group?: string;
  bible_complete_count: number;
  created_at: string;
}

export function useUserProfile() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error, refetch } = useQuery<UserProfile | null>({
    queryKey: ['/api/user/profile'],
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      return apiRequest('PUT', '/api/user/profile', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
    },
  });

  const updateProfile = (updates: Partial<UserProfile>) => {
    updateMutation.mutate(updates);
  };

  return {
    profile,
    isLoading,
    error,
    refetch,
    updateProfile,
    isUpdating: updateMutation.isPending,
  };
}
