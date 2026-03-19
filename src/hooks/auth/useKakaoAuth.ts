import { useState } from 'react'
import { login, logout, me } from '@react-native-kakao/user'
import { supabase } from 'src/lib/supabase'

interface UseKakaoAuthResult {
  signInWithKakao: () => Promise<void>
  isLoading: boolean
  error: string | null
}

export function useKakaoAuth(): UseKakaoAuthResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signInWithKakao = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      // 카카오 로그인 (카카오톡 앱 → 웹뷰 순 시도)
      const token = await login()

      // 카카오 사용자 정보 조회 (이메일 동의 여부 확인용)
      const user = await me()

      if (user.emailNeedsAgreement) {
        throw new Error('카카오 이메일 동의가 필요합니다. 카카오 계정에서 이메일 제공에 동의해주세요.')
      }

      // Supabase에 카카오 ID 토큰으로 로그인
      // idToken이 있으면 우선 사용, 없으면 accessToken으로 fallback
      const idToken = token.idToken ?? token.accessToken
      const { error: supabaseError } = await supabase.auth.signInWithIdToken({
        provider: 'kakao',
        token: idToken,
      })

      if (supabaseError) throw supabaseError
    } catch (e) {
      const msg = e instanceof Error ? e.message : '카카오 로그인에 실패했습니다.'
      setError(msg)
      throw e
    } finally {
      setIsLoading(false)
    }
  }

  return { signInWithKakao, isLoading, error }
}
