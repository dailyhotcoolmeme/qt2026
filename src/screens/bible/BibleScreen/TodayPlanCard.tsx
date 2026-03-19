import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { theme } from 'src/theme'
import { Button } from 'src/components/common'
import { Card } from 'src/components/common'
import type { ReadingPlan } from 'src/hooks/bible/useBibleReading'

const BOOK_NAMES: Record<string, string> = {
  GEN: '창세기', EXO: '출애굽기', LEV: '레위기', NUM: '민수기',
  DEU: '신명기', JOS: '여호수아', JDG: '사사기', RUT: '룻기',
  '1SA': '사무엘상', '2SA': '사무엘하', '1KI': '열왕기상', '2KI': '열왕기하',
  '1CH': '역대상', '2CH': '역대하', EZR: '에스라', NEH: '느헤미야',
  EST: '에스더', JOB: '욥기', PSA: '시편', PRO: '잠언',
  ECC: '전도서', SNG: '아가', ISA: '이사야', JER: '예레미야',
  LAM: '예레미야애가', EZK: '에스겔', DAN: '다니엘', HOS: '호세아',
  JOL: '요엘', AMO: '아모스', OBA: '오바댜', JON: '요나',
  MIC: '미가', NAM: '나훔', HAB: '하박국', ZEP: '스바냐',
  HAG: '학개', ZEC: '스가랴', MAL: '말라기', MAT: '마태복음',
  MRK: '마가복음', LUK: '누가복음', JHN: '요한복음', ACT: '사도행전',
  ROM: '로마서', '1CO': '고린도전서', '2CO': '고린도후서', GAL: '갈라디아서',
  EPH: '에베소서', PHP: '빌립보서', COL: '골로새서', '1TH': '데살로니가전서',
  '2TH': '데살로니가후서', '1TI': '디모데전서', '2TI': '디모데후서',
  TIT: '디도서', PHM: '빌레몬서', HEB: '히브리서', JAS: '야고보서',
  '1PE': '베드로전서', '2PE': '베드로후서', '1JN': '요한일서',
  '2JN': '요한이서', '3JN': '요한삼서', JUD: '유다서', REV: '요한계시록',
}

interface Props {
  plan: ReadingPlan
  onStartReading: () => void
}

export function TodayPlanCard({ plan, onStartReading }: Props) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const bookName = BOOK_NAMES[plan.book] ?? plan.book

  return (
    <Card style={styles.card}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.primary }]}>오늘의 읽기</Text>
        {plan.isCompleted && (
          <View style={[styles.badge, { backgroundColor: colors.success }]}>
            <Text style={[styles.badgeText, { color: '#fff' }]}>완료</Text>
          </View>
        )}
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {bookName} {plan.chapter}장
      </Text>
      <Text style={[styles.date, { color: colors.textTertiary }]}>{plan.date}</Text>
      {!plan.isCompleted && (
        <Button
          title="읽기 시작"
          onPress={onStartReading}
          variant="primary"
          size="md"
          fullWidth
          style={styles.button}
        />
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing.screenPaddingH,
    marginBottom: theme.spacing.sectionGap,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  label: {
    ...theme.typography.styles.label,
    fontWeight: theme.typography.fontWeight.semiBold,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.spacing.borderRadiusFull,
  },
  badgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semiBold,
  },
  title: {
    ...theme.typography.styles.h2,
    marginBottom: theme.spacing.xs,
  },
  date: {
    ...theme.typography.styles.bodySmall,
    marginBottom: theme.spacing.md,
  },
  button: {
    marginTop: theme.spacing.sm,
  },
})
