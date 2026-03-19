import { useCallback } from 'react'
import { supabase } from 'src/lib/supabase'

interface UseAuthResult {
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthResult {
  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut()
  }, [])

  return { signOut }
}
