import { useCallback } from 'react'
import { Alert } from 'react-native'
import type { NavigationProp } from '@react-navigation/native'
import type { RootStackParamList } from 'src/navigation/types'
import type { NotificationSettings } from 'src/lib/types'
import type { SettingsRowProps } from './SettingsRow'

type ThemeMode = 'system' | 'light' | 'dark'
type FontSize = 'sm' | 'md' | 'lg' | 'xl'

interface UseSectionsParams {
  notif: NotificationSettings
  isUpdatingNotifications: boolean
  themeMode: ThemeMode
  fontSize: FontSize
  hapticEnabled: boolean
  appVersion: string
  handleNotifToggle: (key: keyof NotificationSettings) => (value: boolean) => void
  setThemeMode: (mode: ThemeMode) => void
  setFontSize: (size: FontSize) => void
  setHapticEnabled: (enabled: boolean) => void
  handleSignOut: () => void
  navigation: NavigationProp<RootStackParamList>
}

interface SectionDef {
  title: string
  data: SettingsRowProps[]
}

export function useSections({
  notif,
  isUpdatingNotifications,
  themeMode,
  fontSize,
  hapticEnabled,
  appVersion,
  handleNotifToggle,
  setThemeMode,
  setFontSize,
  setHapticEnabled,
  handleSignOut,
  navigation,
}: UseSectionsParams): SectionDef[] {
  const themeModeLabel =
    themeMode === 'system' ? '시스템' : themeMode === 'light' ? '라이트' : '다크'
  const fontSizeLabel =
    fontSize === 'sm' ? '작게' : fontSize === 'md' ? '보통' : fontSize === 'lg' ? '크게' : '매우 크게'

  const onThemePress = useCallback(() => {
    Alert.alert('테마 선택', undefined, [
      { text: '시스템', onPress: () => setThemeMode('system') },
      { text: '라이트', onPress: () => setThemeMode('light') },
      { text: '다크', onPress: () => setThemeMode('dark') },
      { text: '취소', style: 'cancel' },
    ])
  }, [setThemeMode])

  const onFontPress = useCallback(() => {
    Alert.alert('폰트 크기', undefined, [
      { text: '작게', onPress: () => setFontSize('sm') },
      { text: '보통', onPress: () => setFontSize('md') },
      { text: '크게', onPress: () => setFontSize('lg') },
      { text: '취소', style: 'cancel' },
    ])
  }, [setFontSize])

  const notifSection: SectionDef = {
    title: '알림 설정',
    data: [
      { type: 'toggle', label: '오늘의 말씀', value: notif.daily_word, onValueChange: handleNotifToggle('daily_word'), disabled: isUpdatingNotifications },
      { type: 'toggle', label: 'QT 알림', value: notif.qt_reminder, onValueChange: handleNotifToggle('qt_reminder'), disabled: isUpdatingNotifications },
      { type: 'toggle', label: '기도 알림', value: notif.prayer_reminder, onValueChange: handleNotifToggle('prayer_reminder'), disabled: isUpdatingNotifications },
      { type: 'toggle', label: '그룹 활동', value: notif.group_activity, onValueChange: handleNotifToggle('group_activity'), disabled: isUpdatingNotifications },
      { type: 'toggle', label: '기도 응답', value: notif.prayer_response, onValueChange: handleNotifToggle('prayer_response'), disabled: isUpdatingNotifications },
    ],
  }

  const appSection: SectionDef = {
    title: '앱 설정',
    data: [
      { type: 'chevron', label: '테마', valueLabel: themeModeLabel, onPress: onThemePress },
      { type: 'chevron', label: '폰트 크기', valueLabel: fontSizeLabel, onPress: onFontPress },
      { type: 'toggle', label: '햅틱 피드백', value: hapticEnabled, onValueChange: setHapticEnabled },
    ],
  }

  const accountSection: SectionDef = {
    title: '계정',
    data: [
      { type: 'chevron', label: '이용약관', onPress: () => navigation.navigate('Terms', { type: 'service' }) },
      { type: 'chevron', label: '개인정보처리방침', onPress: () => navigation.navigate('Terms', { type: 'privacy' }) },
      { type: 'chevron', label: '로그아웃', onPress: handleSignOut, destructive: true },
      { type: 'value', label: '앱 버전', value: appVersion },
    ],
  }

  return [notifSection, appSection, accountSection]
}
