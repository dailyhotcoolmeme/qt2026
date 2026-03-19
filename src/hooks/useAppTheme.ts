import { useColorScheme } from 'react-native'
import { useSettingsStore } from 'src/stores/settingsStore'

export function useAppTheme() {
  const systemScheme = useColorScheme()
  const themeMode = useSettingsStore((s) => s.themeMode)

  const isDark =
    themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark'

  return { isDark, themeMode }
}
