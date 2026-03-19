import React from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Colors } from 'src/theme'

interface SocialButtonsProps {
  colors: Colors
  isGoogleLoading: boolean
  isKakaoLoading: boolean
  isAppleLoading: boolean
  onGoogle: () => void
  onKakao: () => void
  onApple: () => void
}

export function SocialButtons({
  colors,
  isGoogleLoading,
  isKakaoLoading,
  isAppleLoading,
  onGoogle,
  onKakao,
  onApple,
}: SocialButtonsProps) {
  const isAnyLoading = isGoogleLoading || isKakaoLoading || isAppleLoading

  return (
    <View style={styles.container}>
      {/* 카카오 로그인 */}
      <Pressable
        style={({ pressed }) => [
          styles.socialButton,
          styles.kakaoButton,
          { opacity: pressed || isKakaoLoading ? 0.75 : 1 },
        ]}
        onPress={onKakao}
        disabled={isAnyLoading}
      >
        {isKakaoLoading ? (
          <ActivityIndicator color="#000000" size="small" />
        ) : (
          <>
            <View style={styles.iconWrapper}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#1A1A1A" />
            </View>
            <Text style={styles.kakaoButtonText}>카카오로 계속하기</Text>
          </>
        )}
      </Pressable>

      {/* Google 로그인 */}
      <Pressable
        style={({ pressed }) => [
          styles.socialButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed || isGoogleLoading ? 0.75 : 1,
          },
        ]}
        onPress={onGoogle}
        disabled={isAnyLoading}
      >
        {isGoogleLoading ? (
          <ActivityIndicator color={colors.textPrimary} size="small" />
        ) : (
          <>
            <View style={styles.iconWrapper}>
              <Ionicons name="logo-google" size={20} color="#4285F4" />
            </View>
            <Text style={[styles.socialButtonText, { color: colors.textPrimary }]}>
              Google로 계속하기
            </Text>
          </>
        )}
      </Pressable>

      {/* Apple 로그인 (iOS만) */}
      {Platform.OS === 'ios' && (
        <Pressable
          style={({ pressed }) => [
            styles.socialButton,
            styles.appleButton,
            { opacity: pressed || isAppleLoading ? 0.75 : 1 },
          ]}
          onPress={onApple}
          disabled={isAnyLoading}
        >
          {isAppleLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <View style={styles.iconWrapper}>
                <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.appleButtonText}>Apple로 계속하기</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  socialButton: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  iconWrapper: {
    width: 24,
    alignItems: 'center',
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
    borderColor: '#FEE500',
  },
  kakaoButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  appleButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
})
