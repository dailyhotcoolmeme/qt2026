import React, { useRef, useState, useCallback } from 'react'
import {
  View,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  Text,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolateColor,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from 'src/navigation/types'
import { colors } from 'src/theme'
import { useOnboarding } from 'src/hooks/onboarding/useOnboarding'
import { OnboardingSlide } from './OnboardingSlide'
import { PaginationDots } from './PaginationDots'
import type { SlideData } from './OnboardingSlide'
import { SLIDES, BG_COLORS_LIGHT, BG_COLORS_DARK } from './slides'

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<SlideData>)

export default function OnboardingScreen({ navigation }: Props): React.JSX.Element {
  const { width: screenWidth } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const scheme = isDark ? 'dark' : 'light'
  const c = colors[scheme]
  const { completeOnboarding } = useOnboarding()

  const scrollX = useSharedValue(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const flatListRef = useRef<FlatList<SlideData>>(null)

  const bgColors = scheme === 'dark' ? BG_COLORS_DARK : BG_COLORS_LIGHT

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x
    },
  })

  const backgroundStyle = useAnimatedStyle(() => {
    const inputRange = SLIDES.map((_, i) => i * screenWidth)
    const backgroundColor = interpolateColor(scrollX.value, inputRange, bgColors)
    return { backgroundColor }
  })

  const handleSkip = useCallback(async (): Promise<void> => {
    await completeOnboarding()
    navigation.replace('MainTabs')
  }, [completeOnboarding, navigation])

  const handleNext = useCallback((): void => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true })
    }
  }, [activeIndex])

  const handleStart = useCallback(async (): Promise<void> => {
    await completeOnboarding()
    navigation.replace('MainTabs')
  }, [completeOnboarding, navigation])

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index)
      }
    },
    [],
  )

  const isLastSlide = activeIndex === SLIDES.length - 1

  return (
    <Animated.View style={[styles.container, backgroundStyle]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {!isLastSlide && (
          <Pressable
            onPress={handleSkip}
            style={({ pressed }) => [styles.skipBtn, pressed && styles.skipBtnPressed]}
            hitSlop={12}
          >
            <Text style={[styles.skipText, { color: c.textSecondary }]}>건너뛰기</Text>
          </Pressable>
        )}
      </View>

      <AnimatedFlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item, index }) => (
          <OnboardingSlide
            slide={item}
            index={index}
            scrollX={scrollX}
            screenWidth={screenWidth}
          />
        )}
        style={styles.flatList}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <PaginationDots
          count={SLIDES.length}
          scrollX={scrollX}
          screenWidth={screenWidth}
          activeColor={SLIDES[activeIndex].accent}
        />
        <Pressable
          onPress={isLastSlide ? handleStart : handleNext}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: SLIDES[activeIndex].accent },
            pressed && styles.actionBtnPressed,
          ]}
        >
          <Text style={styles.actionBtnText}>
            {isLastSlide ? '시작하기' : '다음 →'}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    height: 56,
    justifyContent: 'center',
  },
  skipBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  skipBtnPressed: { opacity: 0.5 },
  skipText: { fontSize: 15, fontWeight: '500' },
  flatList: { flex: 1 },
  footer: {
    alignItems: 'center',
    gap: 28,
    paddingHorizontal: 24,
  },
  actionBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPressed: { opacity: 0.85 },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
})
