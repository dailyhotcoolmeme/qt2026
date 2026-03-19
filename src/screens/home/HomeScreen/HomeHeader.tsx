import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSettingsStore } from 'src/stores/settingsStore'

const ACCENT = '#4A6741'

interface HomeHeaderProps {
  selectedDate: Date
  paddingTop: number
  onCalendarPress: () => void
  onMenuPress: () => void
  onSettingsPress: () => void
}

const LOGO_TEXTS = ['마이아멘', 'myAmen']

export function HomeHeader({
  selectedDate,
  paddingTop,
  onCalendarPress,
  onMenuPress,
  onSettingsPress,
}: HomeHeaderProps) {
  const { isDark } = useAppTheme()
  const setThemeMode = useSettingsStore((s) => s.setThemeMode)

  const [logoIdx, setLogoIdx] = React.useState(0)
  const logoOpacity = useSharedValue(1)
  const logoY = useSharedValue(0)

  React.useEffect(() => {
    const interval = setInterval(() => {
      logoOpacity.value = withTiming(0, { duration: 300 }, () => {})
      logoY.value = withTiming(-10, { duration: 300 })
      setTimeout(() => {
        setLogoIdx((prev) => (prev + 1) % LOGO_TEXTS.length)
        logoY.value = 10
        logoOpacity.value = withTiming(1, { duration: 300 })
        logoY.value = withTiming(0, { duration: 300 })
      }, 300)
    }, 10000)
    return () => clearInterval(interval)
  }, [logoOpacity, logoY])

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }))

  const toggleTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark')
  }

  const year = selectedDate.getFullYear()
  const dateLabel = selectedDate.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  const topBarBg = isDark ? '#1A1A1A' : '#FFFFFF'
  const borderColor = isDark ? '#2A2A2A' : '#F0F0F0'
  const iconColor = isDark ? '#71717A' : '#52525B'

  return (
    <View>
      {/* ── TopBar: [햄버거 + 로고] [테마토글/알림/설정] ── */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: paddingTop,
            backgroundColor: topBarBg,
            borderBottomColor: borderColor,
          },
        ]}
      >
        <View style={styles.topBarInner}>
          {/* 왼쪽: 햄버거 + 로고 */}
          <View style={styles.topBarLeft}>
            <Pressable onPress={onMenuPress} style={styles.topIconBtn} hitSlop={8}>
              <Ionicons name="menu" size={24} color={isDark ? '#D4D4D8' : '#3F3F46'} />
            </Pressable>
            <View style={styles.logoWrap} pointerEvents="none">
              <Animated.Text style={[styles.logoText, { color: ACCENT }, logoAnimStyle]}>
                {LOGO_TEXTS[logoIdx]}
              </Animated.Text>
            </View>
          </View>

          {/* 오른쪽: 테마토글 + 알림 + 설정 */}
          <View style={styles.topBarRight}>
            <Pressable onPress={toggleTheme} style={styles.topIconBtn} hitSlop={8}>
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={20}
                color={iconColor}
              />
            </Pressable>
            <Pressable style={styles.topIconBtn} hitSlop={8}>
              <Ionicons name="notifications-outline" size={22} color={iconColor} />
            </Pressable>
            <Pressable onPress={onSettingsPress} style={styles.topIconBtn} hitSlop={8}>
              <Ionicons name="settings-outline" size={20} color={iconColor} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── 날짜 헤더: 연도 + [달력버튼 날짜 붙임] ── */}
      <View style={styles.dateHeader}>
        <Text style={[styles.year, { color: isDark ? '#71717A' : '#9CA3AF' }]}>
          {year}
        </Text>

        <View style={styles.dateRow}>
          <Pressable
            onPress={onCalendarPress}
            style={[styles.calendarBtn, { backgroundColor: isDark ? '#242424' : '#FFFFFF' }]}
            hitSlop={8}
          >
            <Ionicons name="calendar-outline" size={16} color={ACCENT} />
          </Pressable>
          <Text
            style={[styles.dateText, { color: isDark ? '#F5F5F5' : '#18181B' }]}
            numberOfLines={1}
          >
            {dateLabel}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  topBar: {
    borderBottomWidth: 1,
  },
  topBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 52,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topIconBtn: {
    padding: 8,
    borderRadius: 20,
    width: 44,
    alignItems: 'center',
  },
  logoWrap: {
    height: 28,
    justifyContent: 'center',
    overflow: 'hidden',
    marginLeft: 2,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  dateHeader: {
    alignItems: 'center',
    paddingTop: 26,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  year: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  dateText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
})
