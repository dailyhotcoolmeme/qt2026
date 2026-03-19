import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from 'src/lib/supabase'
import { useAuthStore } from 'src/stores/authStore'
import type { VerseFavoriteRow } from 'src/lib/types'
import type { PostgrestError } from '@supabase/supabase-js'

async function fetchFavorites(userId: string): Promise<VerseFavoriteRow[]> {
  const { data, error } = await supabase
    .from('verse_favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error as PostgrestError
  }

  return data ?? []
}

async function deleteFavorite(id: string): Promise<void> {
  const { error } = await supabase
    .from('verse_favorites')
    .delete()
    .eq('id', id)

  if (error) {
    throw error as PostgrestError
  }
}

export function useFavorites() {
  const user = useAuthStore((state) => state.user)
  const userId = user?.id ?? ''
  const queryClient = useQueryClient()

  const {
    data: favorites = [],
    isLoading,
  } = useQuery<VerseFavoriteRow[], PostgrestError>({
    queryKey: ['verse_favorites', userId],
    queryFn: () => fetchFavorites(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })

  const { mutate: removeFavorite } = useMutation<void, PostgrestError, string>({
    mutationFn: (id: string) => deleteFavorite(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['verse_favorites', userId] })
    },
  })

  return {
    favorites,
    isLoading,
    removeFavorite,
  }
}
