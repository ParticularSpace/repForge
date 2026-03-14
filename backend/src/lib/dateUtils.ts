/** Returns Monday 00:00:00 of the current week (week starts on Monday). */
export function getWeekStart(): Date {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon … 6=Sat
  const daysFromMonday = day === 0 ? 6 : day - 1
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - daysFromMonday)
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}
