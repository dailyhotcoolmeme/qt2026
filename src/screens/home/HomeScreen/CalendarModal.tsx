import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Ionicons } from '@expo/vector-icons'

const ACCENT = '#4A6741'
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface CalendarModalProps {
  visible: boolean
  selectedDate: Date
  maxDate: Date
  activityDateKeys: Set<string>
  onSelectDate: (date: Date) => void
  onClose: () => void
}

export function CalendarModal({
  visible,
  selectedDate,
  maxDate,
  activityDateKeys,
  onSelectDate,
  onClose,
}: CalendarModalProps) {
  const { isDark } = useAppTheme()

  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())

  useEffect(() => {
    if (visible) {
      setViewYear(selectedDate.getFullYear())
      setViewMonth(selectedDate.getMonth())
    }
  }, [visible, selectedDate])

  const selectedDateKey = formatDateKey(selectedDate)
  const maxDateKey = formatDateKey(maxDate)
  const todayKey = formatDateKey(new Date())

  const maxMonthValue = maxDate.getFullYear() * 12 + maxDate.getMonth()
  const viewMonthValue = viewYear * 12 + viewMonth
  const canGoNext = viewMonthValue < maxMonthValue

  const moveMonth = (offset: number) => {
    const next = new Date(viewYear, viewMonth + offset, 1)
    const nextMonthValue = next.getFullYear() * 12 + next.getMonth()
    if (offset > 0 && nextMonthValue > maxMonthValue) return
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(viewYear, viewMonth, i - firstWeekday + 1)
    return date
  })

  const bg = isDark ? '#1E1E1E' : '#FFFFFF'
  const textColor = isDark ? '#F5F5F5' : '#18181B'
  const secondaryText = isDark ? '#71717A' : '#9CA3AF'

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: bg }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>말씀 날짜 선택</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={secondaryText} />
            </Pressable>
          </View>

          {/* 월 이동 */}
          <View style={styles.monthRow}>
            <Pressable onPress={() => moveMonth(-1)} hitSlop={8} style={styles.monthBtn}>
              <Ionicons name="chevron-back" size={22} color={textColor} />
            </Pressable>
            <Text style={[styles.monthText, { color: textColor }]}>
              {viewYear}년 {viewMonth + 1}월
            </Text>
            <Pressable
              onPress={() => moveMonth(1)}
              hitSlop={8}
              style={styles.monthBtn}
              disabled={!canGoNext}
            >
              <Ionicons name="chevron-forward" size={22} color={canGoNext ? textColor : '#D4D4D8'} />
            </Pressable>
          </View>

          {/* 요일 헤더 */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={[styles.weekday, { color: secondaryText }]}>{day}</Text>
            ))}
          </View>

          {/* 날짜 그리드 */}
          <View style={styles.grid}>
            {cells.map((date, i) => {
              const dateKey = formatDateKey(date)
              const isCurrentMonth = date.getMonth() === viewMonth
              const isFuture = dateKey > maxDateKey
              const isSelected = dateKey === selectedDateKey
              const isToday = dateKey === todayKey
              const hasActivity = activityDateKeys.has(dateKey)

              let cellBg = 'transparent'
              let cellText = isDark ? '#F5F5F5' : '#3F3F46'
              if (!isCurrentMonth) cellText = isDark ? '#3F3F46' : '#D4D4D8'
              if (isFuture) cellText = isDark ? '#3F3F46' : '#D4D4D8'
              if (isSelected) { cellBg = ACCENT; cellText = '#FFFFFF' }

              return (
                <View key={i} style={styles.cell}>
                  <Pressable
                    onPress={() => {
                      if (isFuture || !isCurrentMonth) return
                      onSelectDate(date)
                      onClose()
                    }}
                    disabled={isFuture || !isCurrentMonth}
                    style={[
                      styles.dayBtn,
                      { backgroundColor: cellBg },
                      isToday && !isSelected ? styles.todayRing : null,
                    ]}
                  >
                    <Text style={[styles.dayText, { color: cellText }]}>
                      {date.getDate()}
                    </Text>
                    {hasActivity && (
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: isSelected ? '#FFFFFF' : ACCENT },
                        ]}
                      />
                    )}
                  </Pressable>
                </View>
              )
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  monthBtn: {
    padding: 8,
    borderRadius: 20,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '900',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    marginBottom: 4,
  },
  dayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayRing: {
    borderWidth: 1,
    borderColor: `${ACCENT}59`,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
  },
})
