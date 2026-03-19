import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { registerForPushNotifications } from 'src/lib/notifications'
import { supabase } from 'src/lib/supabase'
import { useAuthStore } from 'src/stores/authStore'
import type { ProfileUpdate } from 'src/lib/types'

// Expo Go에서는 푸시 알림 미지원 (SDK 53부터 제거됨)
const isExpoGo = Constants.appOwnership === 'expo'

export function usePushNotifications(): void {
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    if (isExpoGo) return  // Expo Go 환경에서는 건너뜀
    let isMounted = true

    async function setupPushToken(): Promise<void> {
      try {
        const token = await registerForPushNotifications()
        if (!token || !user || !isMounted) return

        const updateData: ProfileUpdate = { push_token: token }

        const { error } = await supabase
          .from('profiles')
          .update(updateData as never)
          .eq('id', user.id)

        if (error) {
          console.error('Failed to save push token:', error.message)
        }
      } catch (err) {
        console.error('Push notification setup error:', err)
      }
    }

    void setupPushToken()

    return () => {
      isMounted = false
    }
  }, [user])

  useEffect(() => {
    if (isExpoGo) return  // Expo Go 환경에서는 건너뜀
    const receivedListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received in foreground:', notification)
      },
    )

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<
          string,
          unknown
        >
        console.log('Notification tapped, data:', data)
        // TODO: 딥링크 처리 — navigation ref 연결 후 data 기반 라우팅 구현
      })

    return () => {
      receivedListener.remove()
      responseListener.remove()
    }
  }, [])
}
