import type { Card, Query } from '../data/types'
import type { Tag } from '../data/tags'
import { RULES, type Rules } from './rules'

export interface Scored {
  card: Card
  score: number
  coveredTags: Tag[]
  isUniversal: boolean
}

export function isUniversalCard(card: Card): boolean {
  return card.universal !== null && card.complexity === 1
}

export function coveredTagsOf(card: Card, tags: Tag[]): Tag[] {
  return tags.filter((t) => card.benefits.some((b) => b.tag === t))
}

function passesFilters(card: Card, q: Query, rules: Rules): boolean {
  if (card.status !== 'active') return false
  if (q.persona === 'carefree' && card.complexity > rules.carefreeMaxComplexity) return false
  if (q.feeLimit !== null && card.annualFee > q.feeLimit) return false
  if (q.monthlySpend < card.minSpend) return false
  if (coveredTagsOf(card, q.tags).length === 0) return false
  return true
}

function baseScore(card: Card, covered: Tag[], rules: Rules): number {
  const w = rules.weight
  const starsSum = card.benefits
    .filter((b) => covered.includes(b.tag))
    .reduce((s, b) => s + b.stars, 0)
  const feeBonus = w.fee * (1 - Math.min(card.annualFee, rules.feeCap) / rules.feeCap)
  const spendBonus = w.minSpend * (1 - Math.min(card.minSpend, rules.spendCap) / rules.spendCap)
  return covered.length * w.coverage + starsSum * w.stars + feeBonus + spendBonus
}

export function recommend(cards: Card[], q: Query, rules: Rules = RULES): Scored[] {
  const mult = rules.personaMultiplier[q.persona]
  return cards
    .filter((c) => passesFilters(c, q, rules))
    .map((card) => {
      const coveredTags = coveredTagsOf(card, q.tags)
      const isUniversal = isUniversalCard(card)
      const score = baseScore(card, coveredTags, rules) * (isUniversal ? mult.universal : mult.area)
      return { card, score, coveredTags, isUniversal }
    })
    .sort((a, b) => b.score - a.score || a.card.annualFee - b.card.annualFee)
    .slice(0, rules.topN)
}
