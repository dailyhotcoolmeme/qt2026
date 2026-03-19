import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { supabase } from 'src/lib/supabase'
import { Avatar, Button } from 'src/components/common'
import { theme } from 'src/theme'
import type { ProfileRow } from 'src/lib/types'

interface JoinRequest {
  id: string
  group_id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  message: string | null
  created_at: string
  profile: ProfileRow
}

interface JoinRequestSectionProps {
  groupId: string
}

export function JoinRequestSection({ groupId }: JoinRequestSectionProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const fetchJoinRequests = useCallback(async () => {
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: string) => Promise<{ data: unknown[] | null; error: unknown }>
          }
        }
      }
    })
      .from('group_join_requests')
      .select('*')
      .eq('group_id', groupId)
      .eq('status', 'pending')

    if (error || !data) return

    type RawRequest = {
      id: string; group_id: string; user_id: string
      status: 'pending' | 'approved' | 'rejected'
      message: string | null; created_at: string
    }
    const requests = data as RawRequest[]
    const userIds = requests.map((r) => r.user_id)
    if (userIds.length === 0) { setJoinRequests([]); return }

    const { data: profilesData } = await supabase.from('profiles').select('*').in('id', userIds)
    const profileMap = new Map<string, ProfileRow>(
      ((profilesData ?? []) as ProfileRow[]).map((p) => [p.id, p]),
    )
    setJoinRequests(
      requests
        .filter((r) => profileMap.has(r.user_id))
        .map((r) => ({ ...r, profile: profileMap.get(r.user_id) as ProfileRow })),
    )
  }, [groupId])

  useEffect(() => { void fetchJoinRequests() }, [fetchJoinRequests])

  const handleApprove = async (req: JoinRequest) => {
    setLoadingId(req.id)
    try {
      await (supabase as unknown as { from: (t: string) => { update: (d: unknown) => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } })
        .from('group_join_requests').update({ status: 'approved' }).eq('id', req.id)
      const { error } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: req.user_id,
        role: 'member' as const,
        status: 'active' as const,
        joined_at: new Date().toISOString(),
      } as never)
      if (error) throw error
      await fetchJoinRequests()
    } catch {
      Alert.alert('오류', '수락 중 문제가 발생했습니다.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleReject = async (req: JoinRequest) => {
    setLoadingId(req.id)
    try {
      await (supabase as unknown as { from: (t: string) => { update: (d: unknown) => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } })
        .from('group_join_requests').update({ status: 'rejected' }).eq('id', req.id)
      await fetchJoinRequests()
    } catch {
      Alert.alert('오류', '거절 중 문제가 발생했습니다.')
    } finally {
      setLoadingId(null)
    }
  }

  if (joinRequests.length === 0) return null

  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
        가입 신청 ({joinRequests.length})
      </Text>
      {joinRequests.map((req) => (
        <View key={req.id} style={[styles.requestItem, { borderBottomColor: colors.divider }]}>
          <Avatar uri={req.profile.avatar_url} name={req.profile.full_name} size={40} />
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>
              {req.profile.full_name ?? req.profile.username ?? '알 수 없음'}
            </Text>
            {req.message ? (
              <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={1}>
                {req.message}
              </Text>
            ) : null}
          </View>
          <Button
            title="수락"
            variant="primary"
            size="sm"
            loading={loadingId === req.id}
            onPress={() => void handleApprove(req)}
          />
          <Button
            title="거절"
            variant="outline"
            size="sm"
            loading={loadingId === req.id}
            onPress={() => void handleReject(req)}
          />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: theme.spacing.sm },
  sectionLabel: {
    ...theme.typography.styles.caption,
    fontWeight: theme.typography.fontWeight.semiBold,
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingVertical: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.sm,
  },
  info: { flex: 1, gap: 2 },
  name: { ...theme.typography.styles.h4 },
  bio: { ...theme.typography.styles.bodySmall },
})
