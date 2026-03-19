import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from 'src/lib/supabase'
import { Button } from 'src/components/common'
import { theme } from 'src/theme'
import type { GroupRow, GroupRole } from 'src/lib/types'
import type { RootStackParamList } from 'src/navigation/types'
import { ScopeLeaderSection } from './ScopeLeaderSection'

type Nav = NativeStackNavigationProp<RootStackParamList>

interface AdminManageTabProps {
  group: GroupRow
  myRole: GroupRole
  onAddScopeLeader: (userId: string) => Promise<void>
  onRemoveScopeLeader: (userId: string) => Promise<void>
}

export function AdminManageTab({
  group,
  myRole,
  onAddScopeLeader,
  onRemoveScopeLeader,
}: AdminManageTabProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<Nav>()
  const [isDeleting, setIsDeleting] = useState(false)

  const isManager = myRole === 'owner' || myRole === 'leader'

  const handleDeleteGroup = () => {
    Alert.alert(
      '모임 삭제',
      `'${group.name}' 모임을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true)
            try {
              const { error } = await supabase.from('groups').delete().eq('id', group.id)
              if (error) throw error
              navigation.goBack()
            } catch {
              Alert.alert('오류', '모임 삭제 중 문제가 발생했습니다.')
              setIsDeleting(false)
            }
          },
        },
      ],
    )
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.spacing['2xl'] }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ScopeLeaderSection
        groupId={group.id}
        onAddScopeLeader={onAddScopeLeader}
        onRemoveScopeLeader={onRemoveScopeLeader}
      />

      {isManager && (
        <View style={[styles.dangerZone, { borderTopColor: colors.border }]}>
          <Text style={[styles.dangerTitle, { color: colors.error }]}>위험 구역</Text>
          <Button
            title={isDeleting ? '삭제 중...' : '모임 삭제'}
            variant="destructive"
            onPress={handleDeleteGroup}
            loading={isDeleting}
            leftIcon={<Ionicons name="trash-outline" size={18} color="#fff" />}
            fullWidth
          />
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: theme.spacing.screenPaddingH },
  dangerZone: {
    marginTop: theme.spacing['2xl'],
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    gap: theme.spacing.sm,
  },
  dangerTitle: { ...theme.typography.styles.h4, marginBottom: theme.spacing.sm },
})
