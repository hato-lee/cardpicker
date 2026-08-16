import type { Scored } from './recommend'
import type { BenefitType } from '../data/types'
import type { Tag } from '../data/tags'
import { RULES } from './rules'
import { won } from '../ui/format'

const UNIVERSAL_TAG = '모든 가맹점'

export function reasonLine(s: Scored, pickedCount: number): string {
  const coveredCount = s.coveredTags.length + s.universalCovers.length
  const parts: string[] = [`고른 ${pickedCount}개 중 ${coveredCount}개 커버`]
  for (const tag of s.coveredTags) {
    const b = s.card.benefits.find((x) => x.tag === tag)
    if (b) parts.push(`${tag} ${'★'.repeat(b.stars)}`)
  }
  const uni = s.card.benefits.find((x) => x.tag === UNIVERSAL_TAG)
  if (s.universalCovers.length > 0 && uni) {
    parts.push(`그 외 ${s.universalCovers.length}개는 ${UNIVERSAL_TAG} ${'★'.repeat(uni.stars)}`)
  }
  parts.push(`연회비 ${won(s.card.annualFee)}`)
  parts.push(s.card.minSpend === 0 ? '실적 없음' : `실적 ${won(s.card.minSpend)}`)
  return parts.join(' · ')
}

export interface MaxBenefitRow {
  tag: Tag
  rate: number
  type: BenefitType
  monthlyMax: number | null
  requiredSpend: number | null
}

export interface MaxBenefitTable {
  rows: MaxBenefitRow[]
  monthlyTotal: number
  annualTotal: number
  annualNet: number
  hasUncapped: boolean
}

export function maxBenefitTable(s: Scored): MaxBenefitTable {
  const rows: MaxBenefitRow[] = []
  const addRow = (tag: Tag) => {
    const b = s.card.benefits.find((x) => x.tag === tag)
    if (!b) return
    const monthlyMax = b.monthlyCap
    const requiredSpend = b.monthlyCap !== null && b.rate > 0 ? Math.round(b.monthlyCap / (b.rate / 100)) : null
    rows.push({ tag, rate: b.rate, type: b.type, monthlyMax, requiredSpend })
  }
  for (const tag of s.coveredTags) addRow(tag)
  // 범용으로만 커버되는 태그가 있으면 '모든 가맹점' 줄을 한 번 붙인다
  if (s.universalCovers.length > 0 && !s.coveredTags.includes(UNIVERSAL_TAG)) addRow(UNIVERSAL_TAG)
  // 마일리지 한도는 '마일' 단위라 원 단위 합계에 넣지 않는다
  const monthlyTotal = rows
    .filter((r) => r.type !== 'mileage')
    .reduce((sum, r) => sum + (r.monthlyMax ?? 0), 0)
  const annualTotal = monthlyTotal * 12
  return {
    rows,
    monthlyTotal,
    annualTotal,
    annualNet: annualTotal - s.card.annualFee,
    hasUncapped: rows.some((r) => r.monthlyMax === null),
  }
}

export function isStale(lastChecked: string, today: Date, staleDays: number = RULES.staleDays): boolean {
  const checked = new Date(lastChecked + 'T00:00:00')
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = (todayMidnight.getTime() - checked.getTime()) / 86_400_000
  return diffDays > staleDays
}
