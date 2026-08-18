import type { Card, Query } from '../data/types'
import type { Tag } from '../data/tags'
import { RULES, type Rules } from './rules'
import { annualBenefit, universalCanCover, type AnnualBenefit } from './benefit'

export interface Scored {
  card: Card
  benefit: AnnualBenefit
  /** 고른 태그 중 카드 벤핏으로 직접 커버되는 태그 */
  coveredTags: Tag[]
  /** 고른 태그 중 벤핏은 없지만 범용(universal)으로 커버되는 태그 */
  universalCovers: Tag[]
}

export function coveredTagsOf(card: Card, tags: Tag[]): Tag[] {
  return tags.filter((t) => card.benefits.some((b) => b.tag === t))
}

export function universalCoversOf(card: Card, tags: Tag[], rules: Rules = RULES): Tag[] {
  if (card.universal === null) return []
  const covered = coveredTagsOf(card, tags)
  return tags.filter((t) => !covered.includes(t) && universalCanCover(card, t, rules))
}

function passesFilters(card: Card, q: Query, rules: Rules): boolean {
  if (card.status !== 'active') return false
  if (q.persona === 'carefree' && card.complexity > rules.carefreeMaxComplexity) return false
  if (q.feeLimit !== null && card.annualFee > q.feeLimit) return false
  if (q.monthlySpend < card.minSpend) return false
  return true
}

/** 연 최대 혜택(연회비 뺀 값)이 큰 순. 동률이면 연회비 낮은 순 → 실적 낮은 순. */
export function recommend(cards: Card[], q: Query, rules: Rules = RULES): Scored[] {
  const scored: Scored[] = []
  for (const card of cards) {
    if (!passesFilters(card, q, rules)) continue
    const benefit = annualBenefit(card, q, rules)
    if (benefit === null) continue
    scored.push({ card, benefit, coveredTags: coveredTagsOf(card, q.tags), universalCovers: universalCoversOf(card, q.tags, rules) })
  }
  return scored
    .sort((a, b) =>
      b.benefit.annualNet - a.benefit.annualNet ||
      a.card.annualFee - b.card.annualFee ||
      a.card.minSpend - b.card.minSpend)
    .slice(0, rules.topN)
}
