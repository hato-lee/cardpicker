# 연 최대 혜택 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 결과 화면이 카드마다 "연 최대 약 ○○만 원"을 크게 보여주고, 그 숫자로 정렬한다. ★ 점수 체계는 제거한다.

**Architecture:** 엔진에 `annualBenefit(card, query)`(한도 기준 연 혜택 계산)을 새로 두고 `recommend`가 그 값으로 정렬한다. `explain`은 "이렇게 쓰면 최대" 문장(tips)만 만든다. UI는 CardResult/Results를 새 데이터에 맞게 다시 그리고, 입력 화면은 문구·프리셋 버튼만 손본다.

**Tech Stack:** TypeScript, React 19, Vite, Vitest 4 (jsdom, globals, jest-dom), @testing-library/react + user-event. 실행: `npx vitest run <파일>` / 전체 `npm test` / 빌드 `npm run build`.

**Spec:** `docs/superpowers/specs/2026-08-18-annual-benefit-design.md` — 계산식·문구의 유일한 기준. 이 계획과 다르면 스펙이 우선.

## Global Constraints
- 조정 가능한 숫자는 전부 `src/engine/rules.ts`의 `RULES`에 둔다. 다른 파일에 매직 넘버 금지.
- 돈은 원 단위 정수. 마일리지 `monthlyCap`은 마일 단위. 마일→원은 `RULES.mileWon`(15).
- 성향 실현 비율: meticulous 1.0 / moderate 0.8 / carefree 0.6.
- 한 달 사용액을 태그별로 나누지 않는다. 총액 기준 상한(clamp)만 건다.
- 화면에 ★, "고른 N개 중 M개 커버", `card.memo`를 표시하지 않는다.
- 사용자 문구는 스펙의 문장을 **그대로** 쓴다(아래 각 Task에 복사돼 있음).
- 기존 테스트 파일은 새 동작에 맞게 고치되, `AppEmpty.test.tsx`·`AppDataError.test.tsx`·`schema.test.ts`·`cards.test.ts`·`format.test.ts`는 건드리지 않는다.
- 커밋 메시지는 한국어, 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` 줄.

---

### Task 1: 엔진 — RULES 교체 + `annualBenefit` + `recommend` 재작성

**Files:**
- Modify: `src/engine/rules.ts` (RULES 전체 교체, STAR_GUIDE 유지)
- Create: `src/engine/benefit.ts`, `src/engine/benefit.test.ts`
- Modify: `src/engine/recommend.ts` (점수 → annualBenefit 정렬), `src/engine/recommend.test.ts` (재작성)

**Interfaces:**
- Produces:
  ```ts
  // rules.ts
  export const RULES = { topN: 5, staleDays: 90, personaRealization: { meticulous: 1.0, moderate: 0.8, carefree: 0.6 }, mileWon: 15, carefreeMaxComplexity: 2, tipCount: { meticulous: Infinity, moderate: 2, carefree: 1 }, spendPresetsMan: [30, 50, 100, 150], breakdownMaxRows: 3 }
  export type Rules = typeof RULES
  // benefit.ts
  export interface BenefitRow { tag: Tag; type: BenefitType; rate: number; monthlyCap: number | null; note?: string; monthlyValue: number; requiredSpend: number | null; viaUniversal: boolean }
  export interface AnnualBenefit { rows: BenefitRow[]; monthlyMax: number; annualGross: number; annualRealized: number; annualNet: number; clampFactor: number }
  export function annualBenefit(card: Card, q: Query, rules?: Rules): AnnualBenefit | null
  // recommend.ts
  export interface Scored { card: Card; benefit: AnnualBenefit; coveredTags: Tag[]; universalCovers: Tag[] }
  export function coveredTagsOf(card: Card, tags: Tag[]): Tag[]
  export function universalCoversOf(card: Card, tags: Tag[]): Tag[]
  export function recommend(cards: Card[], q: Query, rules?: Rules): Scored[]
  ```
  (`isUniversalCard`는 삭제한다. 다른 파일에서 쓰이는지 `grep -rn isUniversalCard src`로 확인하고 쓰는 곳도 정리.)

- [ ] **Step 1: rules.ts 교체**

```ts
/**
 * 조정 가능한 숫자는 전부 여기. 다른 파일에 숫자를 흩뿌리지 않는다.
 * 실제 카드를 넣고 결과를 보며 고친다.
 */
export const RULES = {
  topN: 5,
  staleDays: 90,
  // 성향 = 한도를 실제로 얼마나 챙기는지. 연 혜택에 곱한다.
  personaRealization: { meticulous: 1.0, moderate: 0.8, carefree: 0.6 },
  // 1마일 ≈ 15원으로 환산
  mileWon: 15,
  // 무심형은 복잡도 3 제외
  carefreeMaxComplexity: 2,
  // "이렇게 쓰면 최대" 문장 개수 (성향별)
  tipCount: { meticulous: Infinity, moderate: 2, carefree: 1 },
  // 한 달 사용액 빠른 선택 버튼 (만 원)
  spendPresetsMan: [30, 50, 100, 150],
  // 결과 카드의 내역 줄 최대 개수 (넘으면 "외 N개")
  breakdownMaxRows: 3,
}

export type Rules = typeof RULES
```
`STAR_GUIDE`는 그대로 둔다.

- [ ] **Step 2: benefit.test.ts 작성 (실패 확인)**

```ts
import { annualBenefit } from './benefit'
import { RULES } from './rules'
import type { Card, Query } from '../data/types'

const base: Card = {
  id: 'x', name: 'X', issuer: 'T', kind: 'credit', annualFee: 0, minSpend: 0,
  benefits: [], universal: null, complexity: 1,
  officialUrl: 'https://example.com', lastChecked: '2026-08-18', status: 'active',
}
const card = (over: Partial<Card>): Card => ({ ...base, ...over })
const q = (over: Partial<Query> = {}): Query => ({ persona: 'meticulous', monthlySpend: 1_000_000, feeLimit: null, tags: ['주유'], ...over })

test('한도 있는 할인: 월 혜택 = 한도, 필요 지출 = 한도/요율', () => {
  const c = card({ benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3 }] })
  const r = annualBenefit(c, q())!
  expect(r.rows).toHaveLength(1)
  expect(r.rows[0].monthlyValue).toBe(15000)
  expect(r.rows[0].requiredSpend).toBe(150000)
  expect(r.monthlyMax).toBe(15000)
  expect(r.annualGross).toBe(180000)
  expect(r.annualNet).toBe(180000)
})

test('한도 없는 정률: 총 사용액 × 요율', () => {
  const c = card({ benefits: [{ tag: '해외 결제', type: 'discount', rate: 2, monthlyCap: null, stars: 1 }] })
  const r = annualBenefit(c, q({ tags: ['해외 결제'], monthlySpend: 500_000 }))!
  expect(r.rows[0].monthlyValue).toBe(10000)
  expect(r.rows[0].requiredSpend).toBe(500_000)
})

test('마일리지: 마일 × mileWon, 한도는 마일 단위', () => {
  const capped = card({ benefits: [{ tag: '마일리지', type: 'mileage', rate: 0.1, monthlyCap: 500, stars: 2 }] })
  const r1 = annualBenefit(capped, q({ tags: ['마일리지'] }))!
  expect(r1.rows[0].monthlyValue).toBe(500 * RULES.mileWon)
  expect(r1.rows[0].requiredSpend).toBe(500_000)
  const uncapped = card({ benefits: [{ tag: '마일리지', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 }] })
  const r2 = annualBenefit(uncapped, q({ tags: ['마일리지'], monthlySpend: 1_000_000 }))!
  expect(r2.rows[0].monthlyValue).toBe(1000 * RULES.mileWon)
})

test('정액(rate 0): 한도 그대로, 상한 조정 안 받음', () => {
  const c = card({ benefits: [
    { tag: '학원·교육', type: 'discount', rate: 0, monthlyCap: 12000, stars: 2 },
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 100000, stars: 3 }, // 필요 지출 100만
  ] })
  const r = annualBenefit(c, q({ tags: ['학원·교육', '주유'], monthlySpend: 500_000 }))!
  const edu = r.rows.find((x) => x.tag === '학원·교육')!
  const oil = r.rows.find((x) => x.tag === '주유')!
  expect(edu.requiredSpend).toBeNull()
  expect(edu.monthlyValue).toBe(12000)
  expect(r.clampFactor).toBe(0.5)
  expect(oil.monthlyValue).toBe(50000)
})

test('상한: 필요 지출 합이 사용액을 넘으면 비례 축소', () => {
  const c = card({ benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 20000, stars: 3 },       // 20만
    { tag: '카페·편의점', type: 'discount', rate: 10, monthlyCap: 20000, stars: 3 }, // 20만
  ] })
  const ok = annualBenefit(c, q({ tags: ['주유', '카페·편의점'], monthlySpend: 400_000 }))!
  expect(ok.clampFactor).toBe(1)
  expect(ok.monthlyMax).toBe(40000)
  const tight = annualBenefit(c, q({ tags: ['주유', '카페·편의점'], monthlySpend: 200_000 }))!
  expect(tight.clampFactor).toBe(0.5)
  expect(tight.monthlyMax).toBe(20000)
})

test('범용: 미커버 태그가 여러 개여도 한 번만, 직접 고르면 중복 없음', () => {
  const uni = card({
    universal: { type: 'points', rate: 1, monthlyCap: null },
    benefits: [{ tag: '모든 가맹점', type: 'points', rate: 1, monthlyCap: null, stars: 3 }],
  })
  const r = annualBenefit(uni, q({ tags: ['주유', '학원·교육'], monthlySpend: 1_000_000 }))!
  expect(r.rows).toHaveLength(1)
  expect(r.rows[0].tag).toBe('모든 가맹점')
  expect(r.rows[0].viaUniversal).toBe(true)
  expect(r.rows[0].monthlyValue).toBe(10000)
  const direct = annualBenefit(uni, q({ tags: ['모든 가맹점', '주유'] }))!
  expect(direct.rows).toHaveLength(1)
  expect(direct.rows[0].viaUniversal).toBe(false)
})

test('전 가맹점 마일리지 카드: 마일리지 + 모든 가맹점 둘 다 골라도 한 번만', () => {
  const c = card({
    universal: { type: 'mileage', rate: 0.1, monthlyCap: null },
    benefits: [
      { tag: '마일리지', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 },
      { tag: '모든 가맹점', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 },
    ],
  })
  const r = annualBenefit(c, q({ tags: ['마일리지', '모든 가맹점'] }))!
  expect(r.rows.map((x) => x.tag)).toEqual(['마일리지'])
})

test('성향 비율과 연회비 차감', () => {
  const c = card({ annualFee: 30000, benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 10000, stars: 2 }] })
  expect(annualBenefit(c, q({ persona: 'meticulous' }))!.annualNet).toBe(120000 - 30000)
  expect(annualBenefit(c, q({ persona: 'moderate' }))!.annualNet).toBe(Math.round(120000 * 0.8 - 30000))
  expect(annualBenefit(c, q({ persona: 'carefree' }))!.annualNet).toBe(Math.round(120000 * 0.6 - 30000))
})

test('줄이 하나도 없으면 null', () => {
  const c = card({ benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 10000, stars: 2 }] })
  expect(annualBenefit(c, q({ tags: ['병의원·약국'] }))).toBeNull()
})
```
Run: `npx vitest run src/engine/benefit.test.ts` → FAIL (모듈 없음).

- [ ] **Step 3: benefit.ts 구현**

```ts
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
```
Run: `npx vitest run src/engine/benefit.test.ts` → PASS.

- [ ] **Step 4: recommend.ts 재작성**

```ts
import type { Card, Query } from '../data/types'
import type { Tag } from '../data/tags'
import { RULES, type Rules } from './rules'
import { annualBenefit, type AnnualBenefit } from './benefit'

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

export function universalCoversOf(card: Card, tags: Tag[]): Tag[] {
  if (card.universal === null) return []
  const covered = coveredTagsOf(card, tags)
  return tags.filter((t) => !covered.includes(t))
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
    scored.push({ card, benefit, coveredTags: coveredTagsOf(card, q.tags), universalCovers: universalCoversOf(card, q.tags) })
  }
  return scored
    .sort((a, b) =>
      b.benefit.annualNet - a.benefit.annualNet ||
      a.card.annualFee - b.card.annualFee ||
      a.card.minSpend - b.card.minSpend)
    .slice(0, rules.topN)
}
```

- [ ] **Step 5: recommend.test.ts 재작성**

기존 파일을 통째로 아래로 바꾼다.
```ts
import { recommend, coveredTagsOf, universalCoversOf } from './recommend'
import { RULES } from './rules'
import type { Card, Query } from '../data/types'

const base: Card = {
  id: 'x', name: 'X', issuer: 'T', kind: 'credit', annualFee: 0, minSpend: 0,
  benefits: [], universal: null, complexity: 1,
  officialUrl: 'https://example.com', lastChecked: '2026-08-18', status: 'active',
}
let autoId = 0
const card = (over: Partial<Card>): Card => ({ ...base, ...over, id: over.id ?? `auto-${autoId++}` })
const q = (over: Partial<Query> = {}): Query => ({ persona: 'moderate', monthlySpend: 1_000_000, feeLimit: null, tags: ['주유'], ...over })

const oilCard = card({ id: 'oil', benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3 }], complexity: 2 })
const universalCard = card({ id: 'uni', universal: { type: 'points', rate: 1, monthlyCap: null }, benefits: [{ tag: '모든 가맹점', type: 'points', rate: 1, monthlyCap: null, stars: 3 }], complexity: 1 })

describe('coveredTagsOf / universalCoversOf', () => {
  test('벤핏 태그가 있으면 커버', () => {
    expect(coveredTagsOf(oilCard, ['주유', '카페·편의점'])).toEqual(['주유'])
  })
  test('범용 카드는 벤핏 없는 태그를 범용으로 커버', () => {
    expect(universalCoversOf(universalCard, ['주유', '모든 가맹점'])).toEqual(['주유'])
    expect(universalCoversOf(oilCard, ['카페·편의점'])).toEqual([])
  })
})

describe('걸러내기', () => {
  test('단종 카드는 빠진다', () => {
    expect(recommend([card({ ...oilCard, id: 'd', status: 'discontinued' })], q())).toHaveLength(0)
  })
  test('연회비 허용치 초과는 빠진다', () => {
    expect(recommend([card({ ...oilCard, id: 'f', annualFee: 50000 })], q({ feeLimit: 30000 }))).toHaveLength(0)
  })
  test('feeLimit이 null이면 연회비 상관없이 통과', () => {
    expect(recommend([card({ ...oilCard, id: 'f', annualFee: 300000 })], q({ feeLimit: null }))).toHaveLength(1)
  })
  test('월 사용액이 실적 미만이면 빠진다', () => {
    expect(recommend([card({ ...oilCard, id: 's', minSpend: 500000 })], q({ monthlySpend: 400000 }))).toHaveLength(0)
  })
  test('고른 태그를 하나도 커버 못 하면 빠진다', () => {
    expect(recommend([oilCard], q({ tags: ['병의원·약국'] }))).toHaveLength(0)
  })
  test('범용 카드는 벤핏 없는 태그도 통과한다', () => {
    const r = recommend([universalCard], q({ tags: ['병의원·약국'] }))
    expect(r).toHaveLength(1)
    expect(r[0].universalCovers).toEqual(['병의원·약국'])
  })
  test('무심형은 복잡도 3이 빠진다', () => {
    const c3 = card({ ...oilCard, id: 'c3', complexity: 3 })
    expect(recommend([c3], q({ persona: 'carefree' }))).toHaveLength(0)
    expect(recommend([c3], q({ persona: 'moderate' }))).toHaveLength(1)
  })
})

describe('정렬', () => {
  test('연 최대 혜택(연회비 뺀 값) 큰 순', () => {
    const big = card({ id: 'big', benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 30000, stars: 3 }] })
    const small = card({ id: 'small', benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 10000, stars: 2 }] })
    const r = recommend([small, big], q())
    expect(r.map((x) => x.card.id)).toEqual(['big', 'small'])
    expect(r[0].benefit.annualNet).toBeGreaterThan(r[1].benefit.annualNet)
  })
  test('연회비가 크면 순위가 내려간다', () => {
    const cheap = card({ id: 'cheap', annualFee: 0, benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 10000, stars: 2 }] })
    const pricey = card({ id: 'pricey', annualFee: 100000, benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3 }] })
    expect(recommend([pricey, cheap], q()).map((x) => x.card.id)).toEqual(['cheap', 'pricey'])
  })
  test('동률이면 연회비 낮은 순, 그다음 실적 낮은 순', () => {
    const b = [{ tag: '주유' as const, type: 'discount' as const, rate: 10, monthlyCap: 10000, stars: 2 as const }]
    const a1 = card({ id: 'a1', annualFee: 5000, minSpend: 300000, benefits: b })
    const a2 = card({ id: 'a2', annualFee: 5000, minSpend: 0, benefits: b })
    const a3 = card({ id: 'a3', annualFee: 0, minSpend: 300000, benefits: b })
    // annualNet: a3 = 120000, a1 = a2 = 115000 → a3, a2(실적 0), a1
    expect(recommend([a1, a2, a3], q({ persona: 'meticulous' })).map((x) => x.card.id)).toEqual(['a3', 'a2', 'a1'])
  })
  test('무심형은 성향 비율 때문에 같은 카드라도 숫자가 작다', () => {
    const m = recommend([oilCard], q({ persona: 'meticulous' }))[0].benefit.annualNet
    const c = recommend([oilCard], q({ persona: 'carefree' }))[0].benefit.annualNet
    expect(c).toBe(Math.round(m * RULES.personaRealization.carefree))
  })
  test('상위 topN만', () => {
    const many = Array.from({ length: 8 }, (_, i) => card({ id: `c${i}`, benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 1000 * (i + 1), stars: 1 }] }))
    expect(recommend(many, q())).toHaveLength(RULES.topN)
  })
})
```
Run: `npx vitest run src/engine` → benefit·recommend PASS. (`explain.test.ts`는 Task 2에서 고치므로 이 시점엔 실패해도 된다 — 단, `npx tsc -b --noEmit`가 explain.ts의 `s.score`·`isUniversal` 참조로 실패하면 Task 2 전까지 커밋 전 타입 오류가 남는다. **이 Task에서는 explain.ts를 최소한으로만 고쳐 타입을 통과시킨다**: `reasonLine`·`maxBenefitTable`을 통째로 지우고 `isStale`만 남긴다. explain.test.ts의 관련 테스트도 함께 지운다(isStale 테스트만 남김). UI가 깨지는 건 Task 3에서 잡는다 — 이 Task 커밋 시점에 `npm test`가 CardResult.test.tsx·App.test.tsx 때문에 실패하는 것은 허용, `npx tsc -b --noEmit`도 CardResult.tsx가 reasonLine을 import해서 실패할 수 있으므로, CardResult.tsx의 `reasonLine`/`maxBenefitTable` import·사용 부분을 임시로 제거해 타입만 통과시킨다. 화면 내용은 Task 3에서 새로 쓴다.)

- [ ] **Step 6: 타입 통과 확인 후 커밋**

Run: `npx tsc -b --noEmit` → 오류 0. `npx vitest run src/engine` → PASS.
```bash
git add src/engine src/ui/CardResult.tsx
git commit -m "engine: ★ 점수 대신 연 최대 혜택(annualBenefit)으로 정렬 — RULES 교체, 한도 기준 계산·총액 상한·성향 비율"
```

---

### Task 2: explain — "이렇게 쓰면 최대" tips

**Files:**
- Modify: `src/engine/explain.ts` (isStale 유지 + `tips`, `rowAnnualValue`, `PERSONA_LABEL` 추가)
- Modify: `src/engine/explain.test.ts`

**Interfaces:**
- Consumes: `AnnualBenefit`, `BenefitRow` (Task 1), `RULES.tipCount`, `RULES.personaRealization`, `rateText`/`won` (`src/ui/format.ts`).
- Produces:
  ```ts
  export const PERSONA_LABEL: Record<Persona, string> = { meticulous: '꼼꼼형', moderate: '적당형', carefree: '무심형' }
  export function rowAnnualValue(row: BenefitRow, persona: Persona, rules?: Rules): number  // Math.round(monthlyValue*12*realization)
  export function tips(ab: AnnualBenefit, persona: Persona, rules?: Rules): string[]
  export function isStale(lastChecked: string, today: Date, staleDays?: number): boolean  // 기존 그대로
  ```

- [ ] **Step 1: explain.test.ts 작성 (isStale 테스트는 기존 것 유지, 아래 추가)**

```ts
import { tips, rowAnnualValue, isStale, PERSONA_LABEL } from './explain'
import { annualBenefit } from './benefit'
import type { Card, Query } from '../data/types'

const base: Card = {
  id: 'x', name: 'X', issuer: 'T', kind: 'credit', annualFee: 0, minSpend: 0,
  benefits: [], universal: null, complexity: 1,
  officialUrl: 'https://example.com', lastChecked: '2026-08-18', status: 'active',
}
const q = (over: Partial<Query> = {}): Query => ({ persona: 'meticulous', monthlySpend: 1_000_000, feeLimit: null, tags: ['주유'], ...over })

const multi: Card = { ...base, benefits: [
  { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3 },
  { tag: '카페·편의점', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
  { tag: '해외 결제', type: 'discount', rate: 2, monthlyCap: null, stars: 1 },
  { tag: '학원·교육', type: 'discount', rate: 0, monthlyCap: 12000, stars: 2, note: '밀크T 자동이체 시 월 12,000원 정액 할인' },
] }
const tags = ['주유', '카페·편의점', '해외 결제', '학원·교육'] as const

test('꼼꼼형: 줄마다 한 문장, 월 혜택 큰 순', () => {
  const ab = annualBenefit(multi, q({ tags: [...tags], monthlySpend: 400_000 }))!
  const t = tips(ab, 'meticulous')
  expect(t).toHaveLength(4)
  expect(t).toContain('주유에 월 15만 원 이상 쓰면 한도(1.5만 원)를 꽉 채워요')
  expect(t).toContain('카페·편의점에 월 10만 원 이상 쓰면 한도(5,000원)를 꽉 채워요')
  expect(t).toContain('해외 결제는 쓰는 만큼 2% 할인 — 한도 없음')
  expect(t).toContain('학원·교육: 밀크T 자동이체 시 월 12,000원 정액 할인')
})

test('월 혜택 큰 줄이 먼저', () => {
  const two: Card = { ...base, benefits: [
    { tag: '카페·편의점', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3 },
  ] }
  const ab = annualBenefit(two, q({ tags: ['카페·편의점', '주유'] }))!
  expect(tips(ab, 'meticulous')[0]).toBe('주유에 월 15만 원 이상 쓰면 한도(1.5만 원)를 꽉 채워요')
})

test('적당형은 2개, 무심형은 1개에 접두', () => {
  const ab = annualBenefit(multi, q({ tags: [...tags] }))!
  expect(tips(ab, 'moderate')).toHaveLength(2)
  const c = tips(ab, 'carefree')
  expect(c).toHaveLength(1)
  expect(c[0].startsWith('이것만 챙기세요: ')).toBe(true)
})

test('범용 줄 문구', () => {
  const uni: Card = { ...base, universal: { type: 'points', rate: 1.2, monthlyCap: null }, benefits: [{ tag: '모든 가맹점', type: 'points', rate: 1.2, monthlyCap: null, stars: 3 }] }
  const ab = annualBenefit(uni, q({ tags: ['주유'] }))!
  expect(tips(ab, 'meticulous')).toEqual(['그 외 소비는 모든 가맹점 1.2% 적립'])
})

test('정액인데 note가 없으면 "정액 혜택"', () => {
  const c: Card = { ...base, benefits: [{ tag: '해외 결제', type: 'discount', rate: 0, monthlyCap: null, stars: 1 }] }
  const ab = annualBenefit(c, q({ tags: ['해외 결제'] }))!
  expect(tips(ab, 'meticulous')).toEqual(['해외 결제: 정액 혜택'])
})

test('rowAnnualValue = 월 × 12 × 성향 비율', () => {
  const ab = annualBenefit(multi, q({ tags: ['주유'] }))!
  expect(rowAnnualValue(ab.rows[0], 'meticulous')).toBe(180000)
  expect(rowAnnualValue(ab.rows[0], 'moderate')).toBe(144000)
})

test('PERSONA_LABEL', () => {
  expect(PERSONA_LABEL.carefree).toBe('무심형')
})

describe('isStale', () => {
  test('90일 이내면 false, 넘으면 true', () => {
    expect(isStale('2026-08-01', new Date('2026-08-20'))).toBe(false)
    expect(isStale('2026-05-01', new Date('2026-08-20'))).toBe(true)
  })
  test('시각과 무관하게 날짜로만 비교', () => {
    expect(isStale('2026-05-22', new Date('2026-08-20T23:59:00'))).toBe(false)
  })
})
```
Run: `npx vitest run src/engine/explain.test.ts` → FAIL.

- [ ] **Step 2: explain.ts 구현**

```ts
import type { Persona } from '../data/types'
import type { AnnualBenefit, BenefitRow } from './benefit'
import { RULES, type Rules } from './rules'
import { won, rateText } from '../ui/format'

export const PERSONA_LABEL: Record<Persona, string> = { meticulous: '꼼꼼형', moderate: '적당형', carefree: '무심형' }

/** 줄 하나의 연 혜택(성향 반영). 화면 내역·막대에 쓴다. */
export function rowAnnualValue(row: BenefitRow, persona: Persona, rules: Rules = RULES): number {
  return Math.round(row.monthlyValue * 12 * rules.personaRealization[persona])
}

function tipOf(row: BenefitRow): string {
  if (row.viaUniversal) return `그 외 소비는 모든 가맹점 ${rateText(row.type, row.rate)}`
  if (row.rate === 0) return `${row.tag}: ${row.note ?? '정액 혜택'}`
  if (row.monthlyCap === null) return `${row.tag}는 쓰는 만큼 ${rateText(row.type, row.rate)} — 한도 없음`
  const cap = row.type === 'mileage' ? `${row.monthlyCap.toLocaleString('ko-KR')}마일` : won(row.monthlyCap)
  return `${row.tag}에 월 ${won(Math.round(row.requiredSpend!))} 이상 쓰면 한도(${cap})를 꽉 채워요`
}

/** "이렇게 쓰면 최대" 문장들. 월 혜택 큰 순, 성향별 개수 제한. */
export function tips(ab: AnnualBenefit, persona: Persona, rules: Rules = RULES): string[] {
  const sorted = [...ab.rows].sort((a, b) => b.monthlyValue - a.monthlyValue)
  const n = rules.tipCount[persona]
  const picked = Number.isFinite(n) ? sorted.slice(0, n) : sorted
  const lines = picked.map(tipOf)
  return persona === 'carefree' ? lines.map((l) => `이것만 챙기세요: ${l}`) : lines
}

export function isStale(lastChecked: string, today: Date, staleDays: number = RULES.staleDays): boolean {
  const checked = new Date(lastChecked + 'T00:00:00')
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = (todayMidnight.getTime() - checked.getTime()) / 86_400_000
  return diffDays > staleDays
}
```
주의: `won(5000)`은 `'5,000원'`, `won(15000)`은 `'1.5만 원'`, `won(150000)`은 `'15만 원'` — 테스트 기대값과 일치한다.

Run: `npx vitest run src/engine/explain.test.ts` → PASS.

- [ ] **Step 3: 커밋**
```bash
git add src/engine/explain.ts src/engine/explain.test.ts
git commit -m "engine: '이렇게 쓰면 최대' tips + 성향 라벨·줄별 연 혜택"
```

---

### Task 3: 결과 화면 — CardResult / Results 다시 그리기 + 스타일

**Files:**
- Modify: `src/ui/CardResult.tsx`, `src/ui/Results.tsx`, `src/styles.css`
- Modify: `src/ui/CardResult.test.tsx` (재작성), `src/ui/App.test.tsx` (한 테스트 수정)

**Interfaces:**
- Consumes: `Scored{card, benefit, coveredTags, universalCovers}` (Task 1), `tips`, `rowAnnualValue`, `PERSONA_LABEL`, `isStale` (Task 2), `RULES.breakdownMaxRows`, `RULES.personaRealization`, `won`, `rateText`.
- Produces: `CardResult` props `{ rank: number; scored: Scored; persona: Persona; today: Date }` (pickedCount 제거). `Results` props 그대로 `{ query, results, onEdit, today }`.

- [ ] **Step 1: CardResult.test.tsx 재작성 (실패 확인)**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CardResult } from './CardResult'
import { annualBenefit } from '../engine/benefit'
import type { Scored } from '../engine/recommend'
import type { Card, Query } from '../data/types'

const oil: Card = {
  id: 'oil', name: '신한카드 Deep Oil', issuer: '신한카드', kind: 'credit', annualFee: 10000, minSpend: 300000,
  benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3, note: '정유사 1곳 선택' },
    { tag: '카페·편의점', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
  ],
  universal: null, complexity: 2, officialUrl: 'https://example.com/oil', lastChecked: '2026-08-18', status: 'active',
  memo: 'AI 수집, 검수 전. 출처: 공식 페이지',
}
const q: Query = { persona: 'moderate', monthlySpend: 1_000_000, feeLimit: null, tags: ['주유', '카페·편의점'] }
const scored: Scored = { card: oil, benefit: annualBenefit(oil, q)!, coveredTags: ['주유', '카페·편의점'], universalCovers: [] }
const today = new Date('2026-08-20')
// 월 2만 × 12 × 0.8 = 192,000 − 10,000 = 182,000

test('이름·카드사·큰 숫자·부제·링크·확인일이 보인다', () => {
  render(<CardResult rank={1} scored={scored} persona="moderate" today={today} />)
  expect(screen.getByText('신한카드 Deep Oil')).toBeInTheDocument()
  expect(screen.getByText(/신한카드 · 신용/)).toBeInTheDocument()
  expect(screen.getByText('연 최대')).toBeInTheDocument()
  expect(screen.getByText('약 18.2만 원')).toBeInTheDocument()
  expect(screen.getByText('연회비 1만 원 뺀 금액 · 적당형 기준(한도의 80%)')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /카드사 페이지/ })).toHaveAttribute('href', 'https://example.com/oil')
  expect(screen.getByText(/마지막 확인 2026-08-18/)).toBeInTheDocument()
})

test('내역 줄: 태그와 연 금액', () => {
  render(<CardResult rank={2} scored={scored} persona="moderate" today={today} />)
  // 주유 15,000×12×0.8 = 144,000 / 카페 5,000×12×0.8 = 48,000
  expect(screen.getByText('주유')).toBeInTheDocument()
  expect(screen.getByText('14.4만 원')).toBeInTheDocument()
  expect(screen.getByText('카페·편의점')).toBeInTheDocument()
  expect(screen.getByText('4.8만 원')).toBeInTheDocument()
})

test('1위는 추천 배지, 2위는 없음', () => {
  const { unmount } = render(<CardResult rank={1} scored={scored} persona="moderate" today={today} />)
  expect(screen.getByText('추천')).toBeInTheDocument()
  unmount()
  render(<CardResult rank={2} scored={scored} persona="moderate" today={today} />)
  expect(screen.queryByText('추천')).not.toBeInTheDocument()
})

test('자세히 보기를 펼치면 tips와 전체 혜택이 보이고 memo·★는 없다', async () => {
  render(<CardResult rank={1} scored={scored} persona="meticulous" today={today} />)
  expect(screen.queryByText(/이렇게 쓰면 최대/)).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
  expect(screen.getByText(/이렇게 쓰면 최대/)).toBeInTheDocument()
  expect(screen.getByText('주유에 월 15만 원 이상 쓰면 한도(1.5만 원)를 꽉 채워요')).toBeInTheDocument()
  expect(screen.getByText(/주유 10% 할인 · 월 최대 1.5만 원 \(정유사 1곳 선택\)/)).toBeInTheDocument()
  expect(screen.queryByText(/AI 수집/)).not.toBeInTheDocument()
  expect(screen.queryByText(/★/)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /접기/ })).toHaveAttribute('aria-expanded', 'true')
})

test('연회비가 혜택보다 크면 문구로 표시', () => {
  const pricey: Card = { ...oil, id: 'p', annualFee: 300000 }
  const s: Scored = { ...scored, card: pricey, benefit: annualBenefit(pricey, q)! }
  render(<CardResult rank={3} scored={s} persona="moderate" today={today} />)
  // 192,000 − 300,000 = −108,000
  expect(screen.getByText('연회비가 혜택보다 커요 (−10.8만 원)')).toBeInTheDocument()
  expect(screen.queryByText(/^약 /)).not.toBeInTheDocument()
})

test('90일 넘으면 확인 필요 뱃지', () => {
  render(<CardResult rank={1} scored={scored} persona="moderate" today={new Date('2026-12-01')} />)
  expect(screen.getByText('확인 필요')).toBeInTheDocument()
})

test('내역이 3개 넘으면 상위 3개 + 외 N개', () => {
  const many: Card = { ...oil, id: 'm', benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3 },
    { tag: '카페·편의점', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
    { tag: '온라인 쇼핑', type: 'discount', rate: 5, monthlyCap: 8000, stars: 2 },
    { tag: '통신비·OTT', type: 'discount', rate: 5, monthlyCap: 3000, stars: 1 },
  ] }
  const mq: Query = { ...q, tags: ['주유', '카페·편의점', '온라인 쇼핑', '통신비·OTT'] }
  const s: Scored = { card: many, benefit: annualBenefit(many, mq)!, coveredTags: mq.tags, universalCovers: [] }
  render(<CardResult rank={1} scored={s} persona="moderate" today={today} />)
  expect(screen.getByText('외 1개')).toBeInTheDocument()
  expect(screen.queryByText('통신비·OTT')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: CardResult.tsx 재작성**

```tsx
import { useState } from 'react'
import type { Scored } from '../engine/recommend'
import type { Persona, Benefit, BenefitType } from '../data/types'
import { tips, rowAnnualValue, isStale, PERSONA_LABEL } from '../engine/explain'
import { RULES } from '../engine/rules'
import { won, rateText } from './format'

interface Props {
  rank: number
  scored: Scored
  persona: Persona
  today: Date
}

/** 월 한도 표기. 마일리지 한도는 '원'이 아니라 '마일' 단위다. */
function capText(type: BenefitType, cap: number | null): string {
  if (cap === null) return '한도 없음'
  if (type === 'mileage') return `월 최대 ${cap.toLocaleString('ko-KR')}마일`
  return `월 최대 ${won(cap)}`
}

function benefitText(b: Benefit): string {
  return `${b.tag} ${rateText(b.type, b.rate)} · ${capText(b.type, b.monthlyCap)}${b.note ? ` (${b.note})` : ''}`
}

export function CardResult({ rank, scored, persona, today }: Props) {
  const [open, setOpen] = useState(false)
  const { card, benefit } = scored
  const stale = isStale(card.lastChecked, today)
  const net = benefit.annualNet
  const pct = Math.round(RULES.personaRealization[persona] * 100)

  // 내역 줄: 연 금액 큰 순, 최대 N개 + "외 N개"
  const rows = benefit.rows
    .map((r) => ({ tag: r.tag, annual: rowAnnualValue(r, persona) }))
    .sort((a, b) => b.annual - a.annual)
  const shown = rows.slice(0, RULES.breakdownMaxRows)
  const rest = rows.length - shown.length
  const maxAnnual = Math.max(1, ...shown.map((r) => r.annual))

  const tipLines = tips(benefit, persona)

  return (
    <article className={`card ${rank === 1 ? 'is-top' : ''}`}>
      <header className="card-head">
        <span className="rank" aria-label={`${rank}위`}>{rank}</span>
        <div className="card-title">
          <h3>{card.name}{rank === 1 && <span className="top-badge">추천</span>}</h3>
          <div className="card-sub">{card.issuer} · {card.kind === 'credit' ? '신용' : '체크'} · 연회비 {won(card.annualFee)} · {card.minSpend === 0 ? '실적 없음' : `전월실적 ${won(card.minSpend)}`}</div>
        </div>
      </header>

      <div className="annual">
        <div className="annual-label">연 최대</div>
        {net > 0 ? (
          <div className="annual-value">약 {won(net)}</div>
        ) : (
          <div className="annual-negative">연회비가 혜택보다 커요 (−{won(-net)})</div>
        )}
        <div className="annual-sub">연회비 {won(card.annualFee)} 뺀 금액 · {PERSONA_LABEL[persona]} 기준(한도의 {pct}%)</div>
      </div>

      <ul className="breakdown">
        {shown.map((r) => (
          <li key={r.tag}>
            <span className="bd-tag">{r.tag}</span>
            <span className="bd-bar" aria-hidden="true"><span style={{ width: `${Math.round((r.annual / maxAnnual) * 100)}%` }} /></span>
            <span className="bd-value">{won(r.annual)}</span>
          </li>
        ))}
        {rest > 0 && <li className="bd-rest">외 {rest}개</li>}
      </ul>

      <button type="button" className="link-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? '접기 ▲' : '자세히 보기 ▼'}
      </button>
      {open && (
        <div className="detail">
          <div className="detail-title">이렇게 쓰면 최대</div>
          <ul className="tips">
            {tipLines.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <div className="detail-title">전체 혜택</div>
          <ul className="benefits">
            {card.benefits.map((b) => <li key={b.tag}>{benefitText(b)}</li>)}
          </ul>
        </div>
      )}

      <footer className="card-foot">
        <a href={card.officialUrl} target="_blank" rel="noopener noreferrer">카드사 페이지 →</a>
        <span className="checked">
          마지막 확인 {card.lastChecked}
          {stale && <span className="badge">확인 필요</span>}
        </span>
      </footer>
    </article>
  )
}
```

- [ ] **Step 3: Results.tsx — 조건 요약 칩 + 상단 조건 바꾸기**

```tsx
import type { Query } from '../data/types'
import type { Scored } from '../engine/recommend'
import { PERSONA_LABEL } from '../engine/explain'
import { CardResult } from './CardResult'
import { REPORT_FORM_URL } from './config'
import { won } from './format'

interface Props {
  query: Query
  results: Scored[]
  onEdit: () => void
  today: Date
}

export function Results({ query, results, onEdit, today }: Props) {
  const chips = [
    PERSONA_LABEL[query.persona],
    `월 ${won(query.monthlySpend)}`,
    query.feeLimit === null ? '연회비 상관없음' : `연회비 ${won(query.feeLimit)}까지`,
    ...query.tags,
  ]
  return (
    <section className="step">
      <div className="summary">
        <ul className="chips" aria-label="내 조건">
          {chips.map((c) => <li key={c} className="chip">{c}</li>)}
        </ul>
        <button type="button" className="link-btn" onClick={onEdit}>조건 바꾸기</button>
      </div>
      <h2>{results.length > 0 ? `당신에게 맞는 카드 TOP ${results.length}` : '당신에게 맞는 카드'}</h2>
      {results.length === 0 ? (
        <div className="empty">
          <p>조건에 맞는 카드를 못 찾았어요.</p>
          <p className="hint">연회비 허용치를 올리거나, 태그를 바꿔보세요.</p>
        </div>
      ) : (
        results.map((s, i) => (
          <CardResult key={s.card.id} rank={i + 1} scored={s} persona={query.persona} today={today} />
        ))
      )}
      <button type="button" className="secondary" onClick={onEdit}>조건 바꾸기</button>
      {/* 제보 폼 주소를 아직 안 넣었으면(자리표시자) 링크를 숨긴다 */}
      {!REPORT_FORM_URL.includes('REPLACE_ME') && (
        <p className="report">
          정보가 틀렸나요? <a href={REPORT_FORM_URL} target="_blank" rel="noopener noreferrer">제보하기</a>
        </p>
      )}
    </section>
  )
}
```
주의: "조건 바꾸기" 버튼이 2개가 되므로 App.test.tsx의 `getByRole('button', { name: '조건 바꾸기' })`는 `getAllByRole(...)[0]`으로 바꾼다.

- [ ] **Step 4: styles.css — 결과 카드 부분 교체/추가**

기존 `.reason`, `.max-table*`, `.max-title`, `.max-sum`, `.max-note` 규칙을 삭제하고 아래를 추가한다.
```css
:root { --brand: #2563eb; --ink: #1c1e21; --muted: #666; --line: #dfe3e8; --bg: #f6f7f9; --good: #0f7b3f; }
.summary { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 16px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.chip { font-size: 12px; padding: 4px 8px; background: #fff; border: 1px solid var(--line); border-radius: 999px; color: #333; }
.card.is-top { border-color: var(--brand); box-shadow: 0 0 0 2px rgba(37,99,235,.15); }
.card-title { min-width: 0; flex: 1; }
.top-badge { display: inline-block; margin-left: 6px; padding: 2px 6px; font-size: 11px; font-weight: 700; color: var(--brand); background: #e8effd; border-radius: 4px; vertical-align: middle; }
.annual { display: grid; grid-template-columns: auto 1fr; column-gap: 10px; align-items: baseline; margin: 14px 0 10px; }
.annual-label { font-size: 13px; color: var(--muted); }
.annual-value { font-size: 26px; font-weight: 800; color: var(--good); letter-spacing: -0.5px; }
.annual-negative { font-size: 14px; font-weight: 600; color: #b42318; }
.annual-sub { grid-column: 1 / -1; font-size: 12px; color: var(--muted); margin-top: 2px; }
.breakdown { list-style: none; margin: 0 0 10px; padding: 0; display: grid; gap: 6px; }
.breakdown li { display: grid; grid-template-columns: 96px 1fr auto; align-items: center; column-gap: 8px; font-size: 13px; }
.bd-tag { color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bd-bar { height: 8px; background: #eef1f5; border-radius: 4px; overflow: hidden; }
.bd-bar > span { display: block; height: 100%; background: var(--brand); border-radius: 4px; }
.bd-value { font-weight: 600; font-variant-numeric: tabular-nums; }
.bd-rest { grid-template-columns: 1fr; color: var(--muted); font-size: 12px; }
.detail { background: var(--bg); border-radius: 8px; padding: 10px 12px; margin-top: 8px; font-size: 13px; }
.detail-title { font-weight: 600; margin: 4px 0 4px; }
.tips { margin: 0 0 8px; padding-left: 18px; }
```
`.benefits .memo` 규칙은 지운다(메모를 더 이상 표시하지 않음).

- [ ] **Step 5: App.test.tsx 수정**

- `'조건 바꾸기를 누르면 첫 화면으로'`: `screen.getAllByRole('button', { name: '조건 바꾸기' })[0]` 클릭.
- `'범용 카드는 고른 태그에 딱 맞는 벤핏이 없어도 추천된다'`: 기대를 `expect(screen.getAllByText('연 최대').length).toBeGreaterThan(0)` 로 바꾸고 이름은 그대로 둔다. (무심형·학원·교육으로 범용 카드가 뜬다는 사실만 확인.)

- [ ] **Step 6: 실행·커밋**

Run: `npx vitest run src/ui` → PASS. `npx tsc -b --noEmit` → 0. `npm run build` → 성공.
```bash
git add src/ui/CardResult.tsx src/ui/CardResult.test.tsx src/ui/Results.tsx src/ui/App.test.tsx src/styles.css
git commit -m "ui: 결과 카드에 연 최대 혜택 큰 숫자·내역 막대·이렇게 쓰면 최대, 조건 요약 칩, ★·메모 제거"
```

---

### Task 4: 입력 화면 — 문구·프리셋 버튼

**Files:**
- Modify: `src/ui/StepProfile.tsx`, `src/ui/StepProfile.test.tsx`, `src/ui/StepTags.tsx`, `src/ui/StepTags.test.tsx`, `src/styles.css`(프리셋 버튼 스타일 몇 줄)

**Interfaces:**
- Consumes: `RULES.spendPresetsMan`.
- Produces: `PERSONAS` desc 문구 변경(아래 그대로), `TAG_WARN_TEXT` 변경.

- [ ] **Step 1: 테스트 추가/수정 (실패 확인)**

`StepProfile.test.tsx`의 첫 테스트 기대 문구를 바꾸고 프리셋 테스트를 추가한다:
```tsx
test('성향 3개와 설명이 보인다', () => {
  render(<Harness />)
  expect(screen.getByText('꼼꼼형')).toBeInTheDocument()
  expect(screen.getByText('실적·한도 다 따지고 결제 전에 어떤 카드 낼지 생각해요 → 한도를 다 챙긴다고 계산해요')).toBeInTheDocument()
  expect(screen.getByText('대충은 알고 쓰지만 매번 계산하진 않아요 → 한도의 80%로 계산해요')).toBeInTheDocument()
  expect(screen.getByText('한 장 꽂아두고 신경 끄고 싶어요 → 한도의 60%로 계산해요')).toBeInTheDocument()
})

test('사용액 빠른 선택 버튼을 누르면 입력칸에 들어간다', async () => {
  render(<Harness />)
  await userEvent.click(screen.getByRole('button', { name: '50만' }))
  expect(screen.getByLabelText(/한 달 카드 사용액/)).toHaveValue(50)
  await userEvent.click(screen.getByRole('button', { name: '150만' }))
  expect(screen.getByLabelText(/한 달 카드 사용액/)).toHaveValue(150)
})

test('연회비 힌트 문구', () => {
  render(<Harness />)
  expect(screen.getByText('이 금액을 넘는 카드는 안 보여줘요. 결과의 연 혜택은 연회비를 이미 뺀 금액이에요.')).toBeInTheDocument()
})
```
`StepTags.test.tsx`에서 주의 문구를 검사하는 부분은 새 문구 `'많이 고를수록 한도 합이 커져서 조건 많은 카드가 위로 와요. 2~3개가 딱 좋아요.'`로 바꾼다 (기존 테스트가 `TAG_WARN_TEXT` 상수를 import해 쓰면 그대로 두어도 된다 — 확인 후 결정).

- [ ] **Step 2: StepProfile.tsx 수정**

```tsx
import type { Persona } from '../data/types'
import { RULES } from '../engine/rules'
import { won } from './format'

export interface Profile {
  persona: Persona | null
  monthlySpendMan: number | ''
  feeLimit: number | null
}

export const PERSONAS: { value: Persona; label: string; desc: string }[] = [
  { value: 'meticulous', label: '꼼꼼형', desc: '실적·한도 다 따지고 결제 전에 어떤 카드 낼지 생각해요 → 한도를 다 챙긴다고 계산해요' },
  { value: 'moderate', label: '적당형', desc: '대충은 알고 쓰지만 매번 계산하진 않아요 → 한도의 80%로 계산해요' },
  { value: 'carefree', label: '무심형', desc: '한 장 꽂아두고 신경 끄고 싶어요 → 한도의 60%로 계산해요' },
]

export const FEE_SLIDER = { min: 0, max: 200_000, step: 10_000 } as const
export const FEE_HINT = '이 금액을 넘는 카드는 안 보여줘요. 결과의 연 혜택은 연회비를 이미 뺀 금액이에요.'
```
사용액 필드 부분:
```tsx
      <div className="field">
        <label htmlFor="spend">한 달 카드 사용액</label>
        <div className="presets">
          {RULES.spendPresetsMan.map((m) => (
            <button
              key={m}
              type="button"
              className={`preset ${value.monthlySpendMan === m ? 'is-selected' : ''}`}
              onClick={() => onChange({ ...value, monthlySpendMan: m })}
            >
              {m}만
            </button>
          ))}
        </div>
        <div className="input-row">
          <input id="spend" type="number" inputMode="numeric" min={0} value={value.monthlySpendMan}
            onChange={(e) => onChange({ ...value, monthlySpendMan: e.target.value === '' ? '' : Number(e.target.value) })} />
          <span>만 원</span>
        </div>
      </div>
```
연회비 슬라이더 값 표시 아래에 `<p className="field-hint">{FEE_HINT}</p>` 추가. 나머지는 그대로.

- [ ] **Step 3: StepTags.tsx 문구**

```ts
export const TAG_WARN_TEXT = '많이 고를수록 한도 합이 커져서 조건 많은 카드가 위로 와요. 2~3개가 딱 좋아요.'
```

- [ ] **Step 4: styles.css 추가**

```css
.presets { display: flex; gap: 6px; margin-bottom: 8px; }
.preset { flex: 1; padding: 8px 0; font-size: 14px; background: #fff; border: 1px solid var(--line); border-radius: 8px; cursor: pointer; }
.preset.is-selected { background: var(--brand); color: #fff; border-color: var(--brand); }
.field-hint { font-size: 12px; color: var(--muted); margin: 6px 0 0; }
```

- [ ] **Step 5: 실행·커밋**

Run: `npm test` → 전부 PASS. `npm run build` → 성공.
```bash
git add src/ui/StepProfile.tsx src/ui/StepProfile.test.tsx src/ui/StepTags.tsx src/ui/StepTags.test.tsx src/styles.css
git commit -m "ui: 입력 화면 문구(성향 반영 방식·연회비 힌트·태그 주의) + 사용액 빠른 선택 버튼"
```

---

## 완료 확인
- `npm test` 전부 통과, `npm run build` 성공.
- `git grep -n "isUniversalCard\|reasonLine\|maxBenefitTable\|personaMultiplier\|weight\." src` → 결과 없음.
- 실데이터로 스모크: 적당형·월 50만·연회비 3만·[온라인 쇼핑, 대중교통·택시] → 1위 카드에 "연 최대 약 ○○만 원"이 뜨고 내역 막대 2줄이 보인다.
