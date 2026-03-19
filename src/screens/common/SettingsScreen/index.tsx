import React, { useCallback } from 'react'
import { View, Text, SectionList, StyleSheet, Alert } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Constants from 'expo-constants'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from 'src/navigation/types'
import { useSettingsStore } from 'src/stores/settingsStore'
import { useSettings } from 'src/hooks/settings/useSettings'
import { theme } from 'src/theme'
import type { NotificationSettings } from 'src/lib/types'
import { ProfileSection } from './ProfileSection'
import { SettingsRow } from './SettingsRow'
import type { SettingsRowProps } from './SettingsRow'
import { useSections } from './useSections'

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>

interface SectionDef {
  title: string
  data: SettingsRowProps[]
}

export default function SettingsScreen({ navigation }: Props) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()

  const { themeMode, fontSize, hapticEnabled, setThemeMode, setFontSize, setHapticEnabled } =
    useSettingsStore()

  const { profile, isUpdatingProfile, isUpdatingNotifications, updateProfile, updateNotificationSettings, signOut } =
    useSettings()

  const notif: NotificationSettings = profile?.notification_settings ?? {
    daily_word: true,
    qt_reminder: true,
    prayer_reminder: true,
    group_activity: true,
    prayer_response: true,
  }

  const handleNotifToggle = useCallback(
    (key: keyof NotificationSettings) => (value: boolean) => {
      void updateNotificationSettings({ ...notif, [key]: value })
    },
    [notif, updateNotificationSettings],
  )

  const handleSignOut = useCallback(() => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => void signOut() },
    ])
  }, [signOut])

  const appVersion = Constants.expoConfig?.version ?? '1.0.0'

  const sections = useSections({
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
  })

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionList<SettingsRowProps, SectionDef>
        sections={sections}
        keyExtractor={(item, index) => `${item.label}-${index}`}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + theme.spacing.lg },
        ]}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <ProfileSection
            profile={profile}
            isUpdating={isUpdatingProfile}
            onUpdate={updateProfile}
          />
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionHeader, { color: colors.textTertiary, backgroundColor: colors.background }]}>
            {section.title}
          </Text>
        )}
        renderSectionFooter={() => <View style={styles.sectionFooter} />}
        renderItem={({ item }) => <SettingsRow {...item} />}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.divider }]} />
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: theme.spacing.md,
  },
  sectionHeader: {
    ...theme.typography.styles.caption,
    fontWeight: theme.typography.fontWeight.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
  },
  sectionFooter: {
    height: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: theme.spacing.screenPaddingH,
  },
})
