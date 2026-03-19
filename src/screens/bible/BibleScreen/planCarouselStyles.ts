import { StyleSheet } from 'react-native'
import { theme } from 'src/theme'

export const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    marginBottom: theme.spacing.sectionGap,
    overflow: 'hidden',
  },
  track: { flexDirection: 'row' },
  card: {
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 24,
    minHeight: 450,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.06,
    shadowRadius: 45,
    elevation: 8,
  },
  cardLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  cardLabel: {
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
  cardTitle: { ...theme.typography.styles.h2, marginBottom: theme.spacing.xs },
  cardDate: { ...theme.typography.styles.bodySmall, marginBottom: theme.spacing.md },
  verseScroll: { flex: 1, marginBottom: theme.spacing.sm },
  versePlaceholder: { ...theme.typography.styles.body, lineHeight: 26 },
  cardSub: { ...theme.typography.styles.bodySmall, marginTop: theme.spacing.sm },
  cardButton: { marginTop: theme.spacing.sm },
  weekDots: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  weekDot: { width: 20, height: 20, borderRadius: 10 },
  progressTrack: {
    height: 8,
    borderRadius: theme.spacing.borderRadiusFull,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
  },
  progressFill: { height: '100%', borderRadius: theme.spacing.borderRadiusFull },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
})
