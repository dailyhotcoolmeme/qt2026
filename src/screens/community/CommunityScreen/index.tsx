import React, { useState, useCallback } from 'react'
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  Linking,
  ListRenderItemInfo,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Loading, EmptyState, ScreenHeader } from 'src/components/common'
import { theme } from 'src/theme'
import { useCommunity } from 'src/hooks/community/useCommunity'
import type { GroupRow } from 'src/lib/types'
import type { RootStackParamList } from 'src/navigation/types'
import { GroupListItem } from './GroupListItem'
import { CreateGroupModal } from './CreateGroupModal'
import { PasswordJoinModal } from './PasswordJoinModal'
import { CommunityListHeader } from './CommunityListHeader'

type Nav = NativeStackNavigationProp<RootStackParamList>

export default function CommunityScreen() {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<Nav>()

  const {
    myGroups,
    filteredGroups,
    searchQuery,
    setSearchQuery,
    joinGroup,
    isJoining,
    createGroup,
    isCreating,
    isLoading,
  } = useCommunity()

  const [groupModalVisible, setGroupModalVisible] = useState(false)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null)
  const [password, setPassword] = useState('')

  const handleGroupPress = useCallback(
    (group: GroupRow) => {
      const isMember = myGroups.some((g) => g.id === group.id)
      if (isMember) {
        navigation.navigate('GroupDetail', { groupId: group.id })
        return
      }
      if (group.website_url) {
        void Linking.openURL(group.website_url)
      } else {
        Alert.alert('안내', '모임 신청 링크가 없습니다. 모임장에게 문의하세요.')
      }
    },
    [myGroups, navigation],
  )

  const handleJoinWithPassword = useCallback(async () => {
    if (!selectedGroup) return
    try {
      await joinGroup(selectedGroup.id, password)
      setPasswordModalVisible(false)
      setPassword('')
      setSelectedGroup(null)
    } catch (e) {
      Alert.alert('참여 실패', e instanceof Error ? e.message : '비밀번호를 확인해주세요.')
    }
  }, [selectedGroup, password, joinGroup])

  const renderGroup = useCallback(
    ({ item }: ListRenderItemInfo<GroupRow>) => (
      <GroupListItem
        group={item}
        isMyGroup={myGroups.some((g) => g.id === item.id)}
        isJoining={isJoining}
        onPress={() => handleGroupPress(item)}
        onJoin={() => handleGroupPress(item)}
      />
    ),
    [myGroups, isJoining, handleGroupPress],
  )

  if (isLoading && filteredGroups.length === 0 && myGroups.length === 0) {
    return <Loading fullScreen />
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="중보모임" paddingTop={insets.top + 8} />

      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => item.id}
        renderItem={renderGroup}
        ListHeaderComponent={
          <CommunityListHeader
            searchQuery={searchQuery}
            onChangeSearch={setSearchQuery}
            myGroups={myGroups}
            onMyGroupPress={(id) => navigation.navigate('GroupDetail', { groupId: id })}
            onNewGroup={() => setGroupModalVisible(true)}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="people-outline" size={48} color={colors.textTertiary} />}
            title="모임이 없습니다"
            description="새 모임을 만들거나 다른 검색어로 찾아보세요"
          />
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        onPress={() => setGroupModalVisible(true)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, bottom: insets.bottom + 24 },
          pressed && styles.fabPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="모임 만들기"
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </Pressable>

      <PasswordJoinModal
        visible={passwordModalVisible}
        groupName={selectedGroup?.name ?? null}
        password={password}
        isJoining={isJoining}
        onChangePassword={setPassword}
        onConfirm={() => void handleJoinWithPassword()}
        onClose={() => {
          setPasswordModalVisible(false)
          setPassword('')
          setSelectedGroup(null)
        }}
      />

      <CreateGroupModal
        visible={groupModalVisible}
        isCreating={isCreating}
        onClose={() => setGroupModalVisible(false)}
        onCreate={async (data) => {
          await createGroup(data)
          setGroupModalVisible(false)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { flexGrow: 1 },
  fab: {
    position: 'absolute',
    right: theme.spacing.screenPaddingH,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabPressed: { opacity: 0.85 },
})
