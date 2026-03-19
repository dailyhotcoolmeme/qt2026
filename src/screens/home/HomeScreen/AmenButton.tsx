import React, { useCallback } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

const ACCENT = '#4A6741'
const SIZE = 96

interface AmenButtonProps {
  count: number
  hasAmened: boolean
  onPress: () => Promise<void>
}

export function AmenButton({ count, hasAmened, onPress }: AmenButtonProps) {
  const ring1Scale = useSharedValue(1)
  const ring1Opacity = useSharedValue(0)
  const ring2Scale = useSharedValue(1)
  const ring2Opacity = useSharedValue(0)
  const btnScale = useSharedValue(1)

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }))

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }))

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }))

  const handlePress = useCallback(async () => {
    if (hasAmened) return

    // 햅틱 + 애니메이션
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    btnScale.value = withSequence(
      withTiming(0.9, { duration: 100, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 150, easing: Easing.out(Easing.back(2)) }),
    )

    ring1Opacity.value = withSequence(
      withTiming(0.5, { duration: 100 }),
      withTiming(0, { duration: 2100, easing: Easing.out(Easing.ease) }),
    )
    ring1Scale.value = withSequence(
      withTiming(1, { duration: 0 }),
      withTiming(1.5, { duration: 2200, easing: Easing.out(Easing.ease) }),
    )

    ring2Opacity.value = withDelay(
      200,
      withSequence(
        withTiming(0.4, { duration: 100 }),
        withTiming(0, { duration: 1700, easing: Easing.out(Easing.ease) }),
      ),
    )
    ring2Scale.value = withSequence(
      withTiming(1, { duration: 0 }),
      withDelay(200, withTiming(1.2, { duration: 1800, easing: Easing.out(Easing.ease) })),
    )

    await onPress()
  }, [hasAmened, onPress, btnScale, ring1Opacity, ring1Scale, ring2Opacity, ring2Scale])

  return (
    <View style={styles.container}>
      {/* 리플 링 */}
      <Animated.View
        style={[
          styles.ring,
          { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: ACCENT },
          ring1Style,
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.ring,
          { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: ACCENT },
          ring2Style,
        ]}
        pointerEvents="none"
      />

      {/* 버튼 */}
      <Pressable onPress={() => void handlePress()}>
        <Animated.View
          style={[
            styles.button,
            {
              backgroundColor: hasAmened ? ACCENT : '#FFFFFF',
              borderColor: hasAmened ? 'transparent' : '#F0FDF4',
            },
            btnStyle,
          ]}
        >
          <Ionicons
            name={hasAmened ? 'heart' : 'heart-outline'}
            size={20}
            color={hasAmened ? '#FFFFFF' : ACCENT}
            style={styles.icon}
          />
          <Text style={[styles.label, { color: hasAmened ? '#FFFFFF' : ACCENT }]}>아멘</Text>
          <Text style={[styles.count, { color: hasAmened ? 'rgba(255,255,255,0.7)' : `${ACCENT}99` }]}>
            {count.toLocaleString()}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  icon: {
    marginBottom: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  count: {
    fontSize: 13,
    fontWeight: '700',
  },
})
