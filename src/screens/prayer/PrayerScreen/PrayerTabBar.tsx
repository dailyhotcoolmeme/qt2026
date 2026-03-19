import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { theme } from 'src/theme'

export type TabType = 'mine' | 'public'

interface Props {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export function PrayerTabBar({ activeTab, onTabChange }: Props) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  return (
    <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
      {(['mine', 'public'] as TabType[]).map((tab) => {
        const isActive = activeTab === tab
        return (
          <Pressable
            key={tab}
            onPress={() => onTabChange(tab)}
            style={styles.tabItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive ? colors.primary : colors.textTertiary,
                  fontWeight: isActive
                    ? theme.typography.fontWeight.semiBold
                    : theme.typography.fontWeight.regular,
                },
              ]}
            >
              {tab === 'mine' ? '내 기도' : '공개 기도'}
            </Text>
            {isActive && (
              <View
                style={[styles.tabIndicator, { backgroundColor: colors.primary }]}
              />
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    position: 'relative',
  },
  tabLabel: {
    ...theme.typography.styles.body,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 2,
    borderRadius: 1,
  },
})
