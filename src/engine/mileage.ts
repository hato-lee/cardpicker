import type { Card, Query, Benefit, Tier } from '../data/types'
import { RULES, type Rules } from './rules'
import { resolveTier } from './benefit'
import { nextTierText } from './explain'
import { won, rateText, capValueText } from '../ui/format'

/**
 * 마일리지 전용 트랙. '마일리지'만 골랐을 때 쓴다. 원 환산·성향 없이 마일 수로 순위를 매긴다.
 * 스펙: docs/superpowers/specs/2026-08-18-mileage-track-design.md
 */
export interface MileScored {
  card: Card
  rate: number
  monthlyCap: number | null
  nextTier?: Tier
  monthlyMiles: number
  annualMiles: number
  feePerMile: number | null
  extras: Benefit[]
}

const MILEAGE_TAG = '마일리지'
const UNIVERSAL_TAG = '모든 가맹점'

/** '마일리지'만 골랐으면 마일리지 트랙 */
export function isMileageQuery(q: Pick<Query, 'tags'>): boolean {
  return q.tags.length === 1 && q.tags[0] === MILEAGE_TAG
}

function baseEarn(card: Card): { rate: number; monthlyCap: number | null; tiers?: Tier[] } | null {
  const b = card.benefits.find((x) => x.tag === MILEAGE_TAG && x.type === 'mileage')
  if (b) return b
  if (card.universal?.type === 'mileage') return card.universal
  return null
}

export function scoreMileage(card: Card, q: Query): MileScored | null {
  const earn = baseEarn(card)
  if (!earn) return null
  const S = q.monthlySpend
  const t = resolveTier(earn, S)
  const raw = (S * t.rate) / 100
  const monthlyMiles = t.monthlyCap === null ? raw : Math.min(raw, t.monthlyCap)
  const annualMiles = Math.round(monthlyMiles * 12)
  const feePerMile = annualMiles > 0 ? card.annualFee / annualMiles : null
  const extras = card.benefits.filter((b) => b.tag !== MILEAGE_TAG && b.tag !== UNIVERSAL_TAG)
  return { card, rate: t.rate, monthlyCap: t.monthlyCap, nextTier: t.nextTier, monthlyMiles, annualMiles, feePerMile, extras }
}

/** 연 마일 큰 순 → 연회비 낮은 순 → 실적 낮은 순. 성향은 쓰지 않는다. */
export function recommendMileage(cards: Card[], q: Query, rules: Rules = RULES): MileScored[] {
  const out: MileScored[] = []
  for (const card of cards) {
    if (card.status !== 'active') continue
    if (q.feeLimit !== null && card.annualFee > q.feeLimit) continue
    if (q.monthlySpend < card.minSpend) continue
    const s = scoreMileage(card, q)
    if (s) out.push(s)
  }
  return out
    .sort((a, b) => b.annualMiles - a.annualMiles || a.card.annualFee - b.card.annualFee || a.card.minSpend - b.card.minSpend)
    .slice(0, rules.topN)
}

/** "이렇게 쓰면 최대" 한 줄 (마일 단위). */
export function mileageTip(r: MileScored): string {
  const main = r.monthlyCap === null
    ? `쓰는 만큼 ${rateText('mileage', r.rate)} — 한도 없음`
    : `월 ${won(Math.round(r.monthlyCap / (r.rate / 100)))} 이상 쓰면 한도(${capValueText('mileage', r.monthlyCap)})를 꽉 채워요`
  const hint = r.nextTier ? nextTierText({ type: 'mileage', rate: r.rate, monthlyCap: r.monthlyCap }, r.nextTier) : ''
  return hint ? `${main} ${hint}` : main
}
