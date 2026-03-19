import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { theme } from 'src/theme'
import type { GroupRow } from 'src/lib/types'

interface MyGroupCardProps {
  group: GroupRow
  onPress: () => void
}

export function MyGroupCard({ group, onPress }: MyGroupCardProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${group.name} 그룹`}
    >
      {group.image_url ? (
        <Image
          source={{ uri: group.image_url }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="people" size={28} color={colors.primary} />
        </View>
      )}
      <Text
        style={[styles.name, { color: colors.textPrimary }]}
        numberOfLines={1}
      >
        {group.name}
      </Text>
      <View style={styles.memberRow}>
        <Ionicons name="person-outline" size={11} color={colors.textTertiary} />
        <Text style={[styles.memberCount, { color: colors.textTertiary }]}>
          {group.member_count}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    width: 100,
    borderRadius: theme.spacing.borderRadius,
    borderWidth: 1,
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: theme.spacing.xs,
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...theme.typography.styles.label,
    textAlign: 'center',
    marginBottom: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  memberCount: {
    ...theme.typography.styles.caption,
  },
})
