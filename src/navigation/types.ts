import type { NavigatorScreenParams } from '@react-navigation/native'

// ================================
// Tab Navigator (하단 탭 5개)
// ================================
export type TabParamList = {
  Home: undefined
  Bible: undefined
  QT: undefined
  Prayer: undefined
  Community: undefined
}

// ================================
// Root Stack Navigator
// ================================
export type RootStackParamList = {
  // 온보딩 (최초 1회)
  Onboarding: undefined

  // 탭 (인증 후)
  MainTabs: NavigatorScreenParams<TabParamList>

  // 인증
  Auth: undefined

  // 상세 화면
  BibleView: { book: string; chapter: number; verse?: number; keyword?: string }
  GroupDetail: { groupId: string; initialTab?: GroupDetailTab }
  Settings: undefined
  Favorites: undefined
  RecordDetail: { recordId: string; recordType: RecordType }
  Terms: { type: 'service' | 'privacy' }
  MyPrayerBox: undefined
}

// ================================
// Sub-types
// ================================
export type GroupDetailTab = 'faith' | 'prayer' | 'social' | 'members' | 'admin' | 'schedule'
export type RecordType = 'qt' | 'prayer' | 'reading'

// ================================
// Navigation Helper Types
// ================================
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
