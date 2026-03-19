export { colors, palette } from './colors'
export type { ColorScheme, Colors } from './colors'
export { typography } from './typography'
export { spacing } from './spacing'
export { shadows } from './shadows'

import { colors } from './colors'
import { typography } from './typography'
import { spacing } from './spacing'
import { shadows } from './shadows'

export const theme = {
  colors,
  typography,
  spacing,
  shadows,
} as const

export type Theme = typeof theme
