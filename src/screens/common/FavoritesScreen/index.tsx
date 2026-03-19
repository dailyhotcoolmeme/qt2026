import React from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ListRenderItem,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { theme } from 'src/theme'
import { EmptyState } from 'src/components/common'
import { Loading } from 'src/components/common'
import { useFavorites } from 'src/hooks/favorites/useFavorites'
import type { VerseFavoriteRow } from 'src/lib/types'
import { FavoriteItem } from './FavoriteItem'

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const sp = theme.spacing

  const { favorites, isLoading, removeFavorite } = useFavorites()

  const renderItem: ListRenderItem<VerseFavoriteRow> = ({ item }) => (
    <FavoriteItem item={item} onRemove={removeFavorite} />
  )

  const keyExtractor = (item: VerseFavoriteRow) => item.id

  if (isLoading) {
    return <Loading fullScreen />
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* 헤더 */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.header,
            borderBottomColor: colors.headerBorder,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          즐겨찾기
        </Text>
        {favorites.length > 0 && (
          <View
            style={[styles.badge, { backgroundColor: colors.primaryLight }]}
          >
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              {favorites.length}
            </Text>
          </View>
        )}
      </View>

      {/* 목록 */}
      <FlatList
        data={favorites}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + sp.lg },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={
              <Ionicons
                name="bookmark-outline"
                size={48}
                color={colors.textTertiary}
              />
            }
            title="즐겨찾기한 구절이 없습니다"
            description="말씀을 읽다가 마음에 드는 구절을 즐겨찾기해 보세요."
          />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    gap: theme.spacing.sm,
  },
  title: {
    ...theme.typography.styles.h3,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.spacing.borderRadiusFull,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    ...theme.typography.styles.label,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: theme.spacing.md,
    flexGrow: 1,
  },
})
