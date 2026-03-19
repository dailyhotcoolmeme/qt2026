import { Platform } from 'react-native'

const createShadow = (
  elevation: number,
  color = '#000000',
  opacity = 0.08,
  offsetY = 2,
  radius = 8,
) => {
  if (Platform.OS === 'android') {
    return { elevation }
  }
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowOffset: { width: 0, height: offsetY },
    shadowRadius: radius,
  }
}

export const shadows = {
  none: {},
  sm: createShadow(2, '#000000', 0.06, 1, 4),
  md: createShadow(4, '#000000', 0.08, 2, 8),
  lg: createShadow(8, '#000000', 0.10, 4, 12),
  xl: createShadow(12, '#000000', 0.12, 8, 20),
  card: createShadow(3, '#000000', 0.06, 2, 6),
  button: createShadow(4, '#4F6EF7', 0.25, 2, 8),
} as const
