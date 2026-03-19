import { create } from 'zustand'

type FontSize = 'sm' | 'md' | 'lg' | 'xl'
type ThemeMode = 'light' | 'dark' | 'system'

interface SettingsState {
  themeMode: ThemeMode
  fontSize: FontSize
  hapticEnabled: boolean

  // Actions
  setThemeMode: (mode: ThemeMode) => void
  setFontSize: (size: FontSize) => void
  setHapticEnabled: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  themeMode: 'system',
  fontSize: 'md',
  hapticEnabled: true,

  setThemeMode: (themeMode) => set({ themeMode }),
  setFontSize: (fontSize) => set({ fontSize }),
  setHapticEnabled: (hapticEnabled) => set({ hapticEnabled }),
}))
