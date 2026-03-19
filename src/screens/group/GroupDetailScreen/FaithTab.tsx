import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ListRenderItemInfo,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from 'src/lib/supabase'
import { Avatar, Loading, EmptyState } from 'src/components/common'
import { theme } from 'src/theme'
import { useAuthStore } from 'src/stores/authStore'
import type { QTRecordRow, ProfileRow } from 'src/lib/types'

interface FaithTabProps {
  groupId: string
}

type QTItem = QTRecordRow & { profile: ProfileRow | null }

export function FaithTab({ groupId }: FaithTabProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)

  const [items, setItems] = useState<QTItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [book, setBook] = useState('')
  const [chapter, setChapter] = useState('')
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: records, error } = await supabase
        .from('qt_records')
        .select('*')
        .eq('group_id', groupId)
        .eq('date', today)
        .order('created_at', { ascending: false })

      if (error) throw error
      const qtRows = (records ?? []) as QTRecordRow[]
      const userIds = qtRows.map((r) => r.user_id)
      if (userIds.length === 0) {
        setItems([])
        return
      }
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
      if (pErr) throw pErr
      const profileMap = new Map<string, ProfileRow>(
        ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]),
      )
      setItems(qtRows.map((r) => ({ ...r, profile: profileMap.get(r.user_id) ?? null })))
    } catch (e) {
      console.error('[FaithTab]', e)
    } finally {
      setIsLoading(false)
    }
  }, [groupId, today])

  useEffect(() => {
    void fetchItems()
    const channel = supabase
      .channel(`faith-tab-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qt_records', filter: `group_id=eq.${groupId}` }, () => void fetchItems())
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [groupId, fetchItems])

  const handleSave = async () => {
    if (!user || !book.trim()) {
      Alert.alert('필수 항목', '성경 이름을 입력해주세요.')
      return
    }
    const chapterNum = parseInt(chapter, 10)
    if (!chapter.trim() || isNaN(chapterNum)) {
      Alert.alert('필수 항목', '장을 숫자로 입력해주세요.')
      return
    }
    setIsSaving(true)
    try {
      const { error } = await supabase.from('qt_records').insert({
        user_id: user.id,
        date: today,
        book: book.trim(),
        chapter: chapterNum,
        verse_start: null,
        verse_end: null,
        reference: null,
        content: content.trim() || null,
        voice_url: null,
        voice_duration: null,
        group_id: groupId,
        is_linked: true,
      } as never)
      if (error) throw error
      setBook('')
      setChapter('')
      setContent('')
      setModalVisible(false)
    } catch (e) {
      console.error('[FaithTab save]', e)
      Alert.alert('오류', '저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const renderItem = ({ item }: ListRenderItemInfo<QTItem>) => (
    <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Avatar uri={item.profile?.avatar_url} name={item.profile?.full_name} size={36} />
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.textPrimary }]}>
          {item.profile?.full_name ?? '알 수 없음'}
        </Text>
        <Text style={[styles.itemRef, { color: colors.textSecondary }]}>
          {item.reference ?? `${item.book} ${item.chapter}장`}
        </Text>
      </View>
      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
    </View>
  )

  if (isLoading) return <Loading />

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="book-outline" size={40} color={colors.textTertiary} />}
            title="오늘 QT를 완료한 멤버가 없습니다"
            description="말씀을 나누고 함께 성장해보세요"
          />
        }
      />

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 16 }]}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="신앙 활동 기록"
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>오늘의 QT 나눔</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.inputBook, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.inputBorder }]}
                  placeholder="성경 (예: 요한복음)"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={book}
                  onChangeText={setBook}
                />
                <TextInput
                  style={[styles.inputChapter, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.inputBorder }]}
                  placeholder="장"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={chapter}
                  onChangeText={setChapter}
                  keyboardType="number-pad"
                />
              </View>
              <TextInput
                style={[styles.inputContent, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.inputBorder }]}
                placeholder="묵상 내용 (선택)"
                placeholderTextColor={colors.inputPlaceholder}
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Pressable
                style={[styles.saveButton, { backgroundColor: isSaving ? colors.textTertiary : colors.primary }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
                  {isSaving ? '저장 중...' : '기록하기'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: theme.spacing.screenPaddingH, gap: theme.spacing.sm, flexGrow: 1 },
  item: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderRadius: theme.spacing.borderRadius, borderWidth: 1, gap: theme.spacing.sm },
  itemInfo: { flex: 1 },
  itemName: { ...theme.typography.styles.h4 },
  itemRef: { ...theme.typography.styles.bodySmall },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.screenPaddingH, paddingVertical: theme.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { ...theme.typography.styles.h4 },
  modalBody: { padding: theme.spacing.screenPaddingH, gap: theme.spacing.sm },
  rowInputs: { flexDirection: 'row', gap: theme.spacing.sm },
  inputBook: { flex: 1, height: theme.spacing.inputHeight, borderRadius: theme.spacing.borderRadiusSm, borderWidth: 1, paddingHorizontal: theme.spacing.md, ...theme.typography.styles.body },
  inputChapter: { width: 72, height: theme.spacing.inputHeight, borderRadius: theme.spacing.borderRadiusSm, borderWidth: 1, paddingHorizontal: theme.spacing.md, ...theme.typography.styles.body },
  inputContent: { borderRadius: theme.spacing.borderRadiusSm, borderWidth: 1, padding: theme.spacing.md, height: 100, ...theme.typography.styles.body },
  saveButton: { height: theme.spacing.buttonHeight, borderRadius: theme.spacing.borderRadius, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.xs },
  saveButtonText: { ...theme.typography.styles.button },
})
