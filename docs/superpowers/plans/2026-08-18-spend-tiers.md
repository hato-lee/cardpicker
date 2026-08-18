# 실적 구간(tiers) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 혜택마다 전월 실적 구간별 요율·월 한도(`tiers`)를 데이터에 넣고, 엔진이 사용자의 한 달 사용액 S에 맞는 구간을 골라 계산하며, 화면·설명 문구에 구간 정보를 보여준다.

**Architecture:** `Benefit`/`Universal`에 선택 필드 `tiers: Tier[]`(기본값보다 높은 구간만, minSpend 오름차순)를 추가하고 zod 스키마로 검증한다. `benefit.ts`의 `makeRow` 앞에 `resolveTier(b, S)`를 끼워 넣어 적용 구간의 rate/monthlyCap과 `nextTier`를 얻고, 나머지 계산은 그대로 둔다. `explain.ts` tip 끝에 다음 구간 한 마디, `CardResult.tsx` 전체 혜택 줄에 구간 표기를 붙인다. 데이터 이행은 코드 밖(에이전트 패치)에서 한다.

**Tech Stack:** React 19 + TypeScript + Vite, Vitest 4 (jsdom, globals, jest-dom), @testing-library/react + user-event, zod v4 (`strictObject`, 한국어 메시지).

**Spec:** `docs/superpowers/specs/2026-08-18-spend-tiers-design.md`

## Global Constraints

- 스키마는 `z.strictObject` — 정의 안 된 필드는 거부. 에러 메시지는 한국어.
- `tiers`: `minSpend` **엄격히 오름차순**, 모두 카드 `minSpend`보다 **커야** 한다. `rate` 생략 시 기본 rate. `monthlyCap`은 정수 ≥0 또는 null.
- 같은 `capGroup` 혜택들은 (기본 monthlyCap 동일 + non-null) **그리고** `tiers`의 (minSpend, monthlyCap) 열이 같아야 한다(rate는 달라도 됨).
- `universal.tiers`가 있으면 `모든 가맹점` 벤핏의 `tiers`와 (minSpend, monthlyCap) 열이 같아야 한다.
- 엔진: `tiers` 중 `minSpend ≤ S`인 마지막 구간 적용, 없으면 기본값. `BenefitRow.rate/monthlyCap`은 적용된 구간 값. RULES 변경 없음.
- 문구(정확히): tip 괄호 `(월 사용액 {won(minSpend)}부터는 한도 {cap})` / 요율도 다르면 `(월 사용액 {won(minSpend)}부터는 {rateText}·한도 {cap})`; cap null이면 `한도 없음`. 전체 혜택 줄 `(실적 {won(minSpend)}↑ [rate·]{cap}, …)`.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` 줄. 테스트 실행: `npx vitest run <파일>`; 전체: `npm test`.

---

### Task 1: 데이터 타입 + 스키마 (tiers)

**Files:**
- Modify: `src/data/types.ts`
- Modify: `src/data/schema.ts`
- Test: `src/data/schema.test.ts`

**Interfaces:**
- Produces: `export interface Tier { minSpend: number; rate?: number; monthlyCap: number | null }`, `Benefit.tiers?: Tier[]`, `Universal.tiers?: Tier[]`. 이후 태스크는 이 이름을 그대로 쓴다.

- [ ] **Step 1: 실패하는 테스트 추가** — `src/data/schema.test.ts` 맨 아래에:

```ts
const tiered = {
  ...good,
  minSpend: 300000,
  benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3,
      tiers: [{ minSpend: 700000, monthlyCap: 30000 }, { minSpend: 1000000, rate: 12, monthlyCap: 50000 }] },
  ],
}

test('tiers: 올바르면 통과하고 값이 보존된다', () => {
  const [c] = validateCards([tiered])
  expect(c.benefits[0].tiers).toEqual([{ minSpend: 700000, monthlyCap: 30000 }, { minSpend: 1000000, rate: 12, monthlyCap: 50000 }])
})

test('tiers: minSpend가 오름차순이 아니면 실패', () => {
  const bad = { ...tiered, benefits: [{ ...tiered.benefits[0], tiers: [{ minSpend: 1000000, monthlyCap: 50000 }, { minSpend: 700000, monthlyCap: 30000 }] }] }
  expect(() => validateCards([bad])).toThrow(/오름차순/)
})

test('tiers: 같은 minSpend가 두 번이면 실패', () => {
  const bad = { ...tiered, benefits: [{ ...tiered.benefits[0], tiers: [{ minSpend: 700000, monthlyCap: 30000 }, { minSpend: 700000, monthlyCap: 40000 }] }] }
  expect(() => validateCards([bad])).toThrow(/오름차순/)
})

test('tiers: 카드 minSpend 이하인 구간은 실패', () => {
  const bad = { ...tiered, benefits: [{ ...tiered.benefits[0], tiers: [{ minSpend: 300000, monthlyCap: 30000 }] }] }
  expect(() => validateCards([bad])).toThrow(/카드 minSpend/)
})

test('tiers: 모르는 필드는 실패', () => {
  const bad = { ...tiered, benefits: [{ ...tiered.benefits[0], tiers: [{ minSpend: 700000, monthlyCap: 30000, cap: 1 }] }] }
  expect(() => validateCards([bad])).toThrow()
})

test('capGroup: 같은 그룹인데 tiers의 minSpend/monthlyCap 열이 다르면 실패', () => {
  const bad = { ...tiered, benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 5000, stars: 2, capGroup: 'g', tiers: [{ minSpend: 700000, monthlyCap: 10000 }] },
    { tag: '통신비·OTT', type: 'discount', rate: 5, monthlyCap: 5000, stars: 2, capGroup: 'g', tiers: [{ minSpend: 700000, monthlyCap: 20000 }] },
  ] }
  expect(() => validateCards([bad])).toThrow(/capGroup 'g'.*tiers/)
  const bad2 = { ...bad, benefits: [bad.benefits[0], { ...bad.benefits[1], tiers: undefined }] }
  expect(() => validateCards([bad2])).toThrow(/capGroup 'g'.*tiers/)
})

test('capGroup: tiers의 rate가 달라도 minSpend/monthlyCap이 같으면 통과', () => {
  const ok = { ...tiered, benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 5000, stars: 2, capGroup: 'g', tiers: [{ minSpend: 700000, rate: 12, monthlyCap: 10000 }] },
    { tag: '통신비·OTT', type: 'discount', rate: 5, monthlyCap: 5000, stars: 2, capGroup: 'g', tiers: [{ minSpend: 700000, monthlyCap: 10000 }] },
  ] }
  expect(validateCards([ok])).toHaveLength(1)
})

test('universal.tiers는 모든 가맹점 벤핏의 tiers와 열이 같아야 한다', () => {
  const uni = { ...good, minSpend: 200000,
    universal: { type: 'points', rate: 0.2, monthlyCap: 5000, tiers: [{ minSpend: 400000, monthlyCap: 15000 }] },
    benefits: [{ tag: '모든 가맹점', type: 'points', rate: 0.2, monthlyCap: 5000, stars: 1, tiers: [{ minSpend: 400000, monthlyCap: 15000 }] }] }
  expect(validateCards([uni])).toHaveLength(1)
  const bad = { ...uni, benefits: [{ ...uni.benefits[0], tiers: [{ minSpend: 400000, monthlyCap: 30000 }] }] }
  expect(() => validateCards([bad])).toThrow(/universal.*tiers/)
})
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/data/schema.test.ts` → 새 테스트들이 FAIL (tiers가 strictObject에서 거부되거나 에러 메시지 불일치).

- [ ] **Step 3: types.ts 수정** — `Benefit` 위에 `Tier` 추가, `Benefit`·`Universal`에 `tiers?`:

```ts
// 전월 실적 구간. 기본 rate/monthlyCap은 카드 minSpend부터 적용되는 최저 구간이고, tiers에는 그 위 구간만 minSpend 오름차순으로 적는다
export interface Tier {
  minSpend: number          // 이 실적(원) 이상이면 이 구간. 카드 minSpend보다 커야 한다
  rate?: number             // 없으면 기본 rate 그대로
  monthlyCap: number | null // 이 구간의 월 한도(원, mileage면 마일). null = 한도 없음
}

export interface Benefit {
  tag: Tag
  type: BenefitType
  rate: number            // 퍼센트. 마일리지는 "1,000원당 1마일" = 0.1
  monthlyCap: number | null
  stars: Stars
  note?: string
  capGroup?: string
  tiers?: Tier[]
}

export interface Universal {
  type: BenefitType
  rate: number
  monthlyCap: number | null
  tiers?: Tier[]
}
```
(기존 주석은 유지.)

- [ ] **Step 4: schema.ts 수정**

`benefitSchema` 위에:
```ts
const tierSchema = z.strictObject({
  minSpend: z.number().int().min(0),
  rate: z.number().min(0).optional(),
  monthlyCap: z.number().int().min(0).nullable(),
})
const tiersSchema = z.array(tierSchema).optional()
```
`benefitSchema`에 `tiers: tiersSchema,` 추가. `universal`의 strictObject에도 `tiers: tiersSchema,` 추가.

`superRefine` 안에 추가 (기존 검사 뒤):
```ts
    // tiers: 오름차순 + 카드 minSpend 초과
    const allTierOwners: Array<{ where: string; tiers?: { minSpend: number; monthlyCap: number | null }[] }> = [
      ...data.benefits.map((b) => ({ where: `benefits.${b.tag}`, tiers: b.tiers })),
      ...(data.universal ? [{ where: 'universal', tiers: data.universal.tiers }] : []),
    ]
    for (const { where, tiers } of allTierOwners) {
      if (!tiers) continue
      for (let i = 0; i < tiers.length; i++) {
        if (tiers[i].minSpend <= data.minSpend) {
          ctx.addIssue({ code: 'custom', path: [where, 'tiers'], message: `tiers의 minSpend는 카드 minSpend(${data.minSpend})보다 커야 합니다 (${data.id})` })
          break
        }
        if (i > 0 && tiers[i].minSpend <= tiers[i - 1].minSpend) {
          ctx.addIssue({ code: 'custom', path: [where, 'tiers'], message: `tiers의 minSpend는 엄격히 오름차순이어야 합니다 (${data.id})` })
          break
        }
      }
    }
    // capGroup: tiers의 (minSpend, monthlyCap) 열이 같아야 한다
    const tierKey = (t?: { minSpend: number; monthlyCap: number | null }[]) => JSON.stringify((t ?? []).map((x) => [x.minSpend, x.monthlyCap]))
    const tiersByGroup = new Map<string, string[]>()
    for (const b of data.benefits) {
      if (!b.capGroup) continue
      const arr = tiersByGroup.get(b.capGroup) ?? []
      arr.push(tierKey(b.tiers))
      tiersByGroup.set(b.capGroup, arr)
    }
    for (const [g, keys] of tiersByGroup) {
      if (!keys.every((k) => k === keys[0])) {
        ctx.addIssue({ code: 'custom', path: ['benefits'], message: `capGroup '${g}'의 tiers(minSpend·monthlyCap)가 서로 다릅니다 (${data.id})` })
      }
    }
    // universal.tiers ↔ 모든 가맹점 벤핏 tiers
    if (data.universal?.tiers) {
      const uniB = data.benefits.find((b) => b.tag === '모든 가맹점')
      if (uniB && tierKey(uniB.tiers) !== tierKey(data.universal.tiers)) {
        ctx.addIssue({ code: 'custom', path: ['universal', 'tiers'], message: `universal의 tiers와 '모든 가맹점' 벤핏의 tiers(minSpend·monthlyCap)가 다릅니다 (${data.id})` })
      }
    }
```

- [ ] **Step 5: 통과 확인** — Run: `npx vitest run src/data` → 전부 PASS (cards.test.ts 포함 — 실제 cards.json은 아직 tiers 없음이라 그대로 통과).

- [ ] **Step 6: 커밋**
```bash
git add src/data/types.ts src/data/schema.ts src/data/schema.test.ts
git commit -m "data: 실적 구간 tiers 필드 + 스키마 검증(오름차순·카드 minSpend 초과·capGroup/universal 일치)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 엔진 — S에 맞는 구간 적용 (`resolveTier`)

**Files:**
- Modify: `src/engine/benefit.ts`
- Test: `src/engine/benefit.test.ts`

**Interfaces:**
- Consumes: `Tier`, `Benefit.tiers`, `Universal.tiers` (Task 1).
- Produces: `BenefitRow.nextTier?: Tier` (적용 구간 바로 위 구간). `export function resolveTier(b: { rate: number; monthlyCap: number | null; tiers?: Tier[] }, spend: number): { rate: number; monthlyCap: number | null; nextTier?: Tier }`.

- [ ] **Step 1: 실패하는 테스트** — `src/engine/benefit.test.ts` 맨 아래에:

```ts
describe('실적 구간(tiers)', () => {
  const tiered = card({ minSpend: 300_000, benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3,
      tiers: [{ minSpend: 700_000, monthlyCap: 30000 }, { minSpend: 1_000_000, rate: 12, monthlyCap: 50000 }] },
  ] })

  test('S가 첫 구간 아래면 기본값, nextTier는 첫 구간', () => {
    const r = annualBenefit(tiered, q({ monthlySpend: 500_000 }))!
    expect(r.rows[0].rate).toBe(10)
    expect(r.rows[0].monthlyCap).toBe(15000)
    expect(r.rows[0].monthlyValue).toBe(15000)
    expect(r.rows[0].nextTier).toEqual({ minSpend: 700_000, monthlyCap: 30000 })
  })

  test('S가 구간 경계와 같으면 그 구간', () => {
    const r = annualBenefit(tiered, q({ monthlySpend: 700_000 }))!
    expect(r.rows[0].monthlyCap).toBe(30000)
    expect(r.rows[0].rate).toBe(10) // rate 생략 → 기본 rate
    expect(r.rows[0].monthlyValue).toBe(30000)
    expect(r.rows[0].requiredSpend).toBe(300_000)
    expect(r.rows[0].nextTier).toEqual({ minSpend: 1_000_000, rate: 12, monthlyCap: 50000 })
  })

  test('S가 최상위 구간 위면 최상위, nextTier 없음', () => {
    const r = annualBenefit(tiered, q({ monthlySpend: 2_000_000 }))!
    expect(r.rows[0].rate).toBe(12)
    expect(r.rows[0].monthlyCap).toBe(50000)
    expect(r.rows[0].nextTier).toBeUndefined()
  })

  test('tiers 없는 벤핏은 nextTier 없음', () => {
    const c = card({ benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3 }] })
    expect(annualBenefit(c, q())!.rows[0].nextTier).toBeUndefined()
  })

  test('구간에서 한도가 풀리면(null) 한도 없는 정률로 계산', () => {
    const c = card({ minSpend: 0, benefits: [
      { tag: '해외 결제', type: 'discount', rate: 2, monthlyCap: 10000, stars: 1, tiers: [{ minSpend: 1_000_000, monthlyCap: null }] },
    ] })
    const r = annualBenefit(c, q({ tags: ['해외 결제'], monthlySpend: 1_000_000 }))!
    // 영역 줄, cap null → 가정 한도 1만 (spend×2% = 2만 > 1만)
    expect(r.rows[0].monthlyCap).toBeNull()
    expect(r.rows[0].monthlyValue).toBe(RULES.assumedCapWhenUnknown)
    expect(r.rows[0].assumedCap).toBe(true)
  })

  test('capGroup + tiers: 그룹 한도가 구간 따라 커진다', () => {
    const c = card({ minSpend: 400_000, benefits: [
      { tag: '주유', type: 'discount', rate: 2.5, monthlyCap: 5000, stars: 1, capGroup: 'main', tiers: [{ minSpend: 700_000, monthlyCap: 10000 }] },
      { tag: '통신비·OTT', type: 'discount', rate: 2.5, monthlyCap: 5000, stars: 1, capGroup: 'main', tiers: [{ minSpend: 700_000, monthlyCap: 10000 }] },
    ] })
    const low = annualBenefit(c, q({ tags: ['주유', '통신비·OTT'], monthlySpend: 500_000 }))!
    expect(low.monthlyMax).toBeCloseTo(5000, 5)   // 그룹 한도 5천 (총액 상한: 필요지출 40만 ≤ 50만이라 그대로)
    const high = annualBenefit(c, q({ tags: ['주유', '통신비·OTT'], monthlySpend: 1_000_000 }))!
    expect(high.monthlyMax).toBeCloseTo(10000, 5) // 그룹 한도 1만
  })

  test('범용 줄도 universal.tiers를 따른다', () => {
    const c = card({ minSpend: 200_000,
      universal: { type: 'points', rate: 0.2, monthlyCap: 5000, tiers: [{ minSpend: 400_000, monthlyCap: 15000 }] },
      benefits: [{ tag: '모든 가맹점', type: 'points', rate: 0.2, monthlyCap: 5000, stars: 1, tiers: [{ minSpend: 400_000, monthlyCap: 15000 }] }] })
    const r = annualBenefit(c, q({ tags: ['주유'], monthlySpend: 400_000 }))!
    expect(r.rows[0].viaUniversal).toBe(true)
    expect(r.rows[0].monthlyCap).toBe(15000)
  })
})
```
`describe`는 vitest globals라 import 없이 쓴다.

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/engine/benefit.test.ts` → 새 테스트 FAIL (nextTier undefined, cap 미반영).

- [ ] **Step 3: 구현** — `benefit.ts`:

import 줄을 `import type { Card, Query, Benefit, BenefitType, Tier } from '../data/types'`로. `BenefitRow`에 `nextTier?: Tier   // 적용 구간 바로 위 구간(있으면). 설명 문구용` 추가.

`toWon` 아래에:
```ts
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
```

`makeRow`의 매개변수 타입에 `tiers?: Tier[]` 추가하고, 첫 줄에서 resolve한 값을 쓴다:
```ts
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
  ...
```
이후 본문의 `b.rate` → `rate`, `b.monthlyCap` → `cap`으로 바꾸고, 반환 객체는 `{ tag: b.tag, type: b.type, rate, monthlyCap: cap, note: b.note, capGroup: b.capGroup, monthlyValue, requiredSpend, viaUniversal, assumedCap, nextTier: t.nextTier }`. `annualBenefit`의 범용 호출 `makeRow({ tag: UNIVERSAL_TAG, ...card.universal! }, S, true, rules)`은 spread로 `tiers`가 함께 넘어가므로 그대로.

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/engine` → 전부 PASS.

- [ ] **Step 5: 커밋**
```bash
git add src/engine/benefit.ts src/engine/benefit.test.ts
git commit -m "engine: 사용액에 맞는 실적 구간(tiers) 적용 — resolveTier, BenefitRow.nextTier

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 설명 문구 — 다음 구간 한 마디

**Files:**
- Modify: `src/engine/explain.ts`
- Test: `src/engine/explain.test.ts`

**Interfaces:**
- Consumes: `BenefitRow.nextTier` (Task 2), `won`, `rateText` (`src/ui/format.ts`).

- [ ] **Step 1: 실패하는 테스트** — `src/engine/explain.test.ts` 맨 아래에:

```ts
describe('다음 구간 안내', () => {
  const tiered: Card = { ...base, minSpend: 300_000, benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3,
      tiers: [{ minSpend: 700_000, monthlyCap: 30000 }, { minSpend: 1_000_000, rate: 12, monthlyCap: 50000 }] },
  ] }

  test('한도만 다르면 "(월 사용액 …부터는 한도 …)"', () => {
    const ab = annualBenefit(tiered, q({ monthlySpend: 500_000 }))!
    expect(tips(ab, 'meticulous')[0]).toBe('주유에 월 15만 원 이상 쓰면 한도(1.5만 원)를 꽉 채워요 (월 사용액 70만 원부터는 한도 3만 원)')
  })

  test('요율도 다르면 요율·한도', () => {
    const ab = annualBenefit(tiered, q({ monthlySpend: 700_000 }))!
    expect(tips(ab, 'meticulous')[0]).toBe('주유에 월 30만 원 이상 쓰면 한도(3만 원)를 꽉 채워요 (월 사용액 100만 원부터는 12% 할인·한도 5만 원)')
  })

  test('최상위 구간이면 괄호 없음', () => {
    const ab = annualBenefit(tiered, q({ monthlySpend: 1_000_000 }))!
    expect(tips(ab, 'meticulous')[0]).toBe('주유에 월 41.7만 원 이상 쓰면 한도(5만 원)를 꽉 채워요')
  })

  test('다음 구간에서 한도가 풀리면 "한도 없음"', () => {
    const c: Card = { ...base, minSpend: 0, benefits: [
      { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3, tiers: [{ minSpend: 1_000_000, monthlyCap: null }] },
    ] }
    const ab = annualBenefit(c, q({ monthlySpend: 500_000 }))!
    expect(tips(ab, 'meticulous')[0]).toBe('주유에 월 15만 원 이상 쓰면 한도(1.5만 원)를 꽉 채워요 (월 사용액 100만 원부터는 한도 없음)')
  })

  test('범용 줄에는 안 붙는다', () => {
    const c: Card = { ...base, minSpend: 0,
      universal: { type: 'points', rate: 1, monthlyCap: 10000, tiers: [{ minSpend: 1_000_000, monthlyCap: 30000 }] },
      benefits: [{ tag: '모든 가맹점', type: 'points', rate: 1, monthlyCap: 10000, stars: 3, tiers: [{ minSpend: 1_000_000, monthlyCap: 30000 }] }] }
    const ab = annualBenefit(c, q({ tags: ['주유'], monthlySpend: 500_000 }))!
    expect(tips(ab, 'meticulous')[0]).toBe('그 외 소비는 모든 가맹점 1% 적립')
  })
})
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/engine/explain.test.ts` → 새 테스트 FAIL.

- [ ] **Step 3: 구현** — `explain.ts`의 `tipOf` 마지막 두 줄을 이렇게:

```ts
  const cap = row.type === 'mileage' ? `${row.monthlyCap.toLocaleString('ko-KR')}마일` : won(row.monthlyCap)
  const main = `${row.tag}에 월 ${won(Math.round(row.requiredSpend!))} 이상 쓰면 한도(${cap})를 꽉 채워요`
  return row.nextTier ? `${main} ${nextTierText(row, row.nextTier)}` : main
}

/** "(월 사용액 70만 원부터는 한도 3만 원)" — 요율도 다르면 "… 12% 할인·한도 3만 원" */
function nextTierText(row: BenefitRow, next: Tier): string {
  const capText = next.monthlyCap === null ? '한도 없음'
    : `한도 ${row.type === 'mileage' ? `${next.monthlyCap.toLocaleString('ko-KR')}마일` : won(next.monthlyCap)}`
  const rateDiffers = next.rate !== undefined && next.rate !== row.rate
  const body = rateDiffers ? `${rateText(row.type, next.rate!)}·${capText}` : capText
  return `(월 사용액 ${won(next.minSpend)}부터는 ${body})`
}
```
import에 `import type { Persona, Tier } from '../data/types'`.

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/engine` → PASS.

- [ ] **Step 5: 커밋**
```bash
git add src/engine/explain.ts src/engine/explain.test.ts
git commit -m "explain: 한도 tip 끝에 다음 실적 구간 안내

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 화면 — 전체 혜택 줄에 구간 표기 + 브리프 규칙

**Files:**
- Modify: `src/ui/CardResult.tsx` (`benefitText`)
- Test: `src/ui/CardResult.test.tsx`
- Modify: `docs/data-collection/BRIEF.md`, `docs/data-collection/verify-2026-08-18/VERIFY-BRIEF.md`

**Interfaces:**
- Consumes: `Benefit.tiers` (Task 1), `won`, `rateText`.

- [ ] **Step 1: 실패하는 테스트** — `src/ui/CardResult.test.tsx` 맨 아래에:

```ts
test('전체 혜택 줄에 실적 구간이 붙는다', async () => {
  const tiered: Card = { ...oil, benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3, note: '정유사 1곳 선택',
      tiers: [{ minSpend: 700000, monthlyCap: 30000 }, { minSpend: 1000000, rate: 12, monthlyCap: 50000 }] },
    { tag: '카페·편의점', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
  ] }
  const s: Scored = { card: tiered, benefit: annualBenefit(tiered, q)!, coveredTags: ['주유', '카페·편의점'], universalCovers: [] }
  render(<CardResult rank={2} scored={s} persona="moderate" today={today} />)
  await userEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
  expect(screen.getByText('주유 10% 할인 · 월 최대 1.5만 원 (실적 70만 원↑ 3만 원, 100만 원↑ 12% 할인·5만 원) (정유사 1곳 선택)')).toBeInTheDocument()
  expect(screen.getByText('카페·편의점 5% 할인 · 월 최대 5,000원')).toBeInTheDocument()
})
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/ui/CardResult.test.tsx` → 새 테스트 FAIL.

- [ ] **Step 3: 구현** — `CardResult.tsx`의 `benefitText`를:

```ts
/** 실적 구간 표기: "(실적 70만 원↑ 3만 원, 100만 원↑ 12% 할인·5만 원)". rate가 기본과 같으면 요율 생략 */
function tiersText(b: Benefit): string {
  if (!b.tiers || b.tiers.length === 0) return ''
  const parts = b.tiers.map((t) => {
    const cap = t.monthlyCap === null ? '한도 없음'
      : b.type === 'mileage' ? `${t.monthlyCap.toLocaleString('ko-KR')}마일` : won(t.monthlyCap)
    const rate = t.rate !== undefined && t.rate !== b.rate ? `${rateText(b.type, t.rate)}·` : ''
    return `실적 ${won(t.minSpend)}↑ ${rate}${cap}`
  })
  return ` (${parts.join(', ')})`
}

function benefitText(b: Benefit): string {
  return `${b.tag} ${rateText(b.type, b.rate)} · ${capText(b.type, b.monthlyCap)}${tiersText(b)}${b.note ? ` (${b.note})` : ''}`
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/ui` → PASS. 이어서 `npm test` 전체 PASS, `npx tsc -b --noEmit` 에러 없음.

- [ ] **Step 5: 브리프 규칙 추가** — `docs/data-collection/BRIEF.md`의 "추가 지침" 끝과 `docs/data-collection/verify-2026-08-18/VERIFY-BRIEF.md`의 "확인할 것" 3번 아래에 같은 문단:

```
- **실적 구간이 있으면 `tiers`로 적어라.** 기본 rate/monthlyCap은 카드 minSpend부터 적용되는 **최저 구간** 값. 그 위 구간은 `"tiers": [{ "minSpend": 700000, "monthlyCap": 30000 }, { "minSpend": 1000000, "rate": 12, "monthlyCap": 50000 }]` 처럼 minSpend 오름차순으로(카드 minSpend보다 커야 함). rate는 기본과 다를 때만. 통합 한도(capGroup) 혜택들은 tiers의 minSpend·monthlyCap이 서로 같아야 한다. `universal`에 구간이 있으면 universal.tiers와 '모든 가맹점' 벤핏의 tiers를 같게. note에는 구간을 다시 나열하지 마라(화면이 구조적으로 보여준다).
```

- [ ] **Step 6: 커밋**
```bash
git add src/ui/CardResult.tsx src/ui/CardResult.test.tsx docs/data-collection/BRIEF.md docs/data-collection/verify-2026-08-18/VERIFY-BRIEF.md
git commit -m "ui: 전체 혜택 줄에 실적 구간 표기 + 수집 브리프에 tiers 규칙

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-review
- 스펙 커버: 데이터(Task 1), 엔진 resolve·nextTier·capGroup·universal(Task 2), 설명(Task 3), 화면·브리프(Task 4). 데이터 이행은 스펙대로 코드 밖(에이전트 패치, 계획 실행 후 컨트롤러가 진행).
- 타입 이름 일관: `Tier`, `tiers`, `nextTier`, `resolveTier` 전 태스크 동일.
- 문구는 Global Constraints와 테스트 기대 문자열이 같은지 확인함(`(월 사용액 70만 원부터는 한도 3만 원)`, `(실적 70만 원↑ 3만 원, 100만 원↑ 12% 할인·5만 원)`).
