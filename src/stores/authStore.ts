import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import type { ProfileRow } from 'src/lib/types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: ProfileRow | null
  isLoading: boolean

  // Actions
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: ProfileRow | null) => void
  setLoading: (isLoading: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ user: null, session: null, profile: null, isLoading: false }),
}))
