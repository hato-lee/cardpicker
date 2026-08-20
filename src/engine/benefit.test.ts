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
  const r = annualBenefit(c, q({ tags: ['해외 결제'], monthlySpend: 400_000 }))!
  expect(r.rows[0].monthlyValue).toBe(8000)
  expect(r.rows[0].requiredSpend).toBe(400_000)
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
    { tag: '카페', type: 'discount', rate: 10, monthlyCap: 20000, stars: 3 }, // 20만
  ] })
  const ok = annualBenefit(c, q({ tags: ['주유', '카페'], monthlySpend: 400_000 }))!
  expect(ok.clampFactor).toBe(1)
  expect(ok.monthlyMax).toBe(40000)
  const tight = annualBenefit(c, q({ tags: ['주유', '카페'], monthlySpend: 200_000 }))!
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

test('연회비 차감, 성향은 금액에 영향 없음', () => {
  const c = card({ annualFee: 30000, benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 10000, stars: 2 }] })
  expect(annualBenefit(c, q({ persona: 'meticulous' }))!.annualNet).toBe(120000 - 30000)
  expect(annualBenefit(c, q({ persona: 'moderate' }))!.annualNet).toBe(120000 - 30000)
  expect(annualBenefit(c, q({ persona: 'carefree' }))!.annualNet).toBe(120000 - 30000)
})

test('한도 정보 없는 영역 할인은 가정 한도까지만', () => {
  const c = card({ benefits: [{ tag: '온라인 쇼핑', type: 'discount', rate: 10, monthlyCap: null, stars: 2 }] })
  const r = annualBenefit(c, q({ tags: ['온라인 쇼핑'], monthlySpend: 500_000 }))!
  expect(r.rows[0].monthlyValue).toBe(RULES.assumedCapWhenUnknown)
  expect(r.rows[0].requiredSpend).toBe(RULES.assumedCapWhenUnknown / 0.1)
  expect(r.rows[0].assumedCap).toBe(true)
})
test('가정 한도에 안 걸리면 assumedCap=false, 값은 S×rate', () => {
  const c = card({ benefits: [{ tag: '대중교통·택시', type: 'points', rate: 0.8, monthlyCap: null, stars: 1 }] })
  const r = annualBenefit(c, q({ tags: ['대중교통·택시'], monthlySpend: 500_000 }))!
  expect(r.rows[0].monthlyValue).toBe(4000)
  expect(r.rows[0].assumedCap).toBe(false)
})
test('범용 줄과 마일리지 줄은 가정 한도 예외', () => {
  const uni = card({ universal: { type: 'points', rate: 1.2, monthlyCap: null }, benefits: [{ tag: '모든 가맹점', type: 'points', rate: 1.2, monthlyCap: null, stars: 3 }] })
  expect(annualBenefit(uni, q({ tags: ['주유'], monthlySpend: 2_000_000 }))!.rows[0].monthlyValue).toBe(24000)
  expect(annualBenefit(uni, q({ tags: ['모든 가맹점'], monthlySpend: 2_000_000 }))!.rows[0].monthlyValue).toBe(24000)
  const mile = card({ benefits: [{ tag: '마일리지', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 }] })
  expect(annualBenefit(mile, q({ tags: ['마일리지'], monthlySpend: 2_000_000 }))!.rows[0].monthlyValue).toBe(2000 * RULES.mileWon)
})

test('capGroup: 같은 그룹의 monthlyValue 합이 그룹 한도를 넘으면 비례 축소', () => {
  const c = card({ benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 20000, stars: 3, capGroup: 'g' },
    { tag: '카페', type: 'discount', rate: 10, monthlyCap: 20000, stars: 3, capGroup: 'g' },
  ] })
  const r = annualBenefit(c, q({ tags: ['주유', '카페'], monthlySpend: 1_000_000 }))!
  expect(r.monthlyMax).toBe(20000)
  const oil = r.rows.find((x) => x.tag === '주유')!
  const cafe = r.rows.find((x) => x.tag === '카페')!
  expect(oil.monthlyValue).toBe(10000)
  expect(cafe.monthlyValue).toBe(10000)
})

test('capGroup 없으면 그룹 상한 없이 각자 한도까지', () => {
  const c = card({ benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 20000, stars: 3 },
    { tag: '카페', type: 'discount', rate: 10, monthlyCap: 20000, stars: 3 },
  ] })
  const r = annualBenefit(c, q({ tags: ['주유', '카페'], monthlySpend: 1_000_000 }))!
  expect(r.monthlyMax).toBe(40000)
})

test('capGroup이 하나뿐인 줄은 영향 없음', () => {
  const c = card({ benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 20000, stars: 3, capGroup: 'g' },
  ] })
  const r = annualBenefit(c, q({ tags: ['주유'], monthlySpend: 1_000_000 }))!
  expect(r.rows[0].monthlyValue).toBe(20000)
})

test('줄이 하나도 없으면 null', () => {
  const c = card({ benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 10000, stars: 2 }] })
  expect(annualBenefit(c, q({ tags: ['병의원·약국'] }))).toBeNull()
})

describe('마일리지는 마일리지 태그를 골랐을 때만', () => {
  const mileCard = card({
    universal: { type: 'mileage', rate: 0.1, monthlyCap: null },
    benefits: [
      { tag: '마일리지', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 },
      { tag: '모든 가맹점', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 },
      { tag: '주유', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
    ],
  })
  test('모든 가맹점만 골랐으면 마일 적립은 세지 않아 후보에서 빠진다', () => {
    expect(annualBenefit(mileCard, q({ tags: ['모든 가맹점'] }))).toBeNull()
  })
  test('마일리지를 골랐으면 센다', () => {
    const r = annualBenefit(mileCard, q({ tags: ['마일리지'], monthlySpend: 1_000_000 }))!
    expect(r.rows.map((x) => x.tag)).toEqual(['마일리지'])
    expect(r.rows[0].monthlyValue).toBe(1000 * RULES.mileWon)
  })
  test('마일리지 안 골랐어도 다른 할인 혜택은 그대로', () => {
    const r = annualBenefit(mileCard, q({ tags: ['주유', '카페'] }))!
    expect(r.rows.map((x) => x.tag)).toEqual(['주유'])  // 범용(마일)로는 카페을 커버하지 않는다
  })
  test('규칙을 끄면 예전처럼 범용 마일로 커버한다', () => {
    const r = annualBenefit(mileCard, q({ tags: ['모든 가맹점'] }), { ...RULES, mileageOnlyWhenPicked: false })!
    expect(r.rows).toHaveLength(1)
  })
})

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
      { tag: '통신비', type: 'discount', rate: 2.5, monthlyCap: 5000, stars: 1, capGroup: 'main', tiers: [{ minSpend: 700_000, monthlyCap: 10000 }] },
    ] })
    const low = annualBenefit(c, q({ tags: ['주유', '통신비'], monthlySpend: 500_000 }))!
    expect(low.monthlyMax).toBeCloseTo(5000, 5)   // 그룹 한도 5천 (총액 상한: 필요지출 40만 ≤ 50만이라 그대로)
    const high = annualBenefit(c, q({ tags: ['주유', '통신비'], monthlySpend: 1_000_000 }))!
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

describe("'마일리지'는 마일 적립만 채울 수 있다 (mileageTagOnlyByMileage)", () => {
  const pointsCard = card({
    universal: { type: 'points', rate: 1.2, monthlyCap: null },
    benefits: [{ tag: '모든 가맹점', type: 'points', rate: 1.2, monthlyCap: null, stars: 3 }],
  })
  test('마일리지만 골랐으면 포인트/할인 범용 카드는 후보에서 빠진다', () => {
    expect(annualBenefit(pointsCard, q({ tags: ['마일리지'] }))).toBeNull()
  })
  test('마일리지 + 다른 태그면 그 태그를 위해 범용 줄은 그대로 생긴다', () => {
    const r = annualBenefit(pointsCard, q({ tags: ['마일리지', '카페'], monthlySpend: 500_000 }))!
    expect(r.rows.map((x) => x.tag)).toEqual(['모든 가맹점'])
    expect(r.rows[0].monthlyValue).toBe(6000)
  })
  test('마일리지형 범용은 마일리지 태그를 채운다 (벤핏에 마일리지 항목이 없어도)', () => {
    const c = card({
      universal: { type: 'mileage', rate: 0.1, monthlyCap: null },
      benefits: [{ tag: '모든 가맹점', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 }],
    })
    const r = annualBenefit(c, q({ tags: ['마일리지'], monthlySpend: 1_000_000 }))!
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0].monthlyValue).toBe(1000 * RULES.mileWon)
  })
  test('규칙을 끄면 예전처럼 포인트 범용이 마일리지를 대신한다', () => {
    const r = annualBenefit(pointsCard, q({ tags: ['마일리지'] }), { ...RULES, mileageTagOnlyByMileage: false })!
    expect(r.rows).toHaveLength(1)
  })
})
