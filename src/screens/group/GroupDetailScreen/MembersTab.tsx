import React from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  ListRenderItemInfo,
  Pressable,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Avatar, EmptyState } from 'src/components/common'
import { theme } from 'src/theme'
import { useGroup, type GroupMemberWithProfile } from 'src/hooks/group/useGroup'
import type { GroupRole } from 'src/lib/types'
import type { RootStackParamList } from 'src/navigation/types'
import { JoinRequestSection } from './JoinRequestSection'

interface MembersTabProps {
  members: GroupMemberWithProfile[]
}

const ROLE_LABEL: Record<GroupRole, string> = {
  owner: '모임리더',
  leader: '모임리더',
  scope_leader: '상위리더',
  member: '일반멤버',
  guest: '게스트',
}

const NEXT_ROLE: Partial<Record<GroupRole, GroupRole>> = {
  member: 'leader',
  leader: 'member',
}

export function MembersTab(_props: MembersTabProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()
  const route = useRoute<RouteProp<RootStackParamList, 'GroupDetail'>>()
  const groupId: string = route.params.groupId

  const { members, myRole, updateMemberRole, removeMember } = useGroup(groupId)

  const isAdmin = myRole === 'owner' || myRole === 'leader'

  const handleRoleToggle = (item: GroupMemberWithProfile) => {
    const next = NEXT_ROLE[item.role]
    if (!next) return
    const actionLabel = item.role === 'member' ? '리더로 승격' : '일반멤버 전환'
    Alert.alert(
      '역할 변경',
      `${item.profile.full_name ?? '멤버'}님을 ${ROLE_LABEL[next]}으로 변경할까요?\n(${actionLabel})`,
      [
        { text: '취소', style: 'cancel' },
        { text: '변경', onPress: () => void updateMemberRole(item.user_id, next) },
      ],
    )
  }

  const handleKick = (item: GroupMemberWithProfile) => {
    Alert.alert(
      '멤버 내보내기',
      `${item.profile.full_name ?? '멤버'}님을 모임에서 내보낼까요?`,
      [
        { text: '취소', style: 'cancel' },
        { text: '내보내기', style: 'destructive', onPress: () => void removeMember(item.user_id) },
      ],
    )
  }

  const renderItem = ({ item }: ListRenderItemInfo<GroupMemberWithProfile>) => {
    const canManage = isAdmin && item.role !== 'owner'
    const canPromoteDemote = isAdmin && item.role !== 'owner' && NEXT_ROLE[item.role] !== undefined
    return (
      <View style={[styles.item, { borderBottomColor: colors.divider }]}>
        <Avatar uri={item.profile.avatar_url} name={item.profile.full_name} size={44} />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>
            {item.profile.full_name ?? item.profile.username ?? '알 수 없음'}
          </Text>
          {item.profile.bio ? (
            <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.profile.bio}
            </Text>
          ) : null}
        </View>
        <View style={[styles.roleBadge, {
          backgroundColor:
            item.role === 'owner' || item.role === 'leader'
              ? colors.primaryLight
              : item.role === 'scope_leader'
                ? '#F3E8FF'
                : colors.divider,
        }]}>
          <Text style={[styles.roleText, {
            color:
              item.role === 'owner' || item.role === 'leader'
                ? colors.primary
                : item.role === 'scope_leader'
                  ? '#7C3AED'
                  : colors.textSecondary,
          }]}>
            {ROLE_LABEL[item.role]}
          </Text>
        </View>
        {canPromoteDemote ? (
          <Pressable
            onPress={() => handleRoleToggle(item)}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={item.role === 'member' ? '리더로 승격' : '일반멤버 전환'}
            hitSlop={8}
          >
            <Ionicons name="swap-vertical-outline" size={18} color={colors.primary} />
          </Pressable>
        ) : null}
        {canManage ? (
          <Pressable
            onPress={() => handleKick(item)}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="멤버 내보내기"
            hitSlop={8}
          >
            <Ionicons name="person-remove-outline" size={18} color={colors.error} />
          </Pressable>
        ) : null}
      </View>
    )
  }

  const listHeader = (
    <>
      {isAdmin && <JoinRequestSection groupId={groupId} />}
      <Text style={[styles.sectionLabel, styles.memberLabel, { color: colors.textSecondary }]}>
        멤버 {members.length}명
      </Text>
    </>
  )

  return (
    <FlatList
      data={members}
      keyExtractor={(m) => m.id}
      renderItem={renderItem}
      ListHeaderComponent={listHeader}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom }]}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <EmptyState
          icon={<Ionicons name="people-outline" size={40} color={colors.textTertiary} />}
          title="멤버가 없습니다"
        />
      }
    />
  )
}

const styles = StyleSheet.create({
  list: { flexGrow: 1 },
  sectionLabel: {
    ...theme.typography.styles.caption,
    fontWeight: theme.typography.fontWeight.semiBold,
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingVertical: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberLabel: { marginTop: theme.spacing.xs },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.sm,
  },
  info: { flex: 1, gap: 2 },
  name: { ...theme.typography.styles.h4 },
  bio: { ...theme.typography.styles.bodySmall },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.spacing.borderRadiusSm,
  },
  roleText: {
    ...theme.typography.styles.caption,
    fontWeight: theme.typography.fontWeight.medium,
  },
  iconBtn: { padding: 4 },
})
