import { reasonLine, maxBenefitTable, isStale } from './explain'
import { won } from '../ui/format'
import type { Scored } from './recommend'
import type { Card } from '../data/types'

const oil: Card = {
  id: 'oil', name: 'Oil', issuer: 'T', kind: 'credit', annualFee: 10000, minSpend: 300000,
  benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3 },
    { tag: '카페·편의점', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
    { tag: '대중교통·택시', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
  ],
  universal: null, complexity: 2, officialUrl: 'https://e.com', lastChecked: '2026-08-16', status: 'active',
}
const scored: Scored = { card: oil, score: 0, coveredTags: ['주유', '카페·편의점'], isUniversal: false }

test('won 포맷', () => {
  expect(won(0)).toBe('0원')
  expect(won(5000)).toBe('5,000원')
  expect(won(10000)).toBe('1만 원')
  expect(won(13000)).toBe('1.3만 원')
  expect(won(300000)).toBe('30만 원')
})

test('reasonLine', () => {
  expect(reasonLine(scored, 3)).toBe('고른 3개 중 2개 커버 · 주유 ★★★ · 카페·편의점 ★ · 연회비 1만 원 · 실적 30만 원')
})

test('reasonLine 실적 없음', () => {
  const s = { ...scored, card: { ...oil, minSpend: 0 } }
  expect(reasonLine(s, 3)).toMatch(/실적 없음$/)
})

test('maxBenefitTable', () => {
  const t = maxBenefitTable(scored)
  expect(t.rows).toEqual([
    { tag: '주유', rate: 10, type: 'discount', monthlyMax: 15000, requiredSpend: 150000 },
    { tag: '카페·편의점', rate: 5, type: 'discount', monthlyMax: 5000, requiredSpend: 100000 },
  ])
  expect(t.monthlyTotal).toBe(20000)
  expect(t.annualTotal).toBe(240000)
  expect(t.annualNet).toBe(230000)
  expect(t.hasUncapped).toBe(false)
})

test('maxBenefitTable 한도 없는 벤핏', () => {
  const s: Scored = { ...scored, coveredTags: ['마일리지'], card: { ...oil, benefits: [{ tag: '마일리지', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 }] } }
  const t = maxBenefitTable(s)
  expect(t.rows[0].monthlyMax).toBeNull()
  expect(t.rows[0].requiredSpend).toBeNull()
  expect(t.hasUncapped).toBe(true)
  expect(t.monthlyTotal).toBe(0)
})

test('isStale', () => {
  const today = new Date('2026-11-20')
  expect(isStale('2026-08-16', today)).toBe(true)   // 96일
  expect(isStale('2026-09-01', today)).toBe(false)  // 80일
})

test('isStale 날짜 경계 (시각에 무관한 달력일 비교)', () => {
  expect(isStale('2026-08-16', new Date('2026-11-14T23:59:00'))).toBe(false) // 정확히 90일
  expect(isStale('2026-08-16', new Date('2026-11-15T00:00:01'))).toBe(true)  // 91일
})
