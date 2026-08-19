import type { Card, Query, Benefit, Tier, MileageBonus } from '../data/types'
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
  baseAnnualMiles: number   // 적립만 ×12
  bonusMiles: number        // 연간 보너스(2차년도 조건 충족 시), 아니면 0
  firstYearBonus: boolean   // 첫해 조건은 충족하는지 (안내용, 순위엔 안 씀)
  annualMiles: number       // baseAnnualMiles + bonusMiles. 순위 기준
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
  const baseAnnualMiles = Math.round(monthlyMiles * 12)
  const annualSpend = S * 12
  const bonus = card.mileageBonus
  const bonusMiles = bonus && annualSpend >= bonus.minAnnualSpend ? bonus.miles : 0
  const firstYearBonus = !!bonus && annualSpend >= (bonus.firstYearMinSpend ?? bonus.minAnnualSpend)
  const annualMiles = baseAnnualMiles + bonusMiles
  const feePerMile = annualMiles > 0 ? card.annualFee / annualMiles : null
  const extras = card.benefits.filter((b) => b.tag !== MILEAGE_TAG && b.tag !== UNIVERSAL_TAG)
  return { card, rate: t.rate, monthlyCap: t.monthlyCap, nextTier: t.nextTier, monthlyMiles, baseAnnualMiles, bonusMiles, firstYearBonus, annualMiles, feePerMile, extras }
}

/** 후보 전부를 연 마일 큰 순 → 연회비 낮은 순 → 실적 낮은 순으로. 성향은 복잡도 필터에만 쓴다. */
function rankMileage(cards: Card[], q: Query, rules: Rules): MileScored[] {
  const out: MileScored[] = []
  for (const card of cards) {
    if (card.status !== 'active') continue
    if (card.complexity > rules.personaMaxComplexity[q.persona]) continue
    if (q.feeLimit !== null && card.annualFee > q.feeLimit) continue
    if (q.monthlySpend < card.minSpend) continue
    const s = scoreMileage(card, q)
    if (s) out.push(s)
  }
  return out.sort((a, b) => b.annualMiles - a.annualMiles || a.card.annualFee - b.card.annualFee || a.card.minSpend - b.card.minSpend)
}

export function recommendMileage(cards: Card[], q: Query, rules: Rules = RULES): MileScored[] {
  return rankMileage(cards, q, rules).slice(0, rules.topN)
}

export interface MileageResults {
  /** 가장 많이 쌓이는 순 TOP N (연회비 한도 안에서) */
  top: MileScored[]
  /**
   * "연회비 부담 없이 시작하려면" 힌트용 — 연회비가 프리미엄 기준 미만인 카드 중 1등.
   * 1위가 이미 그런 카드면 힌트가 필요 없으니 null.
   */
  lightPick: MileScored | null
}

/** 마일리지 트랙 결과: 한 줄 TOP N + 가벼운 카드 힌트 하나. */
export function mileageResults(cards: Card[], q: Query, rules: Rules = RULES): MileageResults {
  const ranked = rankMileage(cards, q, rules)
  const top = ranked.slice(0, rules.topN)
  const isLight = (r: MileScored) => r.card.annualFee < rules.mileagePremiumFee
  const lightPick = top.length > 0 && !isLight(top[0]) ? ranked.find(isLight) ?? null : null
  return { top, lightPick }
}

/** "이렇게 쓰면 최대" 한 줄 (마일 단위). */
export function mileageTip(r: MileScored): string {
  const main = r.monthlyCap === null
    ? `쓰는 만큼 ${rateText('mileage', r.rate)} 쌓여요 — 한도 없어요`
    : `월 ${won(Math.round(r.monthlyCap / (r.rate / 100)))} 이상 쓰면 한도(${capValueText('mileage', r.monthlyCap)})를 꽉 채워요`
  const hint = r.nextTier ? nextTierText({ type: 'mileage', rate: r.rate, monthlyCap: r.monthlyCap }, r.nextTier) : ''
  return hint ? `${main} ${hint}` : main
}

/** "보너스 30,000마일 — 첫해는 100만 원만 써도, 그 뒤엔 1년에 3,600만 원 이상 쓸 때 받아요" */
export function bonusText(b: MileageBonus): string {
  const head = `보너스 ${b.miles.toLocaleString('ko-KR')}마일 — `
  if (b.minAnnualSpend === 0 && b.firstYearMinSpend === undefined) return head + '조건 없이 해마다 받아요'
  const later = `1년에 ${won(b.minAnnualSpend)} 이상 쓸 때 받아요`
  if (b.firstYearMinSpend === undefined) return head + later
  return head + `첫해는 ${won(b.firstYearMinSpend)}만 써도, 그 뒤엔 ${later}`
}
