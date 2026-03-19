import type { LinkingOptions } from '@react-navigation/native'
import type { RootStackParamList } from './types'

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['myamen://', 'https://myamen.co.kr'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: '',
          Bible: 'bible',
          QT: 'qt',
          Prayer: 'prayer',
          Community: 'community',
        },
      },
      Auth: 'auth',
      BibleView: 'bible/:book/:chapter',
      GroupDetail: 'group/:groupId',
      Settings: 'settings',
      Favorites: 'favorites',
      RecordDetail: 'record/:recordId',
      Terms: 'terms/:type',
    },
  },

  // OAuth 콜백 및 그룹 초대 처리
  getStateFromPath(path, options) {
    // OAuth callback: myamen://auth/callback?...
    if (path.startsWith('/auth/callback') || path.startsWith('auth/callback')) {
      return {
        routes: [{ name: 'Auth' as const, path }],
      }
    }

    // 그룹 초대: myamen://invite/:groupId
    const inviteMatch = path.match(/^\/?(invite\/)(.+)$/)
    if (inviteMatch) {
      const groupId = inviteMatch[2]
      // UUID 형식만 허용 (경로 순회 및 임의 값 주입 방지)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(groupId)) {
        return undefined
      }
      return {
        routes: [
          {
            name: 'MainTabs' as const,
            state: {
              routes: [{ name: 'Community' as const }],
            },
          },
          {
            name: 'GroupDetail' as const,
            params: { groupId },
          },
        ],
      }
    }

    // 기본 처리
    const { getStateFromPath } = require('@react-navigation/native')
    return getStateFromPath(path, options)
  },
}
