import { recommendMileage, mileageTip } from './mileage'
import { RULES } from './rules'
import type { Card, Query } from '../data/types'

const base: Card = {
  id: 'x', name: 'X', issuer: 'T', kind: 'credit', annualFee: 0, minSpend: 0,
  benefits: [], universal: null, complexity: 1,
  officialUrl: 'https://example.com', lastChecked: '2026-08-18', status: 'active',
}
let n = 0
const card = (over: Partial<Card>): Card => ({ ...base, ...over, id: over.id ?? `m${n++}` })
const q = (over: Partial<Query> = {}): Query => ({ persona: 'moderate', monthlySpend: 1_000_000, feeLimit: null, tags: ['마일리지'], ...over })

const mile1 = card({ id: 'one', annualFee: 39000, benefits: [{ tag: '마일리지', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 }] })
const mile067 = card({ id: 'sixseven', annualFee: 20000, benefits: [{ tag: '마일리지', type: 'mileage', rate: 0.067, monthlyCap: null, stars: 1 }] })
const pointsCard = card({ id: 'pts', universal: { type: 'points', rate: 1.5, monthlyCap: null }, benefits: [{ tag: '모든 가맹점', type: 'points', rate: 1.5, monthlyCap: null, stars: 3 }] })

describe('recommendMileage 후보·계산', () => {
  test('마일 적립이 없는 카드는 후보가 아니다', () => {
    expect(recommendMileage([pointsCard], q())).toHaveLength(0)
  })
  test('한도 없음: 월 마일 = S × rate/100, 연 = ×12', () => {
    const [r] = recommendMileage([mile1], q())
    expect(r.monthlyMiles).toBe(1000)
    expect(r.annualMiles).toBe(12000)
    expect(r.feePerMile).toBeCloseTo(3.25, 2)
  })
  test('한도 있음: 월 마일은 한도까지', () => {
    const c = card({ benefits: [{ tag: '마일리지', type: 'mileage', rate: 0.1, monthlyCap: 500, stars: 2 }] })
    const [r] = recommendMileage([c], q())
    expect(r.monthlyMiles).toBe(500)
  })
  test('구간: S에 맞는 구간의 rate, nextTier', () => {
    const c = card({ benefits: [{ tag: '마일리지', type: 'mileage', rate: 0.067, monthlyCap: null, stars: 1, tiers: [{ minSpend: 1_500_000, rate: 0.1, monthlyCap: null }] }] })
    const [low] = recommendMileage([c], q({ monthlySpend: 1_000_000 }))
    expect(low.rate).toBe(0.067)
    expect(low.nextTier?.minSpend).toBe(1_500_000)
    const [high] = recommendMileage([c], q({ monthlySpend: 2_000_000 }))
    expect(high.rate).toBe(0.1)
    expect(high.monthlyMiles).toBe(2000)
  })
  test('마일리지 벤핏이 없어도 마일리지형 universal이면 후보', () => {
    const c = card({ universal: { type: 'mileage', rate: 0.1, monthlyCap: null }, benefits: [{ tag: '모든 가맹점', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 }] })
    expect(recommendMileage([c], q())[0].monthlyMiles).toBe(1000)
  })
  test('덤(extras): 마일리지·모든 가맹점 이외 벤핏', () => {
    const c = card({
      universal: { type: 'mileage', rate: 0.1, monthlyCap: null },
      benefits: [
        { tag: '마일리지', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 },
        { tag: '모든 가맹점', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 },
        { tag: '해외 결제', type: 'mileage', rate: 0.2, monthlyCap: 1000, stars: 2 },
      ],
    })
    expect(recommendMileage([c], q())[0].extras.map((b) => b.tag)).toEqual(['해외 결제'])
  })
  test('연회비 0이면 feePerMile 0, 마일 0이면 null', () => {
    const free = card({ annualFee: 0, benefits: [{ tag: '마일리지', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 }] })
    expect(recommendMileage([free], q())[0].feePerMile).toBe(0)
    expect(recommendMileage([free], q({ monthlySpend: 0 }))[0].feePerMile).toBeNull()
  })
})

describe('recommendMileage 필터·정렬', () => {
  test('연회비 한도·실적·단종·제외 필터', () => {
    const pricey = card({ ...mile1, id: 'p', annualFee: 300000 })
    const highMin = card({ ...mile1, id: 'h', minSpend: 2_000_000 })
    const dead = card({ ...mile1, id: 'd', status: 'discontinued' })
    const excl = card({ ...mile1, id: 'e', status: 'excluded' })
    const got = recommendMileage([pricey, highMin, dead, excl, mile1], q({ feeLimit: 50000 }))
    expect(got.map((r) => r.card.id)).toEqual(['one'])
  })
  test('연 마일 큰 순, 같으면 연회비 낮은 순, topN', () => {
    const cheap = card({ ...mile1, id: 'cheap', annualFee: 10000 })
    const got = recommendMileage([mile067, mile1, cheap], q())
    expect(got.map((r) => r.card.id)).toEqual(['cheap', 'one', 'sixseven'])
    const many = Array.from({ length: 8 }, (_, i) => card({ ...mile1, id: `c${i}` }))
    expect(recommendMileage(many, q())).toHaveLength(RULES.topN)
  })
  test('성향은 마일 수에 영향 없지만, 적당형·무심형은 복잡도 3 카드를 안 본다', () => {
    const a = recommendMileage([mile1], q({ persona: 'carefree' }))[0]
    const b = recommendMileage([mile1], q({ persona: 'meticulous' }))[0]
    expect(a.annualMiles).toBe(b.annualMiles)
    const c3 = card({ ...mile1, id: 'c3', complexity: 3 })
    expect(recommendMileage([c3], q({ persona: 'meticulous' }))).toHaveLength(1)
    expect(recommendMileage([c3], q({ persona: 'moderate' }))).toHaveLength(0)
    expect(recommendMileage([c3], q({ persona: 'carefree' }))).toHaveLength(0)
  })
})

describe('mileageTip', () => {
  test('한도 없음', () => {
    const [r] = recommendMileage([mile1], q())
    expect(mileageTip(r)).toBe('쓰는 만큼 1,000원당 1마일 — 한도 없음')
  })
  test('한도 있음: 필요 지출', () => {
    const c = card({ benefits: [{ tag: '마일리지', type: 'mileage', rate: 0.1, monthlyCap: 500, stars: 2 }] })
    expect(mileageTip(recommendMileage([c], q())[0])).toBe('월 50만 원 이상 쓰면 한도(500마일)를 꽉 채워요')
  })
  test('다음 구간 안내', () => {
    const c = card({ benefits: [{ tag: '마일리지', type: 'mileage', rate: 0.067, monthlyCap: null, stars: 1, tiers: [{ minSpend: 1_500_000, rate: 0.1, monthlyCap: null }] }] })
    expect(mileageTip(recommendMileage([c], q())[0])).toBe('쓰는 만큼 1,500원당 1마일 — 한도 없음 (월 사용액 150만 원부터는 1,000원당 1마일)')
  })
})

describe('연간 보너스 마일 (mileageBonus)', () => {
  const bonusCard = card({
    id: 'first', annualFee: 800000,
    benefits: [{ tag: '마일리지', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 }],
    mileageBonus: { miles: 30000, minAnnualSpend: 36_000_000, firstYearMinSpend: 1_000_000 },
  })
  test('연 이용액이 조건 이상이면 보너스를 연 마일에 더한다', () => {
    const [r] = recommendMileage([bonusCard], q({ monthlySpend: 3_000_000 }))
    expect(r.baseAnnualMiles).toBe(36000)
    expect(r.bonusMiles).toBe(30000)
    expect(r.annualMiles).toBe(66000)
  })
  test('조건 미달이면 보너스 0 (첫해 조건은 순위에 안 쓴다)', () => {
    const [r] = recommendMileage([bonusCard], q({ monthlySpend: 1_000_000 }))
    expect(r.bonusMiles).toBe(0)
    expect(r.annualMiles).toBe(12000)
    expect(r.firstYearBonus).toBe(true)  // 첫해 조건(누적 100만)은 충족 → 안내용
  })
  test('보너스 덕에 순위가 올라간다', () => {
    const got = recommendMileage([mile1, bonusCard], q({ monthlySpend: 3_000_000 }))
    expect(got[0].card.id).toBe('first')
  })
  test('보너스 없는 카드는 0·false', () => {
    const [r] = recommendMileage([mile1], q())
    expect(r.bonusMiles).toBe(0)
    expect(r.firstYearBonus).toBe(false)
  })
})

describe('bonusText', () => {
  test('첫해·이후 조건을 한 줄로', async () => {
    const { bonusText } = await import('./mileage')
    expect(bonusText({ miles: 30000, minAnnualSpend: 36_000_000, firstYearMinSpend: 1_000_000 })).toBe('연간 보너스 30,000마일 — 첫해는 누적 100만 원, 이후엔 연 3600만 원 이상 쓸 때')
    expect(bonusText({ miles: 1000, minAnnualSpend: 0 })).toBe('연간 보너스 1,000마일 — 매년')
    expect(bonusText({ miles: 5000, minAnnualSpend: 12_000_000 })).toBe('연간 보너스 5,000마일 — 연 1200만 원 이상 쓸 때')
  })
})

describe('mileageGroups: 일반/프리미엄 조건부 묶음', () => {
  const cheap = (id: string, fee: number) => card({ id, annualFee: fee, benefits: [{ tag: '마일리지', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 }] })
  const pool = [cheap('c1', 20000), cheap('c2', 39000), cheap('c3', 45000), cheap('c4', 47000), cheap('p1', 120000), cheap('p2', 300000), cheap('p3', 800000), cheap('p4', 1000000)]
  test('연회비 한도가 프리미엄 기준 미만이면 한 줄(topN)', async () => {
    const { mileageGroups } = await import('./mileage')
    const g = mileageGroups(pool, q({ feeLimit: 50000 }))
    expect(g.grouped).toBe(false)
    if (!g.grouped) expect(g.all.map((r) => r.card.id)).toEqual(['c1', 'c2', 'c3', 'c4'])
  })
  test('한도 상관없음이면 일반 3장 + 프리미엄 3장', async () => {
    const { mileageGroups } = await import('./mileage')
    const g = mileageGroups(pool, q({ feeLimit: null }))
    expect(g.grouped).toBe(true)
    if (g.grouped) {
      expect(g.regular.map((r) => r.card.id)).toEqual(['c1', 'c2', 'c3'])
      expect(g.premium.map((r) => r.card.id)).toEqual(['p1', 'p2', 'p3'])
    }
  })
  test('한도가 프리미엄 기준 이상이면 묶고, 프리미엄 묶음은 한도 안에서만', async () => {
    const { mileageGroups } = await import('./mileage')
    const g = mileageGroups(pool, q({ feeLimit: 300000 }))
    expect(g.grouped).toBe(true)
    if (g.grouped) expect(g.premium.map((r) => r.card.id)).toEqual(['p1', 'p2'])
  })
  test('한 묶음이 비어도 grouped (화면에서 그 묶음만 숨김)', async () => {
    const { mileageGroups } = await import('./mileage')
    const g = mileageGroups([cheap('c1', 20000)], q({ feeLimit: null }))
    expect(g.grouped).toBe(true)
    if (g.grouped) expect(g.premium).toEqual([])
  })
})
