import type { Card, Query, Benefit, BenefitType, Tier } from '../data/types'
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
  capGroup?: string
  monthlyValue: number        // 원. 상한 조정 후, 성향 반영 전
  requiredSpend: number | null // 한도를 채우는 데 필요한 월 지출(원). 정액은 null
  viaUniversal: boolean       // 고른 태그에 벤핏이 없어 범용으로 대신 계산한 줄
  assumedCap: boolean         // 한도 정보가 없어 가정 한도(RULES.assumedCapWhenUnknown)로 계산했는지
  nextTier?: Tier   // 적용 구간 바로 위 구간(있으면). 설명 문구용
}

export interface AnnualBenefit {
  rows: BenefitRow[]
  monthlyMax: number
  annualGross: number
  annualNet: number
  clampFactor: number
  pointsShare: number   // 월 혜택 중 포인트 적립 줄이 차지하는 비율(0~1). 포인트형 표시·무심형 정렬용
}

function toWon(type: BenefitType, amount: number, rules: Rules): number {
  return type === 'mileage' ? amount * rules.mileWon : amount
}

/** 사용액 S에 맞는 실적 구간을 고른다. tiers 중 minSpend ≤ S인 마지막 구간, 없으면 기본값. */
export function resolveTier(
  b: { rate: number; monthlyCap: number | null; tiers?: Tier[] },
  spend: number,
): { rate: number; monthlyCap: number | null; nextTier?: Tier } {
  const tiers = b.tiers ?? []
  let idx = -1
  for (let i = 0; i < tiers.length; i++) if (tiers[i].minSpend <= spend) idx = i
  const applied = idx >= 0 ? tiers[idx] : undefined
  return {
    rate: applied?.rate ?? b.rate,
    monthlyCap: applied ? applied.monthlyCap : b.monthlyCap,
    nextTier: tiers[idx + 1],
  }
}

/** 한 벤핏(또는 범용)의 월 최대 혜택과 필요 지출. 스펙 1번. */
function makeRow(
  b: { tag: Tag; type: BenefitType; rate: number; monthlyCap: number | null; note?: string; capGroup?: string; tiers?: Tier[] },
  spend: number,
  viaUniversal: boolean,
  rules: Rules,
): BenefitRow {
  const t = resolveTier(b, spend)
  const rate = t.rate
  const cap = t.monthlyCap
  const r = rate / 100
  let monthlyValue: number
  let requiredSpend: number | null
  let assumedCap = false
  if (rate === 0) {
    monthlyValue = toWon(b.type, cap ?? 0, rules)
    requiredSpend = null
  } else if (cap === null) {
    if (!viaUniversal && b.tag !== UNIVERSAL_TAG && b.type !== 'mileage') {
      monthlyValue = Math.min(spend * r, rules.assumedCapWhenUnknown)
      requiredSpend = Math.min(spend, rules.assumedCapWhenUnknown / r)
      assumedCap = spend * r > rules.assumedCapWhenUnknown
    } else {
      monthlyValue = toWon(b.type, spend * r, rules)
      requiredSpend = spend
    }
  } else {
    monthlyValue = toWon(b.type, cap, rules)
    requiredSpend = cap / r
  }
  return { tag: b.tag, type: b.type, rate, monthlyCap: cap, note: b.note, capGroup: b.capGroup, monthlyValue, requiredSpend, viaUniversal, assumedCap, nextTier: t.nextTier }
}

/**
 * 같은 capGroup 줄들의 monthlyValue 합이 그룹 한도(monthlyCap, mileage면 ×mileWon)를 넘으면 비례 축소.
 * requiredSpend도 같은 비율로 줄인다 — 안 줄이면 아래 총액 상한(clampFactor)에 한 번 더 걸려 두 번 깎이고,
 * 그 결과 "태그를 하나 더 고르면 카드 가치가 절반이 되는" 역전이 생긴다.
 * 요율이 같은 그룹에서는 이 값이 정확하다: 한도 L을 요율 r로 채우는 데 드는 지출은 L/r인데,
 * 축소 전에는 줄 수만큼(n×L/r) 부풀어 있기 때문이다.
 */
function applyCapGroups(rows: BenefitRow[], rules: Rules): BenefitRow[] {
  const groups = new Map<string, BenefitRow[]>()
  for (const r of rows) {
    if (!r.capGroup) continue
    const arr = groups.get(r.capGroup) ?? []
    arr.push(r)
    groups.set(r.capGroup, arr)
  }
  let result = rows
  for (const [, groupRows] of groups) {
    if (groupRows.length < 2) continue
    const limit = toWon(groupRows[0].type, groupRows[0].monthlyCap ?? 0, rules)
    const sum = groupRows.reduce((s, x) => s + x.monthlyValue, 0)
    if (sum > limit && sum > 0) {
      const factor = limit / sum
      const scaled = new Set(groupRows)
      result = result.map((x) =>
        scaled.has(x)
          ? { ...x, monthlyValue: x.monthlyValue * factor, requiredSpend: x.requiredSpend === null ? null : x.requiredSpend * factor }
          : x,
      )
    }
  }
  return result
}

/** 범용(universal)이 이 태그를 대신 채울 수 있는가. '마일리지'는 마일리지형 범용만 (RULES.mileageTagOnlyByMileage) */
export function universalCanCover(card: Card, tag: Tag, rules: Rules = RULES): boolean {
  if (card.universal === null) return false
  if (rules.mileageTagOnlyByMileage && tag === MILEAGE_TAG) return card.universal.type === 'mileage'
  return true
}

export function annualBenefit(card: Card, q: Query, rules: Rules = RULES): AnnualBenefit | null {
  const S = q.monthlySpend
  const rows: BenefitRow[] = []
  let uncovered = false
  // '마일리지'를 안 골랐으면 마일 적립 혜택은 세지 않는다 (RULES.mileageOnlyWhenPicked)
  const skipMileage = rules.mileageOnlyWhenPicked && !q.tags.includes(MILEAGE_TAG)
  const universalUsable = card.universal !== null && !(skipMileage && card.universal.type === 'mileage')
  for (const tag of q.tags) {
    const b: Benefit | undefined = card.benefits.find((x) => x.tag === tag)
    if (b && !(skipMileage && b.type === 'mileage')) rows.push(makeRow(b, S, false, rules))
    else if (universalCanCover(card, tag, rules)) uncovered = true
  }
  if (uncovered && universalUsable && !q.tags.includes(UNIVERSAL_TAG)) {
    rows.push(makeRow({ tag: UNIVERSAL_TAG, ...card.universal! }, S, true, rules))
  }
  // 전 가맹점 마일리지 카드: '마일리지'와 '모든 가맹점'이 같은 적립이면 하나만
  const hasMileageRow = rows.some((x) => x.tag === MILEAGE_TAG && x.type === 'mileage')
  const deduped = hasMileageRow ? rows.filter((x) => !(x.tag === UNIVERSAL_TAG && x.type === 'mileage')) : rows
  if (deduped.length === 0) return null

  // 통합(공유) 월 한도: 같은 capGroup 줄들의 합이 그룹 한도를 넘으면 비례 축소
  const grouped = applyCapGroups(deduped, rules)

  // 총액 기준 상한 (스펙 2번)
  const R = grouped.reduce((s, x) => s + (x.requiredSpend ?? 0), 0)
  const clampFactor = R > S ? S / R : 1
  const finalRows = grouped.map((x) => (x.requiredSpend === null ? x : { ...x, monthlyValue: x.monthlyValue * clampFactor }))

  const monthlyMax = finalRows.reduce((s, x) => s + x.monthlyValue, 0)
  const annualGross = monthlyMax * 12
  const annualNet = Math.round(annualGross - card.annualFee)
  const pointsValue = finalRows.filter((x) => x.type === 'points').reduce((s, x) => s + x.monthlyValue, 0)
  const pointsShare = monthlyMax > 0 ? pointsValue / monthlyMax : 0
  return { rows: finalRows, monthlyMax, annualGross, annualNet, clampFactor, pointsShare }
}
