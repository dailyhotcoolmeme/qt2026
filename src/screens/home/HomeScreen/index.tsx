import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Share,
  ScrollView,
  Alert,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import * as Clipboard from 'expo-clipboard'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { Image as ImageIcon, Copy, Bookmark, Share2 } from 'lucide-react-native'
import { useAuthStore } from 'src/stores/authStore'
import type { RootStackParamList } from 'src/navigation/types'
import { useDailyWord } from 'src/hooks/home/useDailyWord'
import { SwipeCardContainer } from './SwipeCardContainer'
import { DailyWordCard } from './DailyWordCard'
import { HomeHeader } from './HomeHeader'
import { AmenButton } from './AmenButton'
import { CalendarModal } from './CalendarModal'
import { VerseCardMakerModal } from './VerseCardMakerModal'
import { SideDrawer } from './SideDrawer'

const ACCENT = '#4A6741'

type NavProp = NativeStackNavigationProp<RootStackParamList>

function dateToString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function stringToDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const TODAY = dateToString(new Date())

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = 60 + insets.bottom  // TabNavigator: tabBarHeight(60) + safeArea
  const { isDark } = useAppTheme()
  const navigation = useNavigation<NavProp>()
  const user = useAuthStore((s) => s.user)

  const today = new Date()
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showCardMaker, setShowCardMaker] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)

  // 복사 토스트
  const toastOpacity = useSharedValue(0)
  const toastY = useSharedValue(20)
  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
    transform: [{ translateY: toastY.value }],
  }))

  const showCopyToast = useCallback(() => {
    toastOpacity.value = withTiming(1, { duration: 200 })
    toastY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) })
    toastOpacity.value = withDelay(2000, withTiming(0, { duration: 300 }))
    toastY.value = withDelay(2000, withTiming(20, { duration: 300 }))
  }, [toastOpacity, toastY])

  const {
    todayWord,
    isLoading,
    amenCount,
    hasAmened,
    handleAmen,
    handleBookmark,
    activityDateKeys,
  } = useDailyWord(selectedDate)

  const handleDateChange = useCallback(
    (date: string) => {
      const d = stringToDate(date)
      if (d > today) return
      setSelectedDate(date)
    },
    [today],
  )

  const handleCalendarSelect = useCallback(
    (date: Date) => {
      if (date > today) {
        Alert.alert('안내', '오늘 이후의 말씀은 미리 볼 수 없습니다.')
        return
      }
      setSelectedDate(dateToString(date))
    },
    [today],
  )

  const handleCopy = useCallback(async () => {
    if (!todayWord) return
    await Clipboard.setStringAsync(`${todayWord.content}\n— ${todayWord.reference}`)
    showCopyToast()
  }, [todayWord, showCopyToast])

  const handleShare = useCallback(async () => {
    if (!todayWord) return
    const unit = todayWord.bible_name === '시편' ? '편' : '장'
    const ref = `${todayWord.bible_name} ${todayWord.chapter}${unit} ${todayWord.verse}절`
    await Share.share({ message: `${ref}\n\n${todayWord.content}\n\n마이아멘(myAmen)` })
  }, [todayWord])

  const handleBookmarkPress = useCallback(async () => {
    if (!user) { navigation.navigate('Auth'); return }
    try {
      const result = await handleBookmark()
      if (result && 'alreadySaved' in result && result.alreadySaved) {
        Alert.alert('안내', '이미 저장된 말씀입니다.')
      } else {
        Alert.alert('완료', '즐겨찾기에 저장되었습니다.')
      }
    } catch {
      Alert.alert('오류', '즐겨찾기 저장에 실패했습니다.')
    }
  }, [user, handleBookmark, navigation])

  const handleCardMaker = useCallback(() => {
    if (!user) { navigation.navigate('Auth'); return }
    setShowCardMaker(true)
  }, [user, navigation])

  const renderCard = useCallback(
    (date: string, isCenter: boolean) => (
      <DailyWordCard
        word={date === selectedDate ? todayWord : null}
        isLoading={date === selectedDate && isCenter ? isLoading : false}
      />
    ),
    [selectedDate, todayWord, isLoading],
  )

  const selectedDateObj = stringToDate(selectedDate)
  const bgColor = isDark ? '#121212' : '#F8F8F8'

  return (
    <View style={[styles.root, { backgroundColor: bgColor, paddingBottom: tabBarHeight }]}>
      {/* TopBar + 날짜 헤더 */}
      <HomeHeader
        selectedDate={selectedDateObj}
        paddingTop={insets.top}
        onCalendarPress={() => setShowCalendar(true)}
        onMenuPress={() => setShowDrawer(true)}
        onSettingsPress={() => navigation.navigate('Settings')}
      />

      {/* 카드 + 하단 버튼: ScrollView */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardArea}>
          <SwipeCardContainer
            currentDate={selectedDate}
            onDateChange={handleDateChange}
            renderCard={renderCard}
          />
        </View>

        {/* 하단 버튼 영역 */}
        <View style={styles.bottom}>
          <View style={styles.actionRow}>
            <Pressable onPress={handleCardMaker} style={styles.actionItem}>
              <ImageIcon size={19} strokeWidth={1.2} color={ACCENT} />
              <Text style={[styles.actionLabel, { color: ACCENT }]}>카드 생성</Text>
            </Pressable>
            <Pressable onPress={() => void handleCopy()} style={styles.actionItem}>
              <Copy size={19} strokeWidth={1.2} color="#A1A1AA" />
              <Text style={[styles.actionLabel, { color: '#A1A1AA' }]}>말씀 복사</Text>
            </Pressable>
            <Pressable onPress={() => void handleBookmarkPress()} style={styles.actionItem}>
              <Bookmark size={19} strokeWidth={1.2} color="#A1A1AA" />
              <Text style={[styles.actionLabel, { color: '#A1A1AA' }]}>즐겨찾기</Text>
            </Pressable>
            <Pressable onPress={() => void handleShare()} style={styles.actionItem}>
              <Share2 size={19} strokeWidth={1.2} color="#A1A1AA" />
              <Text style={[styles.actionLabel, { color: '#A1A1AA' }]}>공유</Text>
            </Pressable>
          </View>
          <View style={styles.amenSection}>
            <AmenButton count={amenCount} hasAmened={hasAmened} onPress={handleAmen} />
          </View>
        </View>
      </ScrollView>

      {/* 복사 토스트 */}
      <Animated.View style={[styles.toast, toastStyle]} pointerEvents="none">
        <Text style={styles.toastText}>말씀을 복사했습니다.</Text>
      </Animated.View>

      {/* 달력 모달 */}
      <CalendarModal
        visible={showCalendar}
        selectedDate={selectedDateObj}
        maxDate={today}
        activityDateKeys={activityDateKeys}
        onSelectDate={handleCalendarSelect}
        onClose={() => setShowCalendar(false)}
      />

      {/* 말씀 카드 메이커 */}
      <VerseCardMakerModal
        visible={showCardMaker}
        onClose={() => setShowCardMaker(false)}
        title={todayWord?.reference ?? ''}
        content={todayWord?.content ?? ''}
        userId={user?.id ?? null}
      />

      {/* 사이드 드로어 */}
      <SideDrawer visible={showDrawer} onClose={() => setShowDrawer(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollArea: { flex: 1 },
  cardArea: {
    alignItems: 'center',
    overflow: 'visible',
    paddingTop: 4,
    paddingBottom: 4,
  },
  bottom: {
    paddingTop: 4,
    paddingBottom: 0,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  actionItem: {
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  amenSection: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  toast: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
})
