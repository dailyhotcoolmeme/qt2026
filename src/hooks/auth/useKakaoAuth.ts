import { useState } from 'react'
import { supabase } from 'src/lib/supabase'

interface UseKakaoAuthResult {
  signInWithKakao: () => Promise<void>
  isLoading: boolean
  error: string | null
}

// 카카오 SDK는 빌드 시 임시 비활성화 (테스트용)
export function useKakaoAuth(): UseKakaoAuthResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signInWithKakao = async (): Promise<void> => {
    setError('카카오 로그인은 현재 준비 중입니다.')
    throw new Error('카카오 로그인은 현재 준비 중입니다.')
  }

  return { signInWithKakao, isLoading, error }
}
