import { useState, useCallback } from 'react'
import { Alert } from 'react-native'
import type { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js'
import { supabase } from 'src/lib/supabase'
import { useAuthStore } from 'src/stores/authStore'
import type { NotificationSettings, ProfileRow } from 'src/lib/types'

interface UpdateProfileData {
  full_name?: string
  avatar_url?: string
}

interface UseSettingsReturn {
  profile: ProfileRow | null
  isUpdatingProfile: boolean
  isUpdatingNotifications: boolean
  updateProfile: (data: UpdateProfileData) => Promise<boolean>
  updateNotificationSettings: (settings: NotificationSettings) => Promise<boolean>
  signOut: () => Promise<void>
}

// The existing Database generic resolves profiles.Update to `never` because
// NotificationSettings is a named interface not compatible with supabase-js's
// internal Json type for jsonb columns. We type the rpc call result explicitly
// and use a direct REST approach to avoid the `never` update constraint.

async function updateProfileFields(
  userId: string,
  data: UpdateProfileData,
): Promise<PostgrestSingleResponse<ProfileRow>> {
  const client = supabase.from('profiles')
  // The cast through unknown is required because Database.profiles.Update
  // evaluates to `never` due to json column type incompatibility.
  return (client.update(data as unknown as never).eq('id', userId).select().single()) as unknown as Promise<PostgrestSingleResponse<ProfileRow>>
}

async function updateProfileNotifications(
  userId: string,
  settings: NotificationSettings,
): Promise<{ error: PostgrestError | null }> {
  const client = supabase.from('profiles')
  return (client.update({ notification_settings: settings } as unknown as never).eq('id', userId)) as unknown as Promise<{ error: PostgrestError | null }>
}

export function useSettings(): UseSettingsReturn {
  const { user, profile, setProfile } = useAuthStore()
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false)

  const updateProfile = useCallback(async (data: UpdateProfileData): Promise<boolean> => {
    if (!user?.id) return false
    setIsUpdatingProfile(true)
    try {
      const { data: updated, error } = await updateProfileFields(user.id, data)
      if (error) {
        Alert.alert('오류', error.message)
        return false
      }
      if (updated) {
        setProfile(updated)
      }
      return true
    } catch {
      Alert.alert('오류', '프로필 업데이트에 실패했습니다.')
      return false
    } finally {
      setIsUpdatingProfile(false)
    }
  }, [user?.id, setProfile])

  const updateNotificationSettings = useCallback(
    async (settings: NotificationSettings): Promise<boolean> => {
      if (!user?.id) return false
      setIsUpdatingNotifications(true)
      try {
        const { error } = await updateProfileNotifications(user.id, settings)
        if (error) {
          Alert.alert('오류', error.message)
          return false
        }
        if (profile) {
          setProfile({ ...profile, notification_settings: settings })
        }
        return true
      } catch {
        Alert.alert('오류', '알림 설정 업데이트에 실패했습니다.')
        return false
      } finally {
        setIsUpdatingNotifications(false)
      }
    },
    [user?.id, profile, setProfile],
  )

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      Alert.alert('오류', '로그아웃에 실패했습니다.')
      return
    }
    useAuthStore.getState().clear()
  }, [])

  return {
    profile,
    isUpdatingProfile,
    isUpdatingNotifications,
    updateProfile,
    updateNotificationSettings,
    signOut,
  }
}
