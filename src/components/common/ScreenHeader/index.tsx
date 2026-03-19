import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { theme } from 'src/theme'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  paddingTop?: number
  rightElement?: React.ReactNode
}

export function ScreenHeader({ title, subtitle, paddingTop = 0, rightElement }: ScreenHeaderProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  return (
    <View style={[styles.header, { paddingTop, backgroundColor: colors.header, borderBottomColor: colors.headerBorder }]}>
      <View style={styles.row}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
          ) : null}
        </View>
        {rightElement ? <View style={styles.right}>{rightElement}</View> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  titleBlock: { flex: 1 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 3,
  },
  right: { marginBottom: 2 },
})
