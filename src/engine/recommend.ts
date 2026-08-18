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
  if (card.complexity > rules.personaMaxComplexity[q.persona]) return false
  if (q.feeLimit !== null && card.annualFee > q.feeLimit) return false
  if (q.monthlySpend < card.minSpend) return false
  return true
}

export interface Recommendation {
  items: Scored[]
  /** 무심형인데 고른 영역을 한 장으로 다 커버하는 카드가 없어서, 커버 많은 순으로 풀어서 보여준 경우 */
  relaxed: boolean
}

const coverCount = (s: Scored) => s.coveredTags.length + s.universalCovers.length

/** 연 혜택의 절반 넘게 포인트 적립이면 '포인트형' — 쌓아뒀다 써야 혜택이 되는 카드 */
export function isPointsHeavy(b: AnnualBenefit, rules: Rules = RULES): boolean {
  return b.pointsShare > rules.pointsHeavyShare
}

function byNet(a: Scored, b: Scored): number {
  return b.benefit.annualNet - a.benefit.annualNet ||
    a.card.annualFee - b.card.annualFee ||
    a.card.minSpend - b.card.minSpend
}

/**
 * 연 최대 혜택(연회비 뺀 값)이 큰 순. 동률이면 연회비 낮은 순 → 실적 낮은 순.
 * 무심형은 고른 영역을 한 장으로 다 커버하는 카드만 남기고, 없으면 커버 개수 많은 순으로 푼다.
 */
export function recommendGeneral(cards: Card[], q: Query, rules: Rules = RULES): Recommendation {
  const scored: Scored[] = []
  for (const card of cards) {
    if (!passesFilters(card, q, rules)) continue
    const benefit = annualBenefit(card, q, rules)
    if (benefit === null) continue
    scored.push({ card, benefit, coveredTags: coveredTagsOf(card, q.tags), universalCovers: universalCoversOf(card, q.tags, rules) })
  }
  if (q.persona === 'carefree') {
    // 할인·캐시백형 먼저, 포인트형 뒤 (무심형은 포인트를 안 쓰고 흘려보내기 쉬워서)
    const pointsLast = (a: Scored, b: Scored) =>
      rules.carefreeDiscountFirst ? Number(isPointsHeavy(a.benefit, rules)) - Number(isPointsHeavy(b.benefit, rules)) : 0
    const order = (a: Scored, b: Scored) => pointsLast(a, b) || byNet(a, b)
    if (rules.carefreeFullCoverOnly) {
      const full = scored.filter((s) => coverCount(s) === q.tags.length)
      if (full.length > 0) return { items: full.sort(order).slice(0, rules.topN), relaxed: false }
      return { items: scored.sort((a, b) => coverCount(b) - coverCount(a) || order(a, b)).slice(0, rules.topN), relaxed: true }
    }
    return { items: scored.sort(order).slice(0, rules.topN), relaxed: false }
  }
  return { items: scored.sort(byNet).slice(0, rules.topN), relaxed: false }
}

export function recommend(cards: Card[], q: Query, rules: Rules = RULES): Scored[] {
  return recommendGeneral(cards, q, rules).items
}
