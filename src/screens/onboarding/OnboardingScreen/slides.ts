import type { SlideData } from './OnboardingSlide'

export const SLIDES: SlideData[] = [
  {
    id: '1',
    icon: 'book-outline',
    title: '오늘의 말씀',
    subtitle: '매일 새로운 성경 말씀으로\n하루를 시작하세요',
    accent: '#4F6EF7',
  },
  {
    id: '2',
    icon: 'create-outline',
    title: 'QT 일기',
    subtitle: '말씀 묵상과 기도를 기록하고\n신앙 여정을 쌓아가세요',
    accent: '#7C3AED',
  },
  {
    id: '3',
    icon: 'hand-right-outline',
    title: '매일 기도',
    subtitle: '기도 제목을 나누고\n서로를 위해 중보하세요',
    accent: '#059669',
  },
  {
    id: '4',
    icon: 'people-outline',
    title: '중보모임',
    subtitle: '신앙 공동체와 함께\n더 깊은 믿음으로 성장하세요',
    accent: '#DC2626',
  },
]

// 배경 그라데이션 색상 (슬라이드별)
export const BG_COLORS_LIGHT: string[] = [
  '#EEF2FF',
  '#F5F3FF',
  '#ECFDF5',
  '#FEF2F2',
]

export const BG_COLORS_DARK: string[] = [
  '#1a1f3c',
  '#1e1530',
  '#0d2318',
  '#2a1010',
]
