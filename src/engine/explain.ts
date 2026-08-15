import type { Scored } from './recommend'
import type { BenefitType } from '../data/types'
import type { Tag } from '../data/tags'
import { RULES } from './rules'
import { won } from '../ui/format'

export function reasonLine(s: Scored, pickedCount: number): string {
  const parts: string[] = [`고른 ${pickedCount}개 중 ${s.coveredTags.length}개 커버`]
  for (const tag of s.coveredTags) {
    const b = s.card.benefits.find((x) => x.tag === tag)
    if (b) parts.push(`${tag} ${'★'.repeat(b.stars)}`)
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
  for (const tag of s.coveredTags) {
    const b = s.card.benefits.find((x) => x.tag === tag)
    if (!b) continue
    const monthlyMax = b.monthlyCap
    const requiredSpend = b.monthlyCap !== null && b.rate > 0 ? Math.round(b.monthlyCap / (b.rate / 100)) : null
    rows.push({ tag, rate: b.rate, type: b.type, monthlyMax, requiredSpend })
  }
  const monthlyTotal = rows.reduce((sum, r) => sum + (r.monthlyMax ?? 0), 0)
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
  const diffDays = (today.getTime() - checked.getTime()) / 86_400_000
  return diffDays > staleDays
}
