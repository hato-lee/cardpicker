import type { Card, Query, Benefit, BenefitType, Tier } from '../data/types'
import type { Tag } from '../data/tags'
import { RULES, type Rules } from './rules'

const UNIVERSAL_TAG: Tag = '모든 가맹점'
const MILEAGE_TAG: Tag = '마일리지'

export interface BenefitRow {
  tag: Tag
  type: BenefitType
  rate: number
  /** 카드가 내건 이름값 한도. 통합 한도(capGroup) 계산이 고른 태그 순서에 흔들리지 않도록 건당 축소 전 값을 유지한다 */
  monthlyCap: number | null   // mileage면 마일, 그 밖은 원
  /** 건당·횟수 조건까지 반영해 실제로 받을 수 있는 월 한도. 조건이 없으면 monthlyCap과 같다 */
  effectiveCap: number | null
  note?: string
  capGroup?: string
  sharedCapGroup?: string
  useGroup?: string
  /** 1회 결제로 받는 혜택(useGroup 축소용). 건당 계산이 안 되면 null */
  perTxValue: number | null
  monthlyValue: number        // 원. 상한 조정 후, 성향 반영 전
  requiredSpend: number | null // 한도를 채우는 데 필요한 월 지출(원). 정액은 null
  viaUniversal: boolean       // 고른 태그에 벤핏이 없어 범용으로 대신 계산한 줄
  assumedCap: boolean         // 한도 정보가 없어 가정 한도(RULES.assumedCapWhenUnknown)로 계산했는지
  txnLimited: boolean         // 건당·횟수 조건 때문에 한도가 이름값보다 줄었는지(설명 문구용)
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
  b: { rate: number; monthlyCap: number | null; tiers?: Tier[]; maxUsesPerMonth?: number; perUseCap?: number },
  spend: number,
): { rate: number; monthlyCap: number | null; maxUsesPerMonth?: number; perUseCap?: number; nextTier?: Tier } {
  const tiers = b.tiers ?? []
  let idx = -1
  for (let i = 0; i < tiers.length; i++) if (tiers[i].minSpend <= spend) idx = i
  const applied = idx >= 0 ? tiers[idx] : undefined
  return {
    rate: applied?.rate ?? b.rate,
    monthlyCap: applied ? applied.monthlyCap : b.monthlyCap,
    // 구간이 값을 안 적었으면 혜택 본문 값을 물려받는다
    maxUsesPerMonth: applied?.maxUsesPerMonth ?? b.maxUsesPerMonth,
    perUseCap: applied?.perUseCap ?? b.perUseCap,
    nextTier: tiers[idx + 1],
  }
}

/**
 * 1회 결제로 받는 혜택. "건당 1만원 이상 · 1회 2천원까지"면 min(1만원 × 요율, 2천원).
 * 건당 결제금액은 max(태그 기준값, minPerTx)로 잡는다 — 조건을 만족하는 결제는 정의상 minPerTx 이상이므로.
 * 기준값도 minPerTx도 없으면 건당 금액을 모르는 것이라 null(축소 안 함).
 */
function perTxValueOf(
  b: { tag: Tag; minPerTx?: number },
  t: { rate: number; perUseCap?: number },
  rules: Rules,
): number | null {
  if (t.rate <= 0) return null   // 정액 줄은 rate로 건당 혜택을 못 구한다
  const size = Math.max(rules.txnSize[b.tag] ?? 0, b.minPerTx ?? 0)
  if (size <= 0) return t.perUseCap ?? null
  const byRate = (size * t.rate) / 100
  return t.perUseCap === undefined ? byRate : Math.min(byRate, t.perUseCap)
}

/**
 * 건당·횟수 조건까지 반영한 실제 월 한도. **이름값 한도보다 커지는 일은 없다.**
 * 횟수 제한이 없으면 건수를 늘려 한도를 채울 수 있으므로 월 총액이 줄지 않는다 — 그때는 이름값 그대로다.
 * (횟수를 나눠 쓰는 useGroup 줄은 여기서 안 줄이고 applyUseGroups가 묶어서 줄인다.)
 */
export function effectiveCapOf(
  b: { tag: Tag; minPerTx?: number; useGroup?: string },
  t: { rate: number; monthlyCap: number | null; maxUsesPerMonth?: number; perUseCap?: number },
  rules: Rules,
): number | null {
  const m = t.maxUsesPerMonth
  if (!m || b.useGroup) return t.monthlyCap
  const perTx = perTxValueOf(b, t, rules)
  if (perTx === null) return t.monthlyCap
  const limit = m * perTx
  return t.monthlyCap === null ? limit : Math.min(t.monthlyCap, limit)
}

/** 한 벤핏(또는 범용)의 월 최대 혜택과 필요 지출. 스펙 1번. */
function makeRow(
  b: { tag: Tag; type: BenefitType; rate: number; monthlyCap: number | null; note?: string; capGroup?: string; sharedCapGroup?: string; tiers?: Tier[]; minPerTx?: number; maxUsesPerMonth?: number; perUseCap?: number; useGroup?: string },
  spend: number,
  viaUniversal: boolean,
  rules: Rules,
): BenefitRow {
  const t = resolveTier(b, spend)
  const rate = t.rate
  const nominalCap = t.monthlyCap
  // 범용은 다른 태그가 조건을 못 채웠을 때 흘러드는 최종 폴백이라 건당 조건을 걸지 않는다
  const skipTxn = viaUniversal || b.tag === UNIVERSAL_TAG
  const cap = skipTxn ? nominalCap : effectiveCapOf(b, t, rules)
  const perTxValue = skipTxn ? null : perTxValueOf(b, t, rules)
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
  return {
    tag: b.tag, type: b.type, rate, monthlyCap: nominalCap, effectiveCap: cap, note: b.note,
    capGroup: b.capGroup, sharedCapGroup: b.sharedCapGroup, useGroup: skipTxn ? undefined : b.useGroup,
    perTxValue, monthlyValue, requiredSpend, viaUniversal, assumedCap,
    txnLimited: cap !== null && nominalCap !== null && cap < nominalCap,
    nextTier: t.nextTier,
  }
}

function groupRowsBy(rows: BenefitRow[], key: (r: BenefitRow) => string | undefined): Map<string, BenefitRow[]> {
  const groups = new Map<string, BenefitRow[]>()
  for (const r of rows) {
    const k = key(r)
    if (!k) continue
    const arr = groups.get(k) ?? []
    arr.push(r)
    groups.set(k, arr)
  }
  return groups
}

/**
 * 묶인 줄들의 monthlyValue 합이 상한을 넘으면 비례 축소한다.
 * requiredSpend도 같은 비율로 줄인다 — 안 줄이면 아래 총액 상한(clampFactor)에 한 번 더 걸려 두 번 깎이고,
 * 그 결과 "태그를 하나 더 고르면 카드 가치가 절반이 되는" 역전이 생긴다.
 * 요율이 같은 묶음에서는 이 값이 정확하다: 한도 L을 요율 r로 채우는 데 드는 지출은 L/r인데,
 * 축소 전에는 줄 수만큼(n×L/r) 부풀어 있기 때문이다.
 */
function clampGroup(rows: BenefitRow[], groupRows: BenefitRow[], limit: number): BenefitRow[] {
  const sum = groupRows.reduce((s, x) => s + x.monthlyValue, 0)
  if (sum <= limit || sum <= 0) return rows
  const factor = limit / sum
  const scaled = new Set(groupRows)
  return rows.map((x) =>
    scaled.has(x)
      ? { ...x, monthlyValue: x.monthlyValue * factor, requiredSpend: x.requiredSpend === null ? null : x.requiredSpend * factor }
      : x,
  )
}

/**
 * 횟수를 나눠 쓰는 묶음. "카페·편의점·병의원 합쳐 월 2회"처럼 한 묶음이 횟수를 공유한다 —
 * 줄마다 월 2회로 적으면 세 배로 부풀어난다.
 * 그 2회를 가장 값진 곳에 쓴다고 보고(엔진은 '이렇게 쓰면 최대'가 원칙) 묶음 한도 = 횟수 × 가장 큰 건당 혜택.
 */
function applyUseGroups(rows: BenefitRow[], card: Card, spend: number, rules: Rules): BenefitRow[] {
  let result = rows
  for (const name of new Set(rows.map((r) => r.useGroup).filter((n): n is string => !!n))) {
    const uses = card.benefits
      .filter((b) => b.useGroup === name)
      .map((b) => resolveTier(b, spend).maxUsesPerMonth)
      .find((m) => m !== undefined)
    if (!uses) continue
    const groupRows = result.filter((r) => r.useGroup === name)
    const perTx = groupRows.map((r) => r.perTxValue).filter((v): v is number => v !== null)
    if (perTx.length === 0) continue
    const limit = uses * Math.max(...perTx)
    // 실질 한도를 먼저 내린다 — 안 그러면 화면이 못 채울 한도를 약속한다.
    // clampGroup이 새 객체를 만들어 돌려주므로 순서를 뒤집으면 이 표시가 사라진다.
    const marked = result.map((x) =>
      x.useGroup === name && x.monthlyCap !== null && limit < x.monthlyCap
        ? { ...x, effectiveCap: limit, txnLimited: true }
        : x,
    )
    result = clampGroup(marked, marked.filter((r) => r.useGroup === name), toWon(groupRows[0].type, limit, rules))
  }
  return result
}

/** 1단: 같은 capGroup 줄들이 한도 하나를 나눠 쓴다. 그룹 한도 = 줄들의 monthlyCap(스키마가 같은 값을 강제) */
function applyCapGroups(rows: BenefitRow[], rules: Rules): BenefitRow[] {
  let result = rows
  for (const [, groupRows] of groupRowsBy(rows, (r) => r.capGroup)) {
    if (groupRows.length < 2) continue
    result = clampGroup(result, groupRows, toWon(groupRows[0].type, groupRows[0].monthlyCap ?? 0, rules))
  }
  return result
}

/**
 * 2단: 영역별 한도(줄마다 제 monthlyCap) 위에 또 걸리는 통합 상한.
 * 카드사가 흔히 쓰는 구조다 — "영역별 월 5천원, 단 전체 통합 월 2만원" 같은 것.
 * 1단(capGroup)은 줄들이 한도 '하나'를 나눠 쓰는 구조라 이걸 표현하지 못한다.
 */
function applySharedCaps(rows: BenefitRow[], card: Card, spend: number, rules: Rules): BenefitRow[] {
  if (!card.sharedCaps) return rows
  let result = rows
  for (const [name, groupRows] of groupRowsBy(rows, (r) => r.sharedCapGroup)) {
    const def = card.sharedCaps[name]
    if (!def) continue
    const cap = resolveTier({ rate: 0, monthlyCap: def.monthlyCap, tiers: def.tiers }, spend).monthlyCap
    if (cap === null) continue
    result = clampGroup(result, groupRows, toWon(groupRows[0].type, cap, rules))
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

  // 횟수 공유 → 1단(capGroup, 한도 하나를 나눠 씀) → 2단(sharedCaps, 그 위 통합 상한)
  const grouped = applySharedCaps(applyCapGroups(applyUseGroups(deduped, card, S, rules), rules), card, S, rules)

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
