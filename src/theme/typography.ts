import { Platform } from 'react-native'

const fontFamily = Platform.select({
  ios: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },
  android: {
    regular: 'Roboto',
    medium: 'Roboto',
    semiBold: 'Roboto',
    bold: 'Roboto',
  },
  default: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },
})

export const typography = {
  fontFamily,

  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
  },

  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
    loose: 1.8,
  },

  // Preset text styles
  styles: {
    h1: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 34,
    },
    h2: {
      fontSize: 22,
      fontWeight: '700' as const,
      lineHeight: 28,
    },
    h3: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    h4: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 26,
    },
    body: {
      fontSize: 15,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    bodySmall: {
      fontSize: 13,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 11,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    button: {
      fontSize: 15,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: '500' as const,
      lineHeight: 18,
    },
  },
} as const
