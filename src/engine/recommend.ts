import type { Card, KpassInput, Query } from '../data/types'
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
  if (q.kpass && !card.kpass) return false
  return true
}

/**
 * K-패스(모두의카드) 월 환급액 = 교통비 × 그룹 요율 (기본형 정률, 최소치).
 * 카드사 혜택과 별개라 순위엔 영향 없고, 큰 숫자에 더해서 보여준다.
 */
export function kpassMonthlyRefund(k: KpassInput, rules: Rules = RULES): number {
  return Math.round(Math.max(0, k.transitSpend) * rules.kpassRate[k.group])
}

export function kpassAnnualRefund(k: KpassInput, rules: Rules = RULES): number {
  return kpassMonthlyRefund(k, rules) * 12
}

export interface Recommendation {
  items: Scored[]
  /** 무심형인데 고른 영역을 한 장으로 다 커버하는 카드가 없어서, 커버 많은 순으로 풀어서 보여준 경우 */
  relaxed: boolean
}

const coverCount = (s: Scored) => s.coveredTags.length + s.universalCovers.length

/** 연 혜택의 절반 넘게 포인트 적립이면 '포인트형' */
export function isPointsHeavy(b: AnnualBenefit, rules: Rules = RULES): boolean {
  return b.pointsShare > rules.pointsHeavyShare
}

/** 포인트형인데 현금처럼 쓰는 포인트가 아니면(써야 하거나, 쓰는 곳이 정해져 있거나, 모르면) '손 가는 포인트' */
export function isHardPoints(s: Pick<Scored, 'card' | 'benefit'>, rules: Rules = RULES): boolean {
  return isPointsHeavy(s.benefit, rules) && s.card.pointsEase !== 'cash'
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
  // 빠른 길: 고른 태그의 절반 이상(올림)을 전용 혜택으로 커버해야 '상황에 맞는 카드'.
  // 아무 카드도 못 채우면 커버 많은 순으로 풀어서 보여준다(relaxed).
  let pool = scored
  let coverRelaxed = false
  if (q.requireCover && q.tags.length > 0) {
    const need = Math.ceil(q.tags.length / 2)
    const fit = scored.filter((s) => s.coveredTags.length >= need)
    if (fit.length > 0) pool = fit
    else coverRelaxed = true
  }
  if (q.persona === 'carefree') {
    // 할인·캐시백형 먼저, 포인트형 뒤 (무심형은 포인트를 안 쓰고 흘려보내기 쉬워서)
    const pointsLast = (a: Scored, b: Scored) =>
      rules.carefreeDiscountFirst ? Number(isHardPoints(a, rules)) - Number(isHardPoints(b, rules)) : 0
    const order = (a: Scored, b: Scored) => pointsLast(a, b) || byNet(a, b)
    if (rules.carefreeFullCoverOnly) {
      const full = pool.filter((s) => coverCount(s) === q.tags.length)
      if (full.length > 0) return { items: full.sort(order).slice(0, rules.topN), relaxed: false }
      return { items: pool.sort((a, b) => coverCount(b) - coverCount(a) || order(a, b)).slice(0, rules.topN), relaxed: true }
    }
    return { items: pool.sort(order).slice(0, rules.topN), relaxed: coverRelaxed }
  }
  // 빠른 길: 상황을 통째로 담는(태그를 다 커버하는) 카드가 먼저, 그 안에서 금액 순.
  // 태그 하나가 빠지면 금액이 커도 아래로 내려간다.
  const finalOrder = q.requireCover
    ? (a: Scored, b: Scored) => coverCount(b) - coverCount(a) || byNet(a, b)
    : byNet
  return { items: pool.sort(finalOrder).slice(0, rules.topN), relaxed: coverRelaxed }
}

export function recommend(cards: Card[], q: Query, rules: Rules = RULES): Scored[] {
  return recommendGeneral(cards, q, rules).items
}
