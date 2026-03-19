import React from 'react'
import { View, Text, FlatList, Pressable, StyleSheet, TextInput, ListRenderItemInfo } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Ionicons } from '@expo/vector-icons'
import { theme } from 'src/theme'
import type { GroupRow } from 'src/lib/types'
import { MyGroupCard } from './MyGroupCard'

interface CommunityListHeaderProps {
  searchQuery: string
  onChangeSearch: (v: string) => void
  myGroups: GroupRow[]
  onMyGroupPress: (groupId: string) => void
  onNewGroup: () => void
}

export function CommunityListHeader({
  searchQuery,
  onChangeSearch,
  myGroups,
  onMyGroupPress,
  onNewGroup,
}: CommunityListHeaderProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  const renderMyGroup = ({ item }: ListRenderItemInfo<GroupRow>) => (
    <MyGroupCard group={item} onPress={() => onMyGroupPress(item.id)} />
  )

  return (
    <>
      <View style={[styles.searchRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
        <TextInput
          value={searchQuery}
          onChangeText={onChangeSearch}
          placeholder="모임 검색"
          placeholderTextColor={colors.inputPlaceholder}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {myGroups.length > 0 && (
        <View style={styles.groupSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>내 모임</Text>
            <Pressable
              onPress={onNewGroup}
              accessibilityRole="button"
              accessibilityLabel="새 모임 만들기"
              hitSlop={8}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            </Pressable>
          </View>
          <FlatList
            data={myGroups}
            keyExtractor={(item) => item.id}
            renderItem={renderMyGroup}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.myGroupsList}
          />
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>모임 탐색</Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.screenPaddingH,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    ...theme.typography.styles.body,
  },
  groupSection: { marginBottom: theme.spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screenPaddingH,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: { ...theme.typography.styles.h4 },
  myGroupsList: {
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingBottom: theme.spacing.sm,
  },
})
