import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ListRenderItemInfo,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Loading, EmptyState, Card, Avatar } from 'src/components/common'
import { theme } from 'src/theme'
import { useMyGroups } from 'src/hooks/group/useGroup'
import type { GroupRow } from 'src/lib/types'
import type { RootStackParamList } from 'src/navigation/types'
import { CreateGroupModal } from './CreateGroupModal'

type Nav = NativeStackNavigationProp<RootStackParamList>

export default function GroupScreen() {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<Nav>()

  const { myGroups, isLoading, createGroup } = useMyGroups()
  const [modalVisible, setModalVisible] = useState(false)

  const handlePress = useCallback(
    (groupId: string) => {
      navigation.navigate('GroupDetail', { groupId })
    },
    [navigation],
  )

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<GroupRow>) => (
      <View style={styles.cardWrapper}>
        <Card onPress={() => handlePress(item.id)}>
          <View style={styles.cardContent}>
            <Avatar uri={item.image_url} name={item.name} size={48} />
            <View style={styles.cardInfo}>
              <Text style={[styles.groupName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.description ? (
                <Text style={[styles.groupDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.memberRow}>
                <Ionicons name="person-outline" size={12} color={colors.textTertiary} />
                <Text style={[styles.memberText, { color: colors.textTertiary }]}>
                  {item.member_count}명
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>
        </Card>
      </View>
    ),
    [colors, handlePress],
  )

  if (isLoading) {
    return <Loading fullScreen />
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>내 그룹</Text>
        <Pressable
          onPress={() => setModalVisible(true)}
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="그룹 만들기"
        >
          <Ionicons name="add" size={20} color={colors.textInverse} />
          <Text style={[styles.createButtonText, { color: colors.textInverse }]}>만들기</Text>
        </Pressable>
      </View>

      <FlatList
        data={myGroups}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="people-outline" size={48} color={colors.textTertiary} />}
            title="아직 참여한 그룹이 없습니다"
            description="그룹을 만들거나 초대 링크로 참여해보세요"
            action={{ label: '그룹 만들기', onPress: () => setModalVisible(true) }}
          />
        }
      />

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 20 }]}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="그룹 만들기"
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </Pressable>

      <CreateGroupModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreate={createGroup}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: { ...theme.typography.styles.h2 },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.spacing.borderRadius,
  },
  createButtonText: { ...theme.typography.styles.label },
  listContent: { flexGrow: 1 },
  cardWrapper: {
    marginHorizontal: theme.spacing.screenPaddingH,
    marginBottom: theme.spacing.sm,
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  cardInfo: { flex: 1, gap: 2 },
  groupName: { ...theme.typography.styles.h4 },
  groupDesc: { ...theme.typography.styles.bodySmall },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  memberText: { ...theme.typography.styles.caption },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
})
