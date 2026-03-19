import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Image, ImageStyle } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { theme } from 'src/theme'

interface AvatarProps {
  uri?: string | null
  name?: string | null
  size?: number
  style?: ViewStyle
}

export function Avatar({ uri, name, size = 40, style }: AvatarProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  const initials = name
    ? name.trim().charAt(0).toUpperCase()
    : null

  const fontSize = Math.round(size * 0.4)

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.border,
  }

  if (uri) {
    const imageStyle: ImageStyle = {
      width: size,
      height: size,
      borderRadius: size / 2,
    }
    return (
      <Image
        source={{ uri }}
        style={[styles.image, imageStyle]}
        contentFit="cover"
        accessibilityLabel={name ? `${name} 프로필 사진` : '프로필 사진'}
        accessibilityRole="image"
        transition={200}
      />
    )
  }

  return (
    <View
      style={[styles.container, containerStyle, style]}
      accessibilityLabel={name ? `${name} 아바타` : '프로필 아바타'}
      accessibilityRole="image"
    >
      {initials ? (
        <Text style={[styles.initials, { color: colors.primary, fontSize }]}>
          {initials}
        </Text>
      ) : (
        <Ionicons name="person" size={size * 0.5} color={colors.textTertiary} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    overflow: 'hidden',
  },
  initials: {
    fontWeight: theme.typography.fontWeight.semiBold,
    lineHeight: undefined,
  },
})
