import { useState, useCallback } from 'react'
import * as AppleAuthentication from 'expo-apple-authentication'
import { supabase } from 'src/lib/supabase'

interface UseAppleAuthResult {
  signInWithApple: () => Promise<void>
  isLoading: boolean
  isAvailable: boolean
}

export function useAppleAuth(): UseAppleAuthResult {
  const [isLoading, setIsLoading] = useState(false)
  // Apple 로그인은 iOS에서만 지원
  const isAvailable = AppleAuthentication.isAvailableAsync !== undefined

  const signInWithApple = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true)
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })

      const idToken = credential.identityToken
      if (!idToken) throw new Error('Apple ID token을 받지 못했습니다.')

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: idToken,
      })

      if (error) throw new Error(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { signInWithApple, isLoading, isAvailable }
}
