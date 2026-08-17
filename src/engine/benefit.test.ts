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
