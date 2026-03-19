import { useState, useCallback, useEffect } from 'react'
import { Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import {
  useAuthRequest,
  makeRedirectUri,
  ResponseType,
} from 'expo-auth-session'
import { supabase } from 'src/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
}

const clientId = Platform.select({
  ios: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? '',
  android: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ?? '',
  default: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? '',
})

interface UseGoogleAuthResult {
  signInWithGoogle: () => Promise<void>
  isLoading: boolean
  error: string | null
}

export function useGoogleAuth(): UseGoogleAuthResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirectUri = makeRedirectUri({ scheme: 'myamen' })

  const [request, response, promptAsync] = useAuthRequest(
    {
      responseType: ResponseType.IdToken,
      clientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      usePKCE: true,
    },
    discovery,
  )

  useEffect(() => {
    if (!response) return

    const handleResponse = async () => {
      if (response.type === 'success') {
        const { id_token } = response.params
        if (!id_token) {
          setError('Google 토큰을 가져오지 못했습니다.')
          setIsLoading(false)
          return
        }
        try {
          const { error: authError } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: id_token,
          })
          if (authError) {
            setError('Google 로그인에 실패했습니다.')
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : '알 수 없는 오류'
          setError(msg)
        } finally {
          setIsLoading(false)
        }
      } else if (response.type === 'error') {
        setError('Google 로그인이 취소되었거나 오류가 발생했습니다.')
        setIsLoading(false)
      } else if (response.type === 'cancel') {
        setIsLoading(false)
      } else {
        setIsLoading(false)
      }
    }

    void handleResponse()
  }, [response])

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    if (!clientId) {
      setError('Google 로그인이 설정되지 않았습니다.')
      return
    }
    if (!request) {
      setError('Google 로그인을 초기화하는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      await promptAsync()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.'
      setError(msg)
      setIsLoading(false)
    }
  }, [request, promptAsync])

  return { signInWithGoogle, isLoading, error }
}
