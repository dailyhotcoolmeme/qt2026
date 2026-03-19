import React, { useState, useCallback } from 'react'
import { View, ScrollView, StyleSheet, Pressable } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { theme } from 'src/theme'
import { ScreenHeader } from 'src/components/common'
import { useQT } from 'src/hooks/home/useQT'
import { QTSection } from 'src/screens/home/HomeScreen/QTSection'

const TODAY = new Date().toISOString().split('T')[0]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function QTScreen() {
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const [selectedDate, setSelectedDate] = useState(TODAY)

  const { todayRecord, isLoading, saveQT, isSaving, deleteQT } = useQT(selectedDate)

  const goBack = useCallback(() => setSelectedDate(d => offsetDate(d, -1)), [])
  const goForward = useCallback(() => {
    if (selectedDate < TODAY) setSelectedDate(d => offsetDate(d, 1))
  }, [selectedDate])

  const handleDelete = useCallback(() => {
    if (!todayRecord) return
    void deleteQT(todayRecord.id)
  }, [todayRecord, deleteQT])

  const navButtons = (
    <View style={styles.navRow}>
      <Pressable onPress={goBack} hitSlop={8} style={styles.navBtn}>
        <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
      </Pressable>
      <Pressable
        onPress={goForward}
        hitSlop={8}
        style={[styles.navBtn, selectedDate >= TODAY && styles.navBtnDisabled]}
        disabled={selectedDate >= TODAY}
      >
        <Ionicons
          name="chevron-forward"
          size={20}
          color={selectedDate >= TODAY ? colors.textTertiary : colors.textSecondary}
        />
      </Pressable>
    </View>
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="QT일기"
        subtitle={formatDate(selectedDate)}
        paddingTop={insets.top + 8}
        rightElement={navButtons}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <QTSection
          date={selectedDate}
          qtRecord={todayRecord}
          isLoading={isLoading}
          onSave={saveQT}
          isSaving={isSaving}
          onDelete={todayRecord ? handleDelete : undefined}
        />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 24,
  },
  navRow: { flexDirection: 'row', gap: 4 },
  navBtn: { padding: 4 },
  navBtnDisabled: { opacity: 0.3 },
})
