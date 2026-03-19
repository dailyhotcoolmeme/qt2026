import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Feather } from '@expo/vector-icons'
import { theme } from 'src/theme'
import type { QTRecord } from 'src/hooks/home/useQT'

export interface QTSectionProps {
  date: string
  qtRecord: QTRecord | null
  isLoading: boolean
  onSave: (data: { content: string }) => Promise<void>
  isSaving: boolean
  onDelete?: () => void
}

export function QTSection({ qtRecord, isLoading, onSave, isSaving, onDelete }: QTSectionProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState('')
  const { width: screenWidth } = useWindowDimensions()

  useEffect(() => { if (qtRecord?.content) setText(qtRecord.content) }, [qtRecord])

  const handleSave = async () => {
    if (!text.trim()) return
    await onSave({ content: text.trim() })
    setIsEditing(false)
  }

  const cardStyle = [styles.card, { width: screenWidth * 0.82 }]

  const Header = (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <Feather name="book-open" size={14} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>오늘의 QT</Text>
      </View>
      {qtRecord && !isEditing && (
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => { setText(qtRecord.content ?? ''); setIsEditing(true) }}
            hitSlop={8} style={styles.actionBtn}
          >
            <Feather name="edit-2" size={14} color={colors.textSecondary} />
            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>수정</Text>
          </Pressable>
          {onDelete && (
            <Pressable onPress={onDelete} hitSlop={8} style={styles.actionBtn}>
              <Feather name="trash-2" size={14} color={colors.error} />
            </Pressable>
          )}
        </View>
      )}
      {isEditing && (
        <Pressable onPress={() => setIsEditing(false)} hitSlop={8}>
          <Feather name="x" size={18} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  )

  if (isLoading) {
    return (
      <View style={[cardStyle, styles.centered]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    )
  }

  if (qtRecord && !isEditing) {
    return (
      <View style={cardStyle}>
        {Header}
        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator indicatorStyle="black" keyboardShouldPersistTaps="handled">
          <Text style={[styles.recordContent, { color: colors.textPrimary }]}>{qtRecord.content}</Text>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={cardStyle}>
      {Header}
      {!isEditing ? (
        <Pressable
          onPress={() => setIsEditing(true)}
          style={[styles.emptyPrompt, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
        >
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>오늘의 QT를 기록해보세요...</Text>
        </Pressable>
      ) : (
        <>
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator indicatorStyle="black" keyboardShouldPersistTaps="handled">
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
              value={text}
              onChangeText={setText}
              placeholder="오늘 말씀을 묵상하며 느낀 점을 적어보세요..."
              placeholderTextColor={colors.inputPlaceholder}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </ScrollView>
          <Pressable
            onPress={handleSave}
            disabled={isSaving || !text.trim()}
            style={[styles.saveBtn, { backgroundColor: text.trim() ? colors.primary : colors.inputBackground, opacity: isSaving ? 0.7 : 1 }]}
          >
            {isSaving
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={[styles.saveBtnText, { color: text.trim() ? '#FFFFFF' : colors.textTertiary }]}>저장</Text>
            }
          </Pressable>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    minHeight: 450,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.06,
    shadowRadius: 45,
    elevation: 8,
  },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '600' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 4 },
  actionBtnText: { fontSize: 13, fontWeight: '500' },
  scrollArea: { flex: 1 },
  recordContent: { fontSize: 15, lineHeight: 24 },
  emptyPrompt: { borderRadius: 10, borderWidth: 1, padding: 16, minHeight: 80, justifyContent: 'center', borderStyle: 'dashed' },
  emptyText: { fontSize: 14, lineHeight: 20 },
  input: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 15, lineHeight: 24, minHeight: 200 },
  saveBtn: { borderRadius: 10, height: 44, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '600' },
})
