/**
 * 상대적 날짜 문자열 반환
 * "오늘", "어제", "N일 전", "M월 D일"
 */
export function relativeDate(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const diffMs = todayStart.getTime() - dateStart.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  if (diffDays < 7) return `${diffDays}일 전`

  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}월 ${day}일`
}
