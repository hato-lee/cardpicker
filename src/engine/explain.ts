import { RULES } from './rules'

export function isStale(lastChecked: string, today: Date, staleDays: number = RULES.staleDays): boolean {
  const checked = new Date(lastChecked + 'T00:00:00')
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = (todayMidnight.getTime() - checked.getTime()) / 86_400_000
  return diffDays > staleDays
}
