import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  TextInput,
  FlatList,
  ListRenderItemInfo,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from 'src/lib/supabase'
import { Avatar, Button } from 'src/components/common'
import { theme } from 'src/theme'

interface ProfileResult {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

interface ScopeLeaderRow {
  user_id: string
  profile: ProfileResult
}

interface ScopeLeaderSectionProps {
  groupId: string
  onAddScopeLeader: (userId: string) => Promise<void>
  onRemoveScopeLeader: (userId: string) => Promise<void>
}

export function ScopeLeaderSection({
  groupId,
  onAddScopeLeader,
  onRemoveScopeLeader,
}: ScopeLeaderSectionProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileResult[]>([])
  const [selectedUser, setSelectedUser] = useState<ProfileResult | null>(null)
  const [scopeLeaders, setScopeLeaders] = useState<ScopeLeaderRow[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const loadScopeLeaders = useCallback(async () => {
    const { data } = await supabase
      .from('group_scope_leaders')
      .select('user_id, profile:profiles(id, full_name, username, avatar_url)')
      .eq('group_id', groupId)
    if (data) {
      setScopeLeaders(
        (data as unknown as Array<{ user_id: string; profile: ProfileResult }>).filter(
          (r) => r.profile,
        ),
      )
    }
  }, [groupId])

  useEffect(() => { void loadScopeLeaders() }, [loadScopeLeaders])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .limit(10)
      setSearchResults((data ?? []) as ProfileResult[])
    } finally {
      setIsSearching(false)
    }
  }

  const handleAdd = async () => {
    if (!selectedUser) return
    setIsAdding(true)
    try {
      await onAddScopeLeader(selectedUser.id)
      setSelectedUser(null)
      setSearchQuery('')
      setSearchResults([])
      await loadScopeLeaders()
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '등록에 실패했습니다.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemove = (userId: string, name: string | null) => {
    Alert.alert('상위리더 해제', `${name ?? '이 멤버'}의 상위리더를 해제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '해제',
        style: 'destructive',
        onPress: async () => {
          try {
            await onRemoveScopeLeader(userId)
            await loadScopeLeaders()
          } catch (e) {
            Alert.alert('오류', e instanceof Error ? e.message : '해제에 실패했습니다.')
          }
        },
      },
    ])
  }

  const renderSearchResult = ({ item }: ListRenderItemInfo<ProfileResult>) => (
    <Pressable
      onPress={() => { setSelectedUser(item); setSearchResults([]) }}
      style={({ pressed }) => [
        styles.resultItem,
        { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Avatar uri={item.avatar_url} name={item.full_name} size={36} />
      <View style={styles.resultInfo}>
        <Text style={[styles.resultName, { color: colors.textPrimary }]}>
          {item.full_name ?? '알 수 없음'}
        </Text>
        {item.username ? (
          <Text style={[styles.resultSub, { color: colors.textSecondary }]}>@{item.username}</Text>
        ) : null}
      </View>
    </Pressable>
  )

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>상위리더 등록</Text>
      <View style={styles.searchRow}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="이름 또는 아이디 검색"
          placeholderTextColor={colors.inputPlaceholder}
          style={[styles.searchInput, {
            backgroundColor: colors.inputBackground,
            color: colors.inputText,
            borderColor: colors.inputBorder,
          }]}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <Pressable
          onPress={handleSearch}
          style={({ pressed }) => [styles.searchBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="검색"
        >
          {isSearching
            ? <Text style={styles.searchBtnText}>...</Text>
            : <Ionicons name="search-outline" size={18} color="#fff" />
          }
        </Pressable>
      </View>

      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(p) => p.id}
          renderItem={renderSearchResult}
          scrollEnabled={false}
          style={[styles.resultList, { borderColor: colors.border }]}
        />
      )}

      {selectedUser && (
        <View style={[styles.selectedBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Avatar uri={selectedUser.avatar_url} name={selectedUser.full_name} size={36} />
          <Text style={[styles.selectedName, { color: colors.primary }]}>
            {selectedUser.full_name ?? '알 수 없음'}
          </Text>
          <Pressable onPress={() => setSelectedUser(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.primary} />
          </Pressable>
        </View>
      )}

      <Button
        title="등록하기"
        onPress={handleAdd}
        loading={isAdding}
        disabled={!selectedUser}
        style={styles.gap}
      />

      <Text style={[styles.sectionTitle, styles.sectionGap, { color: colors.textPrimary }]}>
        현재 상위리더
      </Text>
      {scopeLeaders.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>등록된 상위리더가 없습니다.</Text>
      ) : (
        scopeLeaders.map((sl) => (
          <View key={sl.user_id} style={[styles.leaderRow, { borderBottomColor: colors.divider }]}>
            <Avatar uri={sl.profile.avatar_url} name={sl.profile.full_name} size={40} />
            <Text style={[styles.leaderName, { color: colors.textPrimary }]}>
              {sl.profile.full_name ?? '알 수 없음'}
            </Text>
            <Button
              title="해제"
              variant="outline"
              size="sm"
              onPress={() => handleRemove(sl.user_id, sl.profile.full_name)}
            />
          </View>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  sectionTitle: { ...theme.typography.styles.h3, marginBottom: theme.spacing.md },
  sectionGap: { marginTop: theme.spacing.xl },
  gap: { marginTop: theme.spacing.md },
  searchRow: { flexDirection: 'row', gap: theme.spacing.sm },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: theme.spacing.borderRadius,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    ...theme.typography.styles.body,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.spacing.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '600' },
  resultList: {
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderRadius: theme.spacing.borderRadius,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  resultInfo: { flex: 1 },
  resultName: { ...theme.typography.styles.body },
  resultSub: { ...theme.typography.styles.caption },
  selectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius,
    borderWidth: 1,
    gap: theme.spacing.sm,
  },
  selectedName: { ...theme.typography.styles.body, flex: 1 },
  emptyText: { ...theme.typography.styles.bodySmall },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.sm,
  },
  leaderName: { ...theme.typography.styles.body, flex: 1 },
})
