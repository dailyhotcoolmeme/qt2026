export const palette = {
  // Primary Blue
  blue50: '#EEF2FF',
  blue100: '#E0E7FF',
  blue200: '#C7D2FE',
  blue400: '#818CF8',
  blue500: '#6366F1',
  blue600: '#4F6EF7',
  blue700: '#4338CA',
  blue900: '#1E1B4B',

  // Neutral
  white: '#FFFFFF',
  gray50: '#FAFAFA',
  gray100: '#F4F4F5',
  gray200: '#E4E4E7',
  gray300: '#D4D4D8',
  gray400: '#A1A1AA',
  gray500: '#71717A',
  gray600: '#52525B',
  gray700: '#3F3F46',
  gray800: '#27272A',
  gray900: '#18181B',
  black: '#000000',

  // Semantic
  green500: '#22C55E',
  green600: '#16A34A',
  red400: '#F87171',
  red500: '#EF4444',
  red600: '#DC2626',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
} as const

export const colors = {
  light: {
    // Background
    background: '#FAFAFA',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    cardBorder: '#F0F0F0',

    // Text
    textPrimary: '#1A1A1A',
    textSecondary: '#52525B',
    textTertiary: '#A1A1AA',
    textInverse: '#FFFFFF',

    // Brand
    primary: '#4F6EF7',
    primaryLight: '#EEF2FF',
    primaryDark: '#4338CA',

    // Borders & Dividers
    border: '#E4E4E7',
    divider: '#F4F4F5',

    // States
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',

    // Tab bar
    tabBar: '#FFFFFF',
    tabBarBorder: '#E4E4E7',
    tabIconActive: '#4F6EF7',
    tabIconInactive: '#A1A1AA',

    // Header
    header: '#FFFFFF',
    headerBorder: '#F0F0F0',

    // Input
    inputBackground: '#F4F4F5',
    inputBorder: '#E4E4E7',
    inputText: '#1A1A1A',
    inputPlaceholder: '#A1A1AA',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
    shimmer: '#F0F0F0',
  },
  dark: {
    // Background
    background: '#121212',
    surface: '#1E1E1E',
    card: '#242424',
    cardBorder: '#2A2A2A',

    // Text
    textPrimary: '#F5F5F5',
    textSecondary: '#A1A1AA',
    textTertiary: '#52525B',
    textInverse: '#1A1A1A',

    // Brand
    primary: '#6366F1',
    primaryLight: '#1E1B4B',
    primaryDark: '#818CF8',

    // Borders & Dividers
    border: '#2A2A2A',
    divider: '#1E1E1E',

    // States
    success: '#22C55E',
    error: '#F87171',
    warning: '#FBBF24',

    // Tab bar
    tabBar: '#1A1A1A',
    tabBarBorder: '#2A2A2A',
    tabIconActive: '#818CF8',
    tabIconInactive: '#52525B',

    // Header
    header: '#1A1A1A',
    headerBorder: '#2A2A2A',

    // Input
    inputBackground: '#242424',
    inputBorder: '#2A2A2A',
    inputText: '#F5F5F5',
    inputPlaceholder: '#52525B',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
    shimmer: '#2A2A2A',
  },
} as const

export type ColorScheme = 'light' | 'dark'
export type Colors = typeof colors.light
