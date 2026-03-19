import { NavigationContainer } from '@react-navigation/native'
import { QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StyleSheet } from 'react-native'
import { queryClient } from 'src/lib/queryClient'
import { linking } from 'src/navigation/linking'
import { RootNavigator } from 'src/navigation/RootNavigator'
import { configureNotificationHandler } from 'src/lib/notifications'
import { usePushNotifications } from 'src/hooks/notifications/usePushNotifications'

configureNotificationHandler()

function AppContent() {
  usePushNotifications()

  return (
    <NavigationContainer linking={linking}>
      <RootNavigator />
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
