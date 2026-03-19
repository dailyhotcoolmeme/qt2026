import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { Avatar, Loading, Button } from 'src/components/common'
import { theme } from 'src/theme'
import { useGroup } from 'src/hooks/group/useGroup'
import type { RootStackParamList, GroupDetailTab } from 'src/navigation/types'
import { FaithTab } from './FaithTab'
import { PrayerTab } from './PrayerTab'
import { SocialTab } from './SocialTab'
import { MembersTab } from './MembersTab'
import { AdminTab } from './AdminTab'
import { ScheduleTab } from './ScheduleTab'

type Props = NativeStackScreenProps<RootStackParamList, 'GroupDetail'>
type Nav = NativeStackNavigationProp<RootStackParamList>

const TABS: { key: GroupDetailTab; label: string }[] = [
  { key: 'faith', label: '신앙' },
  { key: 'prayer', label: '기도' },
  { key: 'social', label: '교제' },
  { key: 'members', label: '멤버' },
  { key: 'admin', label: '관리' },
  { key: 'schedule', label: '일정' },
]

export default function GroupDetailScreen() {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<Nav>()
  const route = useRoute<Props['route']>()

  const { groupId, initialTab } = route.params
  const [activeTab, setActiveTab] = useState<GroupDetailTab>(initialTab ?? 'faith')

  const {
    group, members, myRole, isPendingInvite, isLoading,
    updateGroup, removeMember, updateMemberRole, leaveGroup, joinGroup, acceptInvite, rejectInvite,
    addScopeLeader, removeScopeLeader,
  } = useGroup(groupId)

  const handleLeave = useCallback(async () => {
    await leaveGroup()
    navigation.goBack()
  }, [leaveGroup, navigation])

  const handleJoin = useCallback(async () => {
    if (group?.website_url) {
      await Linking.openURL(group.website_url)
    } else {
      Alert.alert('안내', '모임 신청 링크가 없습니다. 모임장에게 문의하세요.')
    }
  }, [group])

  const handleAccept = useCallback(async () => {
    try { await acceptInvite() } catch { Alert.alert('오류', '수락에 실패했습니다.') }
  }, [acceptInvite])

  const handleReject = useCallback(async () => {
    try { await rejectInvite(); navigation.goBack() } catch { Alert.alert('오류', '거절에 실패했습니다.') }
  }, [rejectInvite, navigation])

  const visibleTabs = TABS.filter((t) => {
    if (t.key === 'admin') return myRole === 'owner' || myRole === 'leader'
    return true
  })

  const renderTab = () => {
    switch (activeTab) {
      case 'faith': return <FaithTab groupId={groupId} />
      case 'prayer': return <PrayerTab groupId={groupId} />
      case 'social': return <SocialTab groupId={groupId} />
      case 'members': return <MembersTab members={members} />
      case 'schedule': return <ScheduleTab groupId={groupId} />
      case 'admin':
        if (myRole === 'owner' || myRole === 'leader') {
          return (
            <AdminTab
              group={group!}
              members={members}
              onUpdateGroup={updateGroup}
              onUpdateMemberRole={updateMemberRole}
              onRemoveMember={removeMember}
              onLeaveGroup={handleLeave}
              myRole={myRole}
              onAddScopeLeader={addScopeLeader}
              onRemoveScopeLeader={removeScopeLeader}
            />
          )
        }
        return null
      default: return null
    }
  }

  if (isLoading || !group) {
    return <Loading fullScreen />
  }

  const headerSection = (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="뒤로 가기"
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
      </Pressable>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
        {group.name}
      </Text>
      <View style={styles.backButton} />
    </View>
  )

  const groupInfoSection = (
    <View style={[styles.groupInfo, { backgroundColor: colors.surface }]}>
      <Avatar uri={group.image_url} name={group.name} size={60} />
      <View style={styles.groupText}>
        <Text style={[styles.groupName, { color: colors.textPrimary }]}>{group.name}</Text>
        {group.description ? (
          <Text style={[styles.groupDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {group.description}
          </Text>
        ) : null}
        <View style={styles.memberRow}>
          <Ionicons name="person-outline" size={13} color={colors.textTertiary} />
          <Text style={[styles.memberCount, { color: colors.textTertiary }]}>
            {group.member_count}명
          </Text>
        </View>
      </View>
    </View>
  )

  // 미가입 사용자 — 참여 화면 (딥링크 myamen://invite/:groupId 진입 포함)
  if (myRole === null && !isPendingInvite) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {headerSection}
        {groupInfoSection}
        <View style={styles.joinSection}>
          <Ionicons name="people-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.joinTitle, { color: colors.textPrimary }]}>
            {group.name}
          </Text>
          <Text style={[styles.joinDesc, { color: colors.textSecondary }]}>
            모임 신청은 외부 링크를 통해 진행됩니다.
          </Text>
          <Button
            title="신청하러 가기"
            onPress={handleJoin}
            fullWidth
            style={styles.joinButton}
          />
        </View>
      </View>
    )
  }

  // 승인 대기 중 (초대 수신 또는 가입 신청 후)
  if (isPendingInvite) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {headerSection}
        {groupInfoSection}
        <View style={styles.joinSection}>
          <Ionicons name="hourglass-outline" size={56} color={colors.primary} />
          <Text style={[styles.joinTitle, { color: colors.textPrimary }]}>초대 또는 승인 대기 중</Text>
          <Text style={[styles.joinDesc, { color: colors.textSecondary }]}>
            그룹장의 승인을 기다리고 있습니다.
          </Text>
          <View style={styles.pendingButtons}>
            <Button title="수락하기" onPress={handleAccept} style={styles.pendingBtn} />
            <Button title="거절하기" variant="outline" onPress={handleReject} style={styles.pendingBtn} />
          </View>
        </View>
      </View>
    )
  }

  // 정식 멤버 — 탭 네비게이션
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {headerSection}
      {groupInfoSection}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {visibleTabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[
              styles.tab,
              activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  color: activeTab === tab.key ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === tab.key
                    ? theme.typography.fontWeight.semiBold
                    : theme.typography.fontWeight.regular,
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.tabContent, { paddingBottom: insets.bottom }]}>
        {renderTab()}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.screenPaddingH,
    height: theme.spacing.headerHeight,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { width: 40 },
  headerTitle: { ...theme.typography.styles.h4, flex: 1, textAlign: 'center' },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  groupText: { flex: 1, gap: 3 },
  groupName: { ...theme.typography.styles.h3 },
  groupDesc: { ...theme.typography.styles.bodySmall },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberCount: { ...theme.typography.styles.caption },
  joinSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.screenPaddingH,
    gap: theme.spacing.md,
  },
  joinTitle: { ...theme.typography.styles.h3, textAlign: 'center' },
  joinDesc: { ...theme.typography.styles.body, textAlign: 'center' },
  joinButton: { marginTop: theme.spacing.sm },
  pendingButtons: { flexDirection: 'row', gap: theme.spacing.sm, width: '100%' },
  pendingBtn: { flex: 1 },
  tabBar: { borderBottomWidth: StyleSheet.hairlineWidth, flexGrow: 0 },
  tabBarContent: { paddingHorizontal: theme.spacing.screenPaddingH },
  tab: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { ...theme.typography.styles.body },
  tabContent: { flex: 1 },
})
