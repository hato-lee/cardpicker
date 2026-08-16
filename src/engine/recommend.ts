import type { Card, Query } from '../data/types'
import type { Tag } from '../data/tags'
import { RULES, type Rules } from './rules'

export interface Scored {
  card: Card
  score: number
  /** 고른 태그 중 카드 벤핏으로 직접 커버되는 태그 */
  coveredTags: Tag[]
  /** 고른 태그 중 벤핏은 없지만 범용(universal) 적립·할인으로 커버되는 태그 */
  universalCovers: Tag[]
  isUniversal: boolean
}

const UNIVERSAL_TAG = '모든 가맹점'

export function isUniversalCard(card: Card): boolean {
  return card.universal !== null && card.complexity === 1
}

export function coveredTagsOf(card: Card, tags: Tag[]): Tag[] {
  return tags.filter((t) => card.benefits.some((b) => b.tag === t))
}

/** 벤핏에 없는 고른 태그들. 범용 카드면 범용 적립·할인이 대신 커버한다. */
export function universalCoversOf(card: Card, tags: Tag[]): Tag[] {
  if (card.universal === null) return []
  const covered = coveredTagsOf(card, tags)
  return tags.filter((t) => !covered.includes(t))
}

function universalStarsOf(card: Card): number {
  return card.benefits.find((b) => b.tag === UNIVERSAL_TAG)?.stars ?? 0
}

function passesFilters(card: Card, q: Query, rules: Rules): boolean {
  if (card.status !== 'active') return false
  if (q.persona === 'carefree' && card.complexity > rules.carefreeMaxComplexity) return false
  if (q.feeLimit !== null && card.annualFee > q.feeLimit) return false
  if (q.monthlySpend < card.minSpend) return false
  // 범용 카드는 어떤 태그든 어느 정도 커버하므로 남긴다
  if (coveredTagsOf(card, q.tags).length === 0 && card.universal === null) return false
  return true
}

function baseScore(card: Card, covered: Tag[], universalCovers: Tag[], rules: Rules): number {
  const w = rules.weight
  const starsSum = card.benefits
    .filter((b) => covered.includes(b.tag))
    .reduce((s, b) => s + b.stars, 0)
  // 범용으로 커버되는 태그가 있으면 '모든 가맹점' 벤핏의 ★을 한 번만 더한다
  const universalStars = universalCovers.length > 0 ? universalStarsOf(card) : 0
  const feeBonus = w.fee * (1 - Math.min(card.annualFee, rules.feeCap) / rules.feeCap)
  const spendBonus = w.minSpend * (1 - Math.min(card.minSpend, rules.spendCap) / rules.spendCap)
  return (
    covered.length * w.coverage +
    universalCovers.length * w.universalCoverage +
    starsSum * w.stars +
    universalStars * w.stars +
    feeBonus +
    spendBonus
  )
}

export function recommend(cards: Card[], q: Query, rules: Rules = RULES): Scored[] {
  const mult = rules.personaMultiplier[q.persona]
  return cards
    .filter((c) => passesFilters(c, q, rules))
    .map((card) => {
      const coveredTags = coveredTagsOf(card, q.tags)
      const universalCovers = universalCoversOf(card, q.tags)
      const isUniversal = isUniversalCard(card)
      const score = baseScore(card, coveredTags, universalCovers, rules) * (isUniversal ? mult.universal : mult.area)
      return { card, score, coveredTags, universalCovers, isUniversal }
    })
    .sort((a, b) => b.score - a.score || a.card.annualFee - b.card.annualFee)
    .slice(0, rules.topN)
}
