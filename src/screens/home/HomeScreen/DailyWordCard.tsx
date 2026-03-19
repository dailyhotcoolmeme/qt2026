import React from 'react'
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import type { DailyWord } from 'src/hooks/home/useDailyWord'

const ACCENT = '#4A6741'
const CARD_RATIO = 0.76
const ASPECT_RATIO = 1.05

export interface DailyWordCardProps {
  word: DailyWord | null
  isLoading: boolean
}

function cleanLine(line: string): string {
  return line.replace(/^\d+\.?\s*/, '').trim()
}

export function DailyWordCard({ word, isLoading }: DailyWordCardProps) {
  const { width: screenWidth } = useWindowDimensions()
  const minHeight = screenWidth * CARD_RATIO * ASPECT_RATIO

  const cardStyle = {
    ...styles.card,
    minHeight,
  }

  if (isLoading || !word) {
    return (
      <View style={cardStyle}>
        <Text style={styles.loadingText}>말씀을 불러오는 중...</Text>
      </View>
    )
  }

  const lines = String(word.content ?? '')
    .split('\n')
    .map(cleanLine)
    .filter(Boolean)

  return (
    <View style={cardStyle}>
      <View style={styles.contentGroup}>
        <View style={styles.body}>
          {lines.map((line, i) => (
            <Text key={i} style={styles.contentLine}>
              {line}
            </Text>
          ))}
        </View>
        <Text style={styles.reference}>{word.reference}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.06,
    shadowRadius: 45,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  contentGroup: {
    alignItems: 'center',
    gap: 20,
    width: '100%',
  },
  body: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  contentLine: {
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 28,
    color: '#27272A',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  reference: {
    fontSize: 15,
    fontWeight: '700',
    color: ACCENT,
    opacity: 0.6,
    textAlign: 'center',
  },
  loadingText: {
    color: '#D4D4D8',
    fontSize: 14,
  },
})
