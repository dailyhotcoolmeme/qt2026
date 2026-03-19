import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import * as MediaLibrary from 'expo-media-library'
import * as Sharing from 'expo-sharing'
import ViewShot from 'react-native-view-shot'
import { supabase } from 'src/lib/supabase'
import { useAppTheme } from 'src/hooks/useAppTheme'

const ACCENT = '#4A6741'

const COLOR_PRESETS = [
  { id: 'c1', bg: ['#fdf2f8', '#fee2e2'], textColor: '#3f3f46', subColor: '#52525b' },
  { id: 'c2', bg: ['#eff6ff', '#dbeafe'], textColor: '#1e3a8a', subColor: '#334155' },
  { id: 'c3', bg: ['#ecfdf5', '#d1fae5'], textColor: '#065f46', subColor: '#334155' },
  { id: 'c4', bg: ['#fff7ed', '#ffedd5'], textColor: '#7c2d12', subColor: '#334155' },
  { id: 'c5', bg: ['#faf5ff', '#f3e8ff'], textColor: '#5b21b6', subColor: '#4c1d95' },
  { id: 'c6', bg: ['#f0fdfa', '#ccfbf1'], textColor: '#115e59', subColor: '#134e4a' },
  { id: 'c7', bg: ['#fefce8', '#fef3c7'], textColor: '#854d0e', subColor: '#78350f' },
  { id: 'c8', bg: ['#f5f3ff', '#ede9fe'], textColor: '#3730a3', subColor: '#312e81' },
  { id: 'c9', bg: ['#fef2f2', '#ffe4e6'], textColor: '#9f1239', subColor: '#881337' },
  { id: 'c10', bg: ['#ecfeff', '#cffafe'], textColor: '#155e75', subColor: '#164e63' },
  { id: 'c11', bg: ['#eef2ff', '#e0e7ff'], textColor: '#1e1b4b', subColor: '#312e81' },
  { id: 'c12', bg: ['#f7fee7', '#d9f99d'], textColor: '#365314', subColor: '#3f6212' },
]

type TabType = 'image' | 'color' | 'community'

interface UserBg {
  url: string
  name: string
  thumbnail_url?: string | null
}

interface Props {
  visible: boolean
  onClose: () => void
  title: string
  content: string
  userId?: string | null
}

function normalizeContent(raw: string): string {
  return String(raw ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+\.?\s*/, '').trim())
    .join('\n')
}

export function VerseCardMakerModal({ visible, onClose, title, content, userId }: Props) {
  const { width: screenWidth } = useWindowDimensions()
  const { isDark } = useAppTheme()

  const [tab, setTab] = useState<TabType>('image')
  const [selectedColor, setSelectedColor] = useState('c3')
  const [selectedImgIdx, setSelectedImgIdx] = useState(0)
  const [communityBgs, setCommunityBgs] = useState<UserBg[]>([])
  const [selectedCommunityIdx, setSelectedCommunityIdx] = useState<number | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  // 텍스트 편집 상태
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')

  const viewShotRef = useRef<ViewShot>(null)

  const cleanContent = useMemo(() => normalizeContent(content), [content])

  // 모달 열릴 때 텍스트 초기화
  useEffect(() => {
    if (visible) {
      setEditContent(cleanContent)
      setEditTitle(title)
    }
  }, [visible, cleanContent, title])

  // 커뮤니티 배경 이미지 로드
  useEffect(() => {
    if (!visible) return
    const load = async () => {
      const { data } = await supabase
        .from('verse_card_backgrounds')
        .select('url, name, thumbnail_url')
        .order('created_at', { ascending: false })
        .limit(12)
      setCommunityBgs(data ?? [])
    }
    void load()
  }, [visible])

  // 현재 선택된 테마 계산
  const currentTheme = useMemo(() => {
    if (tab === 'color') {
      const preset = COLOR_PRESETS.find((p) => p.id === selectedColor) ?? COLOR_PRESETS[0]
      return { type: 'color' as const, colors: preset.bg, textColor: preset.textColor, subColor: preset.subColor }
    }
    if (tab === 'community' && selectedCommunityIdx !== null) {
      const bg = communityBgs[selectedCommunityIdx]
      return { type: 'image' as const, imageUrl: bg?.url ?? '', textColor: '#ffffff', subColor: '#f4f4f5' }
    }
    return { type: 'color' as const, colors: ['#ecfdf5', '#d1fae5'], textColor: '#065f46', subColor: '#334155' }
  }, [tab, selectedColor, selectedCommunityIdx, communityBgs])

  const previewWidth = Math.min(screenWidth * 0.55, 240)
  const previewHeight = previewWidth * 1.25

  const cardBg = currentTheme.type === 'color'
    ? currentTheme.colors[0]
    : '#ffffff'

  const captureAndShare = useCallback(async (saveMode: 'save' | 'share') => {
    try {
      setIsCapturing(true)

      if (saveMode === 'save') {
        const { status } = await MediaLibrary.requestPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('권한 필요', '갤러리 저장을 위해 사진 접근 권한이 필요합니다.')
          return
        }
      }

      const uri = await viewShotRef.current?.capture?.()
      if (!uri) { Alert.alert('오류', '이미지 생성에 실패했습니다.'); return }

      if (saveMode === 'save') {
        await MediaLibrary.saveToLibraryAsync(uri)
        Alert.alert('저장 완료', '말씀 카드를 갤러리에 저장했습니다.')
      } else {
        const canShare = await Sharing.isAvailableAsync()
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '말씀 카드 공유' })
        } else {
          Alert.alert('공유 불가', '이 기기에서는 공유 기능을 사용할 수 없습니다.')
        }
      }
    } catch {
      Alert.alert('오류', '이미지 처리 중 오류가 발생했습니다.')
    } finally {
      setIsCapturing(false)
    }
  }, [])

  const bg = isDark ? '#1C1C1E' : '#FFFFFF'
  const sectionBg = isDark ? '#2A2A2A' : '#F4F4F5'
  const inputBg = isDark ? '#3A3A3A' : '#F9F9F9'
  const inputBorder = isDark ? '#4A4A4A' : '#E4E4E7'
  const inputText = isDark ? '#F5F5F5' : '#18181B'
  const labelColor = isDark ? '#A1A1AA' : '#71717A'

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: bg }]}>
          {/* 핸들 */}
          <View style={styles.handle} />

          {/* 닫기 버튼 */}
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={18} color={isDark ? '#A1A1AA' : '#71717A'} />
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 미리보기 카드 (캡처 대상) */}
            <View style={styles.previewWrapper}>
              <ViewShot
                ref={viewShotRef}
                options={{ format: 'png', quality: 1 }}
                style={{ width: previewWidth, height: previewHeight }}
              >
                <View
                  style={[
                    styles.previewCard,
                    {
                      width: previewWidth,
                      height: previewHeight,
                      backgroundColor: cardBg,
                    },
                  ]}
                >
                  {currentTheme.type === 'image' && currentTheme.imageUrl ? (
                    <Image
                      source={{ uri: currentTheme.imageUrl }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                  ) : null}

                  <View style={styles.previewContent}>
                    <Text
                      style={[
                        styles.previewText,
                        {
                          color: currentTheme.textColor,
                          textShadowColor: currentTheme.type === 'image' ? 'rgba(0,0,0,0.45)' : 'transparent',
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: currentTheme.type === 'image' ? 6 : 0,
                        },
                      ]}
                    >
                      {editContent}
                    </Text>
                    <Text
                      style={[
                        styles.previewRef,
                        {
                          color: currentTheme.subColor,
                          textShadowColor: currentTheme.type === 'image' ? 'rgba(0,0,0,0.45)' : 'transparent',
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: currentTheme.type === 'image' ? 6 : 0,
                        },
                      ]}
                    >
                      {editTitle}
                    </Text>
                  </View>
                </View>
              </ViewShot>
            </View>

            {/* 텍스트 편집 영역 */}
            <View style={styles.editSection}>
              <Text style={[styles.editLabel, { color: labelColor }]}>말씀 내용</Text>
              <TextInput
                value={editContent}
                onChangeText={setEditContent}
                style={[
                  styles.editInput,
                  styles.editInputMulti,
                  { backgroundColor: inputBg, borderColor: inputBorder, color: inputText },
                ]}
                multiline
                placeholder="말씀 내용을 입력하세요"
                placeholderTextColor={isDark ? '#666' : '#B0B0B0'}
                textAlignVertical="top"
              />
              <Text style={[styles.editLabel, { color: labelColor, marginTop: 8 }]}>출처 (성경 구절)</Text>
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                style={[
                  styles.editInput,
                  { backgroundColor: inputBg, borderColor: inputBorder, color: inputText },
                ]}
                placeholder="예: 요한복음 3장 16절"
                placeholderTextColor={isDark ? '#666' : '#B0B0B0'}
              />
            </View>

            {/* 탭 */}
            <View style={[styles.tabRow, { backgroundColor: sectionBg }]}>
              {(['image', 'color', 'community'] as TabType[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={[styles.tabBtn, tab === t && { backgroundColor: '#3F3F46' }]}
                >
                  <Text style={[styles.tabText, { color: tab === t ? '#FFFFFF' : '#71717A' }]}>
                    {t === 'image' ? '이미지' : t === 'color' ? '배경색' : '커뮤니티'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* 색상 프리셋 */}
            {tab === 'color' && (
              <View style={styles.presetGrid}>
                {COLOR_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.id}
                    onPress={() => setSelectedColor(preset.id)}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: preset.bg[0] },
                      selectedColor === preset.id && styles.swatchSelected,
                    ]}
                  />
                ))}
              </View>
            )}

            {/* 커뮤니티 배경 */}
            {tab === 'community' && (
              <View style={styles.presetGrid}>
                {communityBgs.length === 0 ? (
                  <Text style={styles.emptyText}>등록된 이미지가 없습니다.</Text>
                ) : (
                  communityBgs.map((bg, idx) => (
                    <Pressable
                      key={bg.url}
                      onPress={() => setSelectedCommunityIdx(idx)}
                      style={[
                        styles.imgThumb,
                        selectedCommunityIdx === idx && styles.swatchSelected,
                      ]}
                    >
                      <Image
                        source={{ uri: bg.thumbnail_url ?? bg.url }}
                        style={styles.thumbImg}
                        contentFit="cover"
                      />
                    </Pressable>
                  ))
                )}
              </View>
            )}

            {/* 이미지 탭 안내 */}
            {tab === 'image' && (
              <View style={[styles.infoBox, { backgroundColor: sectionBg }]}>
                <Text style={{ color: isDark ? '#A1A1AA' : '#71717A', fontSize: 13, textAlign: 'center' }}>
                  커뮤니티 탭에서 배경 이미지를 선택하거나,{'\n'}배경색 탭에서 색상을 선택하세요.
                </Text>
              </View>
            )}

            {/* 액션 버튼 */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => void captureAndShare('save')}
                style={[styles.actionBtn, { backgroundColor: ACCENT }]}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>저장</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                onPress={() => void captureAndShare('share')}
                style={[styles.actionBtn, { backgroundColor: ACCENT }]}
                disabled={isCapturing}
              >
                <Ionicons name="share-outline" size={16} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>공유</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '92%',
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D4D4D8',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    backgroundColor: '#E4E4E7',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  previewWrapper: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  previewCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  previewContent: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'serif',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  previewRef: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'serif',
    textAlign: 'center',
  },
  editSection: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  editInputMulti: {
    minHeight: 80,
    lineHeight: 20,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  colorSwatch: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imgThumb: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  swatchSelected: {
    borderColor: '#3F3F46',
  },
  emptyText: {
    color: '#A1A1AA',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
    width: '100%',
  },
  infoBox: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
})
