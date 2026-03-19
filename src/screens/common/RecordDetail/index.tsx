import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PostgrestError } from '@supabase/supabase-js'

import { supabase } from 'src/lib/supabase'
import { theme } from 'src/theme'
import type { RootStackParamList } from 'src/navigation/types'
import type { QTRecordRow, PrayerRow, ReadingRecordRow } from 'src/lib/types'

type Props = NativeStackScreenProps<RootStackParamList, 'RecordDetail'>
type RecordData = QTRecordRow | PrayerRow | ReadingRecordRow

function isQT(data: RecordData, type: string): data is QTRecordRow {
  return type === 'qt'
}
function isPrayer(data: RecordData, type: string): data is PrayerRow {
  return type === 'prayer'
}
function isReading(data: RecordData, type: string): data is ReadingRecordRow {
  return type === 'reading'
}

const RECORD_TYPE_LABEL: Record<string, string> = {
  qt: 'QT 기록',
  prayer: '기도 제목',
  reading: '성경 읽기',
}

export default function RecordDetailScreen({ navigation, route }: Props) {
  const { recordId, recordType } = route.params
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const sp = theme.spacing

  const [record, setRecord] = useState<RecordData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editContent, setEditContent] = useState('')

  const fetchRecord = useCallback(async () => {
    setIsLoading(true)
    try {
      if (recordType === 'qt') {
        const { data, error } = await supabase
          .from('qt_records')
          .select('*')
          .eq('id', recordId)
          .single()
        if (error) throw error
        const qtRow = data as unknown as QTRecordRow
        setRecord(qtRow)
        setEditContent(qtRow.content ?? '')
      } else if (recordType === 'prayer') {
        const { data, error } = await supabase
          .from('prayers')
          .select('*')
          .eq('id', recordId)
          .single()
        if (error) throw error
        const prayerRow = data as unknown as PrayerRow
        setRecord(prayerRow)
        setEditContent(prayerRow.content ?? '')
      } else {
        const { data, error } = await supabase
          .from('reading_records')
          .select('*')
          .eq('id', recordId)
          .single()
        if (error) throw error
        const readingRow = data as unknown as ReadingRecordRow
        setRecord(readingRow)
        setEditContent(readingRow.content ?? '')
      }
    } catch (e) {
      const err = e as PostgrestError
      Alert.alert('오류', err.message ?? '기록을 불러올 수 없습니다.')
      navigation.goBack()
    } finally {
      setIsLoading(false)
    }
  }, [recordId, recordType, navigation])

  useEffect(() => {
    void fetchRecord()
  }, [fetchRecord])

  const handleSave = async () => {
    if (!record) return
    setIsSaving(true)
    try {
      if (recordType === 'qt') {
        const { error } = await supabase
          .from('qt_records')
          .update({ content: editContent, updated_at: new Date().toISOString() } as never)
          .eq('id', recordId)
        if (error) throw error
        setRecord({ ...record, content: editContent } as QTRecordRow)
      } else if (recordType === 'prayer') {
        const { error } = await supabase
          .from('prayers')
          .update({ content: editContent, updated_at: new Date().toISOString() } as never)
          .eq('id', recordId)
        if (error) throw error
        setRecord({ ...record, content: editContent } as PrayerRow)
      } else {
        const { error } = await supabase
          .from('reading_records')
          .update({ content: editContent } as never)
          .eq('id', recordId)
        if (error) throw error
        setRecord({ ...record, content: editContent } as ReadingRecordRow)
      }
      setIsEditing(false)
    } catch (e) {
      const err = e as PostgrestError
      Alert.alert('저장 실패', err.message ?? '저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    Alert.alert(
      '삭제',
      `이 ${RECORD_TYPE_LABEL[recordType]}을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              if (recordType === 'qt') {
                const { error } = await supabase
                  .from('qt_records')
                  .delete()
                  .eq('id', recordId)
                if (error) throw error
              } else if (recordType === 'prayer') {
                const { error } = await supabase
                  .from('prayers')
                  .delete()
                  .eq('id', recordId)
                if (error) throw error
              } else {
                const { error } = await supabase
                  .from('reading_records')
                  .delete()
                  .eq('id', recordId)
                if (error) throw error
              }
              navigation.goBack()
            } catch (e) {
              const err = e as PostgrestError
              Alert.alert('삭제 실패', err.message ?? '삭제 중 오류가 발생했습니다.')
            }
          },
        },
      ],
    )
  }

  const renderMeta = () => {
    if (!record) return null

    if (isQT(record, recordType)) {
      return (
        <View style={styles.metaRow}>
          <Ionicons name="book-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            {record.reference ?? `${record.book} ${record.chapter}장`}
          </Text>
          <Text style={[styles.metaDot, { color: colors.textTertiary }]}>·</Text>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            {record.date}
          </Text>
        </View>
      )
    }

    if (isPrayer(record, recordType)) {
      return (
        <View style={styles.metaRow}>
          <Ionicons
            name={record.is_answered ? 'checkmark-circle' : 'time-outline'}
            size={14}
            color={record.is_answered ? colors.success : colors.textTertiary}
          />
          <Text
            style={[
              styles.metaText,
              { color: record.is_answered ? colors.success : colors.textTertiary },
            ]}
          >
            {record.is_answered ? '응답됨' : '기도 중'}
          </Text>
          <Text style={[styles.metaDot, { color: colors.textTertiary }]}>·</Text>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            {new Date(record.created_at).toLocaleDateString('ko-KR')}
          </Text>
        </View>
      )
    }

    if (isReading(record, recordType)) {
      return (
        <View style={styles.metaRow}>
          <Ionicons name="book-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            {`${record.book} ${record.chapter}장`}
          </Text>
          <Text style={[styles.metaDot, { color: colors.textTertiary }]}>·</Text>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            {record.date}
          </Text>
        </View>
      )
    }

    return null
  }

  const renderTitle = () => {
    if (!record) return null

    if (isPrayer(record, recordType)) {
      return (
        <Text style={[styles.recordTitle, { color: colors.textPrimary }]}>
          {record.title}
        </Text>
      )
    }

    if (isQT(record, recordType)) {
      return (
        <Text style={[styles.recordTitle, { color: colors.textPrimary }]}>
          {record.reference ?? `${record.book} ${record.chapter}장`}
        </Text>
      )
    }

    if (isReading(record, recordType)) {
      return (
        <Text style={[styles.recordTitle, { color: colors.textPrimary }]}>
          {`${record.book} ${record.chapter}장`}
        </Text>
      )
    }

    return null
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 헤더 */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            backgroundColor: colors.header,
            borderBottomColor: colors.headerBorder,
          },
        ]}
      >
        <Pressable
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {RECORD_TYPE_LABEL[recordType]}
        </Text>

        <View style={styles.headerActions}>
          {!isEditing && (
            <>
              <Pressable
                style={styles.headerBtn}
                onPress={() => setIsEditing(true)}
                hitSlop={8}
              >
                <Ionicons name="pencil-outline" size={20} color={colors.primary} />
              </Pressable>
              <Pressable
                style={styles.headerBtn}
                onPress={handleDelete}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </Pressable>
            </>
          )}
          {isEditing && (
            <>
              <Pressable
                style={styles.headerBtn}
                onPress={() => {
                  setIsEditing(false)
                  setEditContent(record?.content ?? '')
                }}
                hitSlop={8}
              >
                <Text style={[styles.headerActionText, { color: colors.textSecondary }]}>
                  취소
                </Text>
              </Pressable>
              <Pressable
                style={styles.headerBtn}
                onPress={() => void handleSave()}
                hitSlop={8}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.headerActionText, { color: colors.primary }]}>
                    저장
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + sp.xl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 타입 배지 */}
          <View
            style={[styles.typeBadge, { backgroundColor: colors.primaryLight }]}
          >
            <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
              {RECORD_TYPE_LABEL[recordType]}
            </Text>
          </View>

          {/* 제목 */}
          {renderTitle()}

          {/* 메타 정보 */}
          {renderMeta()}

          {/* 구분선 */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* 본문 */}
          {isEditing ? (
            <TextInput
              style={[
                styles.editInput,
                {
                  color: colors.inputText,
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                },
              ]}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              autoFocus
              placeholder="내용을 입력하세요"
              placeholderTextColor={colors.inputPlaceholder}
              textAlignVertical="top"
            />
          ) : (
            <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
              {record?.content ?? '내용이 없습니다.'}
            </Text>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    padding: theme.spacing.xs,
    minWidth: 36,
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    ...theme.typography.styles.h4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  headerActionText: {
    ...theme.typography.styles.label,
    fontWeight: theme.typography.fontWeight.semiBold,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: theme.spacing.screenPaddingH,
    gap: theme.spacing.md,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.spacing.borderRadiusFull,
  },
  typeBadgeText: {
    ...theme.typography.styles.caption,
    fontWeight: theme.typography.fontWeight.semiBold,
  },
  recordTitle: {
    ...theme.typography.styles.h3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metaText: {
    ...theme.typography.styles.caption,
  },
  metaDot: {
    ...theme.typography.styles.caption,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  bodyText: {
    ...theme.typography.styles.bodyLarge,
    lineHeight: 28,
  },
  editInput: {
    minHeight: 200,
    borderRadius: theme.spacing.borderRadius,
    borderWidth: 1,
    padding: theme.spacing.md,
    ...theme.typography.styles.bodyLarge,
    lineHeight: 28,
  },
})
