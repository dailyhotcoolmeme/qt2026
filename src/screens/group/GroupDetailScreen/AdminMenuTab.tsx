import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { theme } from 'src/theme'
import type { GroupRow, GroupMenuConfig, GroupUpdate } from 'src/lib/types'

interface AdminMenuTabProps {
  group: GroupRow
  onUpdateGroup: (data: GroupUpdate) => Promise<void>
}

const DEFAULT_MENU: GroupMenuConfig = { faith: true, prayer: true, social: true, schedule: true }

const MENU_LABELS: Record<keyof GroupMenuConfig, string> = {
  faith: '신앙생활',
  prayer: '중보기도',
  social: '교제나눔',
  schedule: '모임일정',
}

export function AdminMenuTab({ group, onUpdateGroup }: AdminMenuTabProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()

  const [menuSettings, setMenuSettings] = useState<GroupMenuConfig>(
    group.menu_settings ?? group.menu_config ?? DEFAULT_MENU,
  )

  const handleToggle = async (key: keyof GroupMenuConfig, val: boolean) => {
    const newSettings = { ...menuSettings, [key]: val }
    const activeCount = Object.values(newSettings).filter(Boolean).length
    if (activeCount < 1) {
      Alert.alert('알림', '최소 1개 이상의 메뉴는 활성화해야 합니다.')
      return
    }
    setMenuSettings(newSettings)
    try {
      await onUpdateGroup({ menu_settings: newSettings })
    } catch {
      Alert.alert('오류', '메뉴 설정 저장에 실패했습니다.')
      setMenuSettings(menuSettings)
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.spacing['2xl'] }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>메뉴 설정</Text>
      <Text style={[styles.desc, { color: colors.textSecondary }]}>
        활성화된 메뉴만 탭에 표시됩니다. 최소 1개 이상 활성화해야 합니다.
      </Text>
      {(Object.keys(MENU_LABELS) as Array<keyof GroupMenuConfig>).map((key) => (
        <View key={key} style={[styles.switchRow, { borderBottomColor: colors.divider }]}>
          <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>{MENU_LABELS[key]}</Text>
          <Switch
            value={menuSettings[key]}
            onValueChange={(val) => void handleToggle(key, val)}
            trackColor={{ false: colors.divider, true: colors.primary }}
            thumbColor={colors.background}
          />
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: theme.spacing.screenPaddingH },
  sectionTitle: { ...theme.typography.styles.h3, marginBottom: theme.spacing.sm },
  desc: { ...theme.typography.styles.bodySmall, marginBottom: theme.spacing.md },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  switchLabel: { ...theme.typography.styles.body },
})
