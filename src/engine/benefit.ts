import type { Card, Query, Benefit, BenefitType } from '../data/types'
import type { Tag } from '../data/tags'
import { RULES, type Rules } from './rules'

const UNIVERSAL_TAG: Tag = '모든 가맹점'
const MILEAGE_TAG: Tag = '마일리지'

export interface BenefitRow {
  tag: Tag
  type: BenefitType
  rate: number
  monthlyCap: number | null   // mileage면 마일, 그 밖은 원
  note?: string
  monthlyValue: number        // 원. 상한 조정 후, 성향 반영 전
  requiredSpend: number | null // 한도를 채우는 데 필요한 월 지출(원). 정액은 null
  viaUniversal: boolean       // 고른 태그에 벤핏이 없어 범용으로 대신 계산한 줄
}

export interface AnnualBenefit {
  rows: BenefitRow[]
  monthlyMax: number
  annualGross: number
  annualRealized: number
  annualNet: number
  clampFactor: number
}

function toWon(type: BenefitType, amount: number, rules: Rules): number {
  return type === 'mileage' ? amount * rules.mileWon : amount
}

/** 한 벤핏(또는 범용)의 월 최대 혜택과 필요 지출. 스펙 1번. */
function makeRow(
  b: { tag: Tag; type: BenefitType; rate: number; monthlyCap: number | null; note?: string },
  spend: number,
  viaUniversal: boolean,
  rules: Rules,
): BenefitRow {
  const r = b.rate / 100
  let monthlyValue: number
  let requiredSpend: number | null
  if (b.rate === 0) {
    monthlyValue = toWon(b.type, b.monthlyCap ?? 0, rules)
    requiredSpend = null
  } else if (b.monthlyCap === null) {
    monthlyValue = toWon(b.type, spend * r, rules)
    requiredSpend = spend
  } else {
    monthlyValue = toWon(b.type, b.monthlyCap, rules)
    requiredSpend = b.monthlyCap / r
  }
  return { tag: b.tag, type: b.type, rate: b.rate, monthlyCap: b.monthlyCap, note: b.note, monthlyValue, requiredSpend, viaUniversal }
}

export function annualBenefit(card: Card, q: Query, rules: Rules = RULES): AnnualBenefit | null {
  const S = q.monthlySpend
  const rows: BenefitRow[] = []
  let uncovered = false
  for (const tag of q.tags) {
    const b: Benefit | undefined = card.benefits.find((x) => x.tag === tag)
    if (b) rows.push(makeRow(b, S, false, rules))
    else uncovered = true
  }
  if (uncovered && card.universal !== null && !q.tags.includes(UNIVERSAL_TAG)) {
    rows.push(makeRow({ tag: UNIVERSAL_TAG, ...card.universal }, S, true, rules))
  }
  // 전 가맹점 마일리지 카드: '마일리지'와 '모든 가맹점'이 같은 적립이면 하나만
  const hasMileageRow = rows.some((x) => x.tag === MILEAGE_TAG && x.type === 'mileage')
  const deduped = hasMileageRow ? rows.filter((x) => !(x.tag === UNIVERSAL_TAG && x.type === 'mileage')) : rows
  if (deduped.length === 0) return null

  // 총액 기준 상한 (스펙 2번)
  const R = deduped.reduce((s, x) => s + (x.requiredSpend ?? 0), 0)
  const clampFactor = R > S ? S / R : 1
  const finalRows = deduped.map((x) => (x.requiredSpend === null ? x : { ...x, monthlyValue: x.monthlyValue * clampFactor }))

  const monthlyMax = finalRows.reduce((s, x) => s + x.monthlyValue, 0)
  const annualGross = monthlyMax * 12
  const annualRealized = annualGross * rules.personaRealization[q.persona]
  const annualNet = Math.round(annualRealized - card.annualFee)
  return { rows: finalRows, monthlyMax, annualGross, annualRealized, annualNet, clampFactor }
}
