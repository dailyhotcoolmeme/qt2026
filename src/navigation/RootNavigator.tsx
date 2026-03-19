import { useEffect } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { useAppTheme } from 'src/hooks/useAppTheme'
import { supabase } from 'src/lib/supabase'
import { useAuthStore } from 'src/stores/authStore'
import { useOnboarding } from 'src/hooks/onboarding/useOnboarding'
import { theme } from 'src/theme'
import { Loading } from 'src/components/common/Loading'
import type { RootStackParamList } from './types'
import { TabNavigator } from './TabNavigator'

import AuthScreen from 'src/screens/auth/AuthScreen'
import BibleViewScreen from 'src/screens/bible/BibleViewScreen'
import GroupDetailScreen from 'src/screens/group/GroupDetailScreen'
import OnboardingScreen from 'src/screens/onboarding/OnboardingScreen'
import FavoritesScreen from 'src/screens/common/FavoritesScreen'
import SettingsScreen from 'src/screens/common/SettingsScreen'
import RecordDetailScreen from 'src/screens/common/RecordDetail'
import TermsScreen from 'src/screens/common/Terms'

const Stack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator() {
  const { session, isLoading, setSession, setUser, setLoading } = useAuthStore()
  const { hasSeenOnboarding } = useOnboarding()
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    // 세션 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setSession, setUser, setLoading])

  // 세션 로딩 중 또는 온보딩 상태 확인 중
  if (isLoading || hasSeenOnboarding === null) {
    return <Loading fullScreen />
  }

  const initialRoute = !hasSeenOnboarding ? 'Onboarding' : 'MainTabs'

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="Auth" component={AuthScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="BibleView" component={BibleViewScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: true, title: '설정' }}
      />
      <Stack.Screen name="RecordDetail" component={RecordDetailScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
    </Stack.Navigator>
  )
}
