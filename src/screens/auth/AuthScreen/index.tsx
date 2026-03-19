import React, { useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { theme } from 'src/theme'
import type { Colors } from 'src/theme'
import { useGoogleAuth } from 'src/hooks/auth/useGoogleAuth'
import { useKakaoAuth } from 'src/hooks/auth/useKakaoAuth'
import { useAppleAuth } from 'src/hooks/auth/useAppleAuth'
import { SocialButtons } from './SocialButtons'

export default function AuthScreen() {
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light'] as Colors

  const { signInWithGoogle, isLoading: isGoogleLoading, error: googleError } = useGoogleAuth()
  const { signInWithKakao, isLoading: isKakaoLoading } = useKakaoAuth()
  const { signInWithApple, isLoading: isAppleLoading } = useAppleAuth()

  useEffect(() => {
    if (googleError) {
      Alert.alert('Google 로그인 오류', googleError)
    }
  }, [googleError])

  const handleKakao = async () => {
    try {
      await signInWithKakao()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류'
      Alert.alert('알림', msg)
    }
  }

  const handleApple = async () => {
    try {
      await signInWithApple()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류'
      if (msg !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple 로그인 오류', msg)
      }
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* 로고 영역 */}
      <View style={styles.logoArea}>
        <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
          <Ionicons name="heart" size={36} color="#FFFFFF" />
        </View>
        <Text style={[styles.logoText, { color: colors.primary }]}>마이아멘</Text>
        <Text style={[styles.logoSubtext, { color: colors.textSecondary }]}>
          말씀과 기도, 함께하는 신앙 생활
        </Text>
      </View>

      {/* 소셜 로그인 */}
      <View style={styles.socialArea}>
        <SocialButtons
          colors={colors}
          isGoogleLoading={isGoogleLoading}
          isKakaoLoading={isKakaoLoading}
          isAppleLoading={isAppleLoading}
          onGoogle={() => void signInWithGoogle()}
          onKakao={() => void handleKakao()}
          onApple={() => void handleApple()}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 64,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  logoSubtext: {
    fontSize: 15,
  },
  socialArea: {},
})
