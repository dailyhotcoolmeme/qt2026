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
import { Loading, EmptyState } from 'src/components/common'
import { theme } from 'src/theme'
import { useAuthStore } from 'src/stores/authStore'
import type { PrayerRow } from 'src/lib/types'
import { usePrayerBox } from 'src/hooks/prayer/usePrayerBox'

interface PrayerTabProps {
  groupId: string
}

export function PrayerTab({ groupId }: PrayerTabProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)

  const [prayers, setPrayers] = useState<PrayerRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const { savedIds, addPrayer, removePrayer } = usePrayerBox()

  const fetchPrayers = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('prayers')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setPrayers((data ?? []) as PrayerRow[])
    } catch (e) {
      console.error('[PrayerTab]', e)
    } finally {
      setIsLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    void fetchPrayers()
    const channel = supabase
      .channel(`prayer-tab-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prayers', filter: `group_id=eq.${groupId}` }, () => void fetchPrayers())
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [groupId, fetchPrayers])

  const handleSave = async () => {
    if (!user || !title.trim()) {
      Alert.alert('필수 항목', '기도 제목을 입력해주세요.')
      return
    }
    setIsSaving(true)
    try {
      const { error } = await supabase.from('prayers').insert({
        user_id: user.id,
        title: title.trim(),
        content: content.trim() || null,
        voice_url: null,
        voice_duration: null,
        group_id: groupId,
        is_public: true,
        is_answered: false,
        pray_count: 0,
      } as never)
      if (error) throw error
      setTitle('')
      setContent('')
      setModalVisible(false)
    } catch (e) {
      console.error('[PrayerTab save]', e)
      Alert.alert('오류', '저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const renderItem = ({ item }: ListRenderItemInfo<PrayerRow>) => {
    const isSaved = savedIds.has(String(item.id))
    return (
    <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.itemHeader}>
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.is_answered && (
          <View style={[styles.answeredBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.answeredText, { color: colors.primary }]}>응답됨</Text>
          </View>
        )}
        <Pressable
          onPress={() => {
            if (isSaved) void removePrayer(String(item.id))
            else void addPrayer(String(item.id))
          }}
          hitSlop={8}
          style={styles.bookmarkBtn}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={16}
            color={isSaved ? colors.primary : colors.textTertiary}
          />
        </Pressable>
      </View>
      {item.content ? (
        <Text style={[styles.itemContent, { color: colors.textSecondary }]} numberOfLines={3}>
          {item.content}
        </Text>
      ) : null}
      <View style={styles.itemFooter}>
        <Ionicons name="heart-outline" size={14} color={colors.textTertiary} />
        <Text style={[styles.prayCount, { color: colors.textTertiary }]}>{item.pray_count}</Text>
      </View>
    </View>
  )
  }

  if (isLoading) return <Loading />

  return (
    <View style={styles.container}>
      <FlatList
        data={prayers}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="heart-outline" size={40} color={colors.textTertiary} />}
            title="공유된 기도 제목이 없습니다"
            description="그룹과 함께 기도 제목을 나눠보세요"
          />
        }
      />

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 16 }]}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="기도 제목 추가"
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>기도 제목 나눔</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={[styles.inputTitle, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.inputBorder }]}
                placeholder="기도 제목 *"
                placeholderTextColor={colors.inputPlaceholder}
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                style={[styles.inputContent, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.inputBorder }]}
                placeholder="기도 내용 (선택)"
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
                  {isSaving ? '저장 중...' : '나누기'}
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
  item: { padding: theme.spacing.md, borderRadius: theme.spacing.borderRadius, borderWidth: 1, gap: theme.spacing.xs },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  bookmarkBtn: { marginLeft: theme.spacing.xs },
  itemTitle: { ...theme.typography.styles.h4, flex: 1 },
  answeredBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.spacing.borderRadiusSm },
  answeredText: { ...theme.typography.styles.caption, fontWeight: theme.typography.fontWeight.medium },
  itemContent: { ...theme.typography.styles.body },
  itemFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  prayCount: { ...theme.typography.styles.caption },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.screenPaddingH, paddingVertical: theme.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { ...theme.typography.styles.h4 },
  modalBody: { padding: theme.spacing.screenPaddingH, gap: theme.spacing.sm },
  inputTitle: { height: theme.spacing.inputHeight, borderRadius: theme.spacing.borderRadiusSm, borderWidth: 1, paddingHorizontal: theme.spacing.md, ...theme.typography.styles.body },
  inputContent: { borderRadius: theme.spacing.borderRadiusSm, borderWidth: 1, padding: theme.spacing.md, height: 100, ...theme.typography.styles.body },
  saveButton: { height: theme.spacing.buttonHeight, borderRadius: theme.spacing.borderRadius, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.xs },
  saveButtonText: { ...theme.typography.styles.button },
})
