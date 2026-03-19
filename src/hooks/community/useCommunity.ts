import { useState, useEffect, useCallback } from 'react'
import { supabase } from 'src/lib/supabase'
import { useAuthStore } from 'src/stores/authStore'
import type { GroupRow, GroupInsert, GroupMemberRow } from 'src/lib/types'

export interface UseCommunityResult {
  groups: GroupRow[]
  myGroups: GroupRow[]
  isLoading: boolean
  searchQuery: string
  setSearchQuery: (q: string) => void
  filteredGroups: GroupRow[]
  joinGroup: (groupId: string, password?: string) => Promise<void>
  createGroup: (data: GroupInsert) => Promise<GroupRow>
  isJoining: boolean
  isCreating: boolean
}

export function useCommunity(): UseCommunityResult {
  const { user } = useAuthStore()
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [myGroups, setMyGroups] = useState<GroupRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const fetchGroups = useCallback(async () => {
    if (!user) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const allGroupsResult = await supabase
        .from('groups')
        .select('*')
        .eq('is_public', true)
        .order('member_count', { ascending: false })

      if (allGroupsResult.error) throw allGroupsResult.error
      setGroups((allGroupsResult.data ?? []) as GroupRow[])

      const memberResult = await supabase
        .from('group_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (memberResult.error) throw memberResult.error

      const myGroupIds = (memberResult.data as GroupMemberRow[]).map((r) => r.group_id)
      if (myGroupIds.length > 0) {
        const myGroupResult = await supabase
          .from('groups')
          .select('*')
          .in('id', myGroupIds)
          .order('name')

        if (myGroupResult.error) throw myGroupResult.error
        setMyGroups((myGroupResult.data ?? []) as GroupRow[])
      } else {
        setMyGroups([])
      }
    } catch (e) {
      console.error('[useCommunity] fetchGroups error:', e)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    void fetchGroups()
  }, [fetchGroups])

  const filteredGroups = searchQuery.trim()
    ? groups.filter(
        (g) =>
          g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (g.description ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : groups

  const joinGroup = useCallback(
    async (groupId: string, password?: string) => {
      if (!user) throw new Error('로그인이 필요합니다.')
      setIsJoining(true)
      try {
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single()

        if (groupError) throw groupError
        const group = groupData as GroupRow
        if (!group.is_public && group.password !== password) {
          throw new Error('비밀번호가 일치하지 않습니다.')
        }

        const insertData = {
          group_id: groupId,
          user_id: user.id,
          role: 'member' as const,
          status: 'active' as const,
        }

        const { error } = await supabase
          .from('group_members')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(insertData as any)

        if (error) throw error
        await fetchGroups()
      } finally {
        setIsJoining(false)
      }
    },
    [user, fetchGroups],
  )

  const createGroup = useCallback(
    async (data: GroupInsert): Promise<GroupRow> => {
      if (!user) throw new Error('로그인이 필요합니다.')
      setIsCreating(true)
      try {
        const insertPayload = { ...data, owner_id: user.id }

        const { data: created, error } = await supabase
          .from('groups')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(insertPayload as any)
          .select()
          .single()

        if (error) throw error
        const newGroup = created as GroupRow

        const memberInsert = {
          group_id: newGroup.id,
          user_id: user.id,
          role: 'owner' as const,
          status: 'active' as const,
        }
        await supabase
          .from('group_members')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(memberInsert as any)

        await fetchGroups()
        return newGroup
      } finally {
        setIsCreating(false)
      }
    },
    [user, fetchGroups],
  )

  return {
    groups,
    myGroups,
    isLoading,
    searchQuery,
    setSearchQuery,
    filteredGroups,
    joinGroup,
    createGroup,
    isJoining,
    isCreating,
  }
}
