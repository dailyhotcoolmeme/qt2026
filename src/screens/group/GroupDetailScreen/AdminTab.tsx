import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { theme } from 'src/theme'
import type { GroupRow, GroupRole, GroupUpdate } from 'src/lib/types'
import type { GroupMemberWithProfile } from 'src/hooks/group/useGroup'
import { AdminInfoTab } from './AdminInfoTab'
import { AdminMenuTab } from './AdminMenuTab'
import { AdminManageTab } from './AdminManageTab'

type SubTab = 'info' | 'menu' | 'manage'

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'info', label: '기본 정보' },
  { key: 'menu', label: '메뉴 설정' },
  { key: 'manage', label: '모임 관리' },
]

interface AdminTabProps {
  group: GroupRow
  members: GroupMemberWithProfile[]
  myRole: GroupRole
  onUpdateGroup: (data: GroupUpdate) => Promise<void>
  onUpdateMemberRole: (userId: string, role: GroupRole) => Promise<void>
  onRemoveMember: (userId: string) => Promise<void>
  onLeaveGroup: () => Promise<void>
  onAddScopeLeader: (userId: string) => Promise<void>
  onRemoveScopeLeader: (userId: string) => Promise<void>
}

export function AdminTab({
  group,
  myRole,
  onUpdateGroup,
  onAddScopeLeader,
  onRemoveScopeLeader,
}: AdminTabProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('info')

  const renderContent = () => {
    switch (activeSubTab) {
      case 'info':
        return <AdminInfoTab group={group} onUpdateGroup={onUpdateGroup} />
      case 'menu':
        return <AdminMenuTab group={group} onUpdateGroup={onUpdateGroup} />
      case 'manage':
        return (
          <AdminManageTab
            group={group}
            myRole={myRole}
            onAddScopeLeader={onAddScopeLeader}
            onRemoveScopeLeader={onRemoveScopeLeader}
          />
        )
      default:
        return null
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.subTabBar, { borderBottomColor: colors.border }]}>
        {SUB_TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveSubTab(tab.key)}
            style={[
              styles.subTab,
              activeSubTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeSubTab === tab.key }}
          >
            <Text
              style={[
                styles.subTabLabel,
                {
                  color: activeSubTab === tab.key ? colors.primary : colors.textSecondary,
                  fontWeight: activeSubTab === tab.key
                    ? theme.typography.fontWeight.semiBold
                    : theme.typography.fontWeight.regular,
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  subTabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabLabel: { ...theme.typography.styles.bodySmall },
  content: { flex: 1 },
})
