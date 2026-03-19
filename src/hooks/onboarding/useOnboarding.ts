import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const ONBOARDING_KEY = 'onboarding_completed'

export interface UseOnboardingResult {
  hasSeenOnboarding: boolean | null // null = 로딩 중
  completeOnboarding: () => Promise<void>
}

export function useOnboarding(): UseOnboardingResult {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false

    const checkOnboarding = async (): Promise<void> => {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY)
        if (!cancelled) {
          setHasSeenOnboarding(value === 'true')
        }
      } catch {
        if (!cancelled) {
          setHasSeenOnboarding(false)
        }
      }
    }

    void checkOnboarding()

    return () => {
      cancelled = true
    }
  }, [])

  const completeOnboarding = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
      setHasSeenOnboarding(true)
    } catch {
      // SecureStore 실패 시에도 메모리 상태는 업데이트
      setHasSeenOnboarding(true)
    }
  }, [])

  return { hasSeenOnboarding, completeOnboarding }
}
