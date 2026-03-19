import { useState, useEffect, useCallback } from 'react'
import { supabase } from 'src/lib/supabase'
import { useAuthStore } from 'src/stores/authStore'
import type {
  GroupRow,
  GroupMemberRow,
  ProfileRow,
  GroupRole,
  GroupUpdate,
  GroupInsert,
} from 'src/lib/types'

export type GroupMemberWithProfile = GroupMemberRow & { profile: ProfileRow }

// ─── useMyGroups ─────────────────────────────────────────────────────────────

export interface UseMyGroupsResult {
  myGroups: GroupRow[]
  isLoading: boolean
  refetch: () => Promise<void>
  createGroup: (data: Pick<GroupInsert, 'name' | 'description' | 'is_public'>) => Promise<GroupRow>
  inviteMember: (groupId: string, userId: string) => Promise<void>
  acceptInvitation: (groupId: string) => Promise<void>
  rejectInvitation: (groupId: string) => Promise<void>
}

export function useMyGroups(): UseMyGroupsResult {
  const { user } = useAuthStore()
  const [myGroups, setMyGroups] = useState<GroupRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!user) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
      if (memberError) throw memberError
      const groupIds = ((memberData ?? []) as GroupMemberRow[]).map((m) => m.group_id)
      if (groupIds.length === 0) { setMyGroups([]); return }
      const { data, error } = await supabase
        .from('groups').select('*').in('id', groupIds).order('created_at', { ascending: false })
      if (error) throw error
      setMyGroups((data ?? []) as GroupRow[])
    } catch (e) {
      console.error('[useMyGroups] refetch error:', e)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => { void refetch() }, [refetch])

  const createGroup = useCallback(
    async (data: Pick<GroupInsert, 'name' | 'description' | 'is_public'>): Promise<GroupRow> => {
      if (!user) throw new Error('로그인이 필요합니다.')
      const { data: group, error } = await supabase
        .from('groups')
        .insert({ ...data, owner_id: user.id, member_count: 1 } as never)
        .select().single()
      if (error) throw error
      await supabase.from('group_members').insert({
        group_id: (group as GroupRow).id, user_id: user.id,
        role: 'owner' as GroupRole, status: 'active' as const,
        joined_at: new Date().toISOString(),
      } as never)
      await refetch()
      return group as GroupRow
    },
    [user, refetch],
  )

  const inviteMember = useCallback(async (groupId: string, userId: string): Promise<void> => {
    const { error } = await supabase.from('group_members').insert({
      group_id: groupId, user_id: userId, role: 'member' as GroupRole,
      status: 'pending' as const, joined_at: new Date().toISOString(),
    } as never)
    if (error) throw error
  }, [])

  const acceptInvitation = useCallback(async (groupId: string): Promise<void> => {
    if (!user) throw new Error('로그인이 필요합니다.')
    const { error } = await supabase.from('group_members')
      .update({ status: 'active' as const } as never)
      .eq('group_id', groupId).eq('user_id', user.id).eq('status', 'pending')
    if (error) throw error
    await refetch()
  }, [user, refetch])

  const rejectInvitation = useCallback(async (groupId: string): Promise<void> => {
    if (!user) throw new Error('로그인이 필요합니다.')
    const { error } = await supabase.from('group_members')
      .delete().eq('group_id', groupId).eq('user_id', user.id).eq('status', 'pending')
    if (error) throw error
  }, [user])

  return { myGroups, isLoading, refetch, createGroup, inviteMember, acceptInvitation, rejectInvitation }
}

// ─── useGroup ────────────────────────────────────────────────────────────────

export interface UseGroupResult {
  group: GroupRow | null
  members: GroupMemberWithProfile[]
  myRole: GroupRole | null
  isPendingInvite: boolean
  isLoading: boolean
  updateGroup: (data: GroupUpdate) => Promise<void>
  removeMember: (userId: string) => Promise<void>
  updateMemberRole: (userId: string, role: GroupRole) => Promise<void>
  leaveGroup: () => Promise<void>
  joinGroup: () => Promise<void>
  acceptInvite: () => Promise<void>
  rejectInvite: () => Promise<void>
  addScopeLeader: (userId: string) => Promise<void>
  removeScopeLeader: (userId: string) => Promise<void>
}

export function useGroup(groupId: string): UseGroupResult {
  const { user } = useAuthStore()
  const [group, setGroup] = useState<GroupRow | null>(null)
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([])
  const [myRole, setMyRole] = useState<GroupRole | null>(null)
  const [isPendingInvite, setIsPendingInvite] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchGroup = useCallback(async () => {
    if (!user) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups').select('*').eq('id', groupId).single()
      if (groupError) throw groupError
      setGroup(groupData as GroupRow)

      const { data: memberData, error: memberError } = await supabase
        .from('group_members').select('*').eq('group_id', groupId)
      if (memberError) throw memberError

      const allRows = (memberData ?? []) as GroupMemberRow[]
      const activeRows = allRows.filter((m) => m.status === 'active')
      const me = allRows.find((m) => m.user_id === user.id)
      setMyRole(me?.role ?? null)
      setIsPendingInvite(me?.status === 'pending')

      const ids = activeRows.map((m) => m.user_id)
      if (ids.length === 0) { setMembers([]); return }

      const { data: profilesData, error: profileError } = await supabase
        .from('profiles').select('*').in('id', ids)
      if (profileError) throw profileError

      const profileMap = new Map<string, ProfileRow>(
        ((profilesData ?? []) as ProfileRow[]).map((p) => [p.id, p]),
      )
      setMembers(
        activeRows.filter((m) => profileMap.has(m.user_id))
          .map((m) => ({ ...m, profile: profileMap.get(m.user_id) as ProfileRow })),
      )
    } catch (e) {
      console.error('[useGroup] fetchGroup error:', e)
    } finally {
      setIsLoading(false)
    }
  }, [groupId, user])

  useEffect(() => { void fetchGroup() }, [fetchGroup])

  const updateGroup = useCallback(async (data: GroupUpdate) => {
    if (!['owner', 'leader'].includes(myRole ?? '')) {
      throw new Error('그룹 정보 수정 권한이 없습니다.')
    }
    const { error } = await supabase.from('groups').update(data as never).eq('id', groupId)
    if (error) throw error
    await fetchGroup()
  }, [groupId, fetchGroup, myRole])

  const removeMember = useCallback(async (userId: string) => {
    if (!['owner', 'leader'].includes(myRole ?? '')) {
      throw new Error('멤버 제거 권한이 없습니다.')
    }
    if (userId === user?.id) {
      throw new Error('본인은 강제 퇴출할 수 없습니다. 탈퇴는 그룹 탈퇴를 이용하세요.')
    }
    const { error } = await supabase.from('group_members')
      .update({ status: 'blocked' as const } as never)
      .eq('group_id', groupId).eq('user_id', userId)
    if (error) throw error
    await fetchGroup()
  }, [groupId, fetchGroup, myRole, user])

  const updateMemberRole = useCallback(async (userId: string, role: GroupRole) => {
    if (!['owner', 'leader'].includes(myRole ?? '')) {
      throw new Error('역할 변경 권한이 없습니다.')
    }
    if (userId === user?.id) {
      throw new Error('본인의 역할은 변경할 수 없습니다.')
    }
    const { error } = await supabase.from('group_members')
      .update({ role } as never).eq('group_id', groupId).eq('user_id', userId)
    if (error) throw error
    await fetchGroup()
  }, [groupId, fetchGroup, myRole, user])

  const leaveGroup = useCallback(async () => {
    if (!user) throw new Error('로그인이 필요합니다.')
    const { error } = await supabase.from('group_members')
      .delete().eq('group_id', groupId).eq('user_id', user.id)
    if (error) throw error
    setGroup(null); setMembers([]); setMyRole(null)
  }, [groupId, user])

  const joinGroup = useCallback(async () => {
    if (!user || !group) throw new Error('로그인이 필요합니다.')
    const status = group.is_public ? ('active' as const) : ('pending' as const)
    const { error } = await supabase.from('group_members').insert({
      group_id: groupId, user_id: user.id, role: 'member' as GroupRole,
      status, joined_at: new Date().toISOString(),
    } as never)
    if (error) throw error
    await fetchGroup()
  }, [groupId, user, group, fetchGroup])

  const acceptInvite = useCallback(async () => {
    if (!user) throw new Error('로그인이 필요합니다.')
    const { error } = await supabase.from('group_members')
      .update({ status: 'active' as const } as never)
      .eq('group_id', groupId).eq('user_id', user.id)
    if (error) throw error
    await fetchGroup()
  }, [groupId, user, fetchGroup])

  const rejectInvite = useCallback(async () => {
    if (!user) throw new Error('로그인이 필요합니다.')
    const { error } = await supabase.from('group_members')
      .delete().eq('group_id', groupId).eq('user_id', user.id)
    if (error) throw error
    setMyRole(null); setIsPendingInvite(false)
  }, [groupId, user])

  const addScopeLeader = useCallback(async (userId: string) => {
    if (!['owner', 'leader'].includes(myRole ?? '')) throw new Error('권한이 없습니다.')
    const { error } = await supabase.from('group_scope_leaders').insert({
      group_id: groupId, user_id: userId,
    } as never)
    if (error) throw error
    await fetchGroup()
  }, [groupId, myRole, fetchGroup])

  const removeScopeLeader = useCallback(async (userId: string) => {
    if (!['owner', 'leader'].includes(myRole ?? '')) throw new Error('권한이 없습니다.')
    const { error } = await supabase.from('group_scope_leaders')
      .delete().eq('group_id', groupId).eq('user_id', userId)
    if (error) throw error
    await fetchGroup()
  }, [groupId, myRole, fetchGroup])

  return {
    group, members, myRole, isPendingInvite, isLoading,
    updateGroup, removeMember, updateMemberRole, leaveGroup, joinGroup, acceptInvite, rejectInvite,
    addScopeLeader, removeScopeLeader,
  }
}
