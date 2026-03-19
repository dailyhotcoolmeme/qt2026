import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Platform, StyleSheet } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { theme } from 'src/theme'
import type { TabParamList } from './types'

import HomeScreen from 'src/screens/home/HomeScreen'
import BibleScreen from 'src/screens/bible/BibleScreen'
import QTScreen from 'src/screens/qt/QTScreen'
import PrayerScreen from 'src/screens/prayer/PrayerScreen'
import CommunityScreen from 'src/screens/community/CommunityScreen'

const Tab = createBottomTabNavigator<TabParamList>()

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

const TAB_ICONS: Record<keyof TabParamList, { active: IoniconName; inactive: IoniconName }> = {
  Home: { active: 'sunny', inactive: 'sunny-outline' },
  Bible: { active: 'book', inactive: 'book-outline' },
  QT: { active: 'journal', inactive: 'journal-outline' },
  Prayer: { active: 'hand-left', inactive: 'hand-left-outline' },
  Community: { active: 'people', inactive: 'people-outline' },
}

const TAB_LABELS: Record<keyof TabParamList, string> = {
  Home: '오늘말씀',
  Bible: '성경읽기',
  QT: 'QT일기',
  Prayer: '매일기도',
  Community: '중보모임',
}

export function TabNavigator() {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name as keyof TabParamList]
          const iconName = focused ? icons.active : icons.inactive
          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: colors.tabIconActive,
        tabBarInactiveTintColor: colors.tabIconInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: theme.spacing.tabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowOffset: { width: 0, height: -2 },
              shadowRadius: 8,
            },
            android: { elevation: 8 },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarLabel: TAB_LABELS[route.name as keyof TabParamList],
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Bible" component={BibleScreen} />
      <Tab.Screen name="QT" component={QTScreen} />
      <Tab.Screen name="Prayer" component={PrayerScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
    </Tab.Navigator>
  )
}
