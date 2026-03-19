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

interface ScheduleTabProps {
  groupId: string
}

interface GroupScheduleRow {
  id: string
  group_id: string
  title: string
  description: string | null
  location: string | null
  start_at: string
  end_at: string | null
  created_by: string
  created_at: string
}

export function ScheduleTab({ groupId }: ScheduleTabProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)

  const [schedules, setSchedules] = useState<GroupScheduleRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [scheduleTitle, setScheduleTitle] = useState('')
  const [startAt, setStartAt] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('group_schedules')
        .select('*')
        .eq('group_id', groupId)
        .order('start_at', { ascending: true })
      if (error) throw error
      setSchedules((data ?? []) as GroupScheduleRow[])
    } catch (e) {
      console.error('[ScheduleTab]', e)
    } finally {
      setIsLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    void fetchSchedules()
    const channel = supabase
      .channel(`schedule-tab-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_schedules', filter: `group_id=eq.${groupId}` }, () => void fetchSchedules())
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [groupId, fetchSchedules])

  const handleSave = async () => {
    if (!user || !scheduleTitle.trim()) {
      Alert.alert('필수 항목', '일정 제목을 입력해주세요.')
      return
    }
    if (!startAt.trim()) {
      Alert.alert('필수 항목', '시작 일시를 입력해주세요.\n예) 2026-03-25 14:00')
      return
    }
    setIsSaving(true)
    try {
      const { error } = await supabase.from('group_schedules').insert({
        group_id: groupId,
        title: scheduleTitle.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        start_at: startAt.trim(),
        end_at: null,
        created_by: user.id,
      } as never)
      if (error) throw error
      setScheduleTitle('')
      setStartAt('')
      setLocation('')
      setDescription('')
      setModalVisible(false)
    } catch (e) {
      console.error('[ScheduleTab save]', e)
      Alert.alert('오류', '일정 저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = (item: GroupScheduleRow) => {
    if (!user || item.created_by !== user.id) {
      Alert.alert('권한 없음', '본인이 만든 일정만 삭제할 수 있습니다.')
      return
    }
    Alert.alert('일정 삭제', `"${item.title}" 일정을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('group_schedules').delete().eq('id', item.id)
            if (error) throw error
          } catch (e) {
            console.error('[ScheduleTab delete]', e)
            Alert.alert('오류', '삭제에 실패했습니다.')
          }
        },
      },
    ])
  }

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return iso
      return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    } catch {
      return iso
    }
  }

  const isPast = (iso: string) => {
    try { return new Date(iso) < new Date() } catch { return false }
  }

  const renderItem = ({ item }: ListRenderItemInfo<GroupScheduleRow>) => {
    const past = isPast(item.start_at)
    return (
      <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: past ? 0.6 : 1 }]}>
        <View style={[styles.dateBadge, { backgroundColor: past ? colors.divider : colors.primaryLight }]}>
          <Ionicons name="calendar-outline" size={18} color={past ? colors.textTertiary : colors.primary} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.itemDate, { color: past ? colors.textTertiary : colors.primary }]}>
            {formatDate(item.start_at)}
          </Text>
          {item.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
              <Text style={[styles.locationText, { color: colors.textTertiary }]} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          ) : null}
          {item.description ? (
            <Text style={[styles.itemDesc, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
        {user && item.created_by === user.id ? (
          <Pressable onPress={() => handleDelete(item)} hitSlop={8} accessibilityLabel="일정 삭제">
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </Pressable>
        ) : null}
      </View>
    )
  }

  if (isLoading) return <Loading />

  return (
    <View style={styles.container}>
      <FlatList
        data={schedules}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="calendar-outline" size={40} color={colors.textTertiary} />}
            title="등록된 일정이 없습니다"
            description="그룹 일정을 추가해보세요"
          />
        }
      />

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 16 }]}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="일정 추가"
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>일정 추가</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.inputBorder }]}
                placeholder="일정 제목 *"
                placeholderTextColor={colors.inputPlaceholder}
                value={scheduleTitle}
                onChangeText={setScheduleTitle}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.inputBorder }]}
                placeholder="시작 일시 * (예: 2026-03-25 14:00)"
                placeholderTextColor={colors.inputPlaceholder}
                value={startAt}
                onChangeText={setStartAt}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.inputBorder }]}
                placeholder="장소 (선택)"
                placeholderTextColor={colors.inputPlaceholder}
                value={location}
                onChangeText={setLocation}
              />
              <TextInput
                style={[styles.inputDesc, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.inputBorder }]}
                placeholder="설명 (선택)"
                placeholderTextColor={colors.inputPlaceholder}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Pressable
                style={[styles.saveButton, { backgroundColor: isSaving ? colors.textTertiary : colors.primary }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
                  {isSaving ? '저장 중...' : '일정 추가'}
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
  item: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: theme.spacing.borderRadius, borderWidth: 1, padding: theme.spacing.md, gap: theme.spacing.sm },
  dateBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemInfo: { flex: 1, gap: 2 },
  itemTitle: { ...theme.typography.styles.h4 },
  itemDate: { ...theme.typography.styles.bodySmall, fontWeight: theme.typography.fontWeight.medium },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { ...theme.typography.styles.caption, flex: 1 },
  itemDesc: { ...theme.typography.styles.bodySmall },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.screenPaddingH, paddingVertical: theme.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { ...theme.typography.styles.h4 },
  modalBody: { padding: theme.spacing.screenPaddingH, gap: theme.spacing.sm },
  input: { height: theme.spacing.inputHeight, borderRadius: theme.spacing.borderRadiusSm, borderWidth: 1, paddingHorizontal: theme.spacing.md, ...theme.typography.styles.body },
  inputDesc: { borderRadius: theme.spacing.borderRadiusSm, borderWidth: 1, padding: theme.spacing.md, height: 80, ...theme.typography.styles.body },
  saveButton: { height: theme.spacing.buttonHeight, borderRadius: theme.spacing.borderRadius, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.xs },
  saveButtonText: { ...theme.typography.styles.button },
})
