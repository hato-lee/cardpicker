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
const scored: Scored = { card: oil, score: 0, coveredTags: ['주유', '카페·편의점'], universalCovers: [], isUniversal: false }

const uni: Card = {
  id: 'uni', name: 'Uni', issuer: 'T', kind: 'credit', annualFee: 0, minSpend: 0,
  benefits: [
    { tag: '모든 가맹점', type: 'points', rate: 1, monthlyCap: 20000, stars: 2 },
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3 },
  ],
  universal: { type: 'points', rate: 1, monthlyCap: 20000 },
  complexity: 1, officialUrl: 'https://e.com', lastChecked: '2026-08-16', status: 'active',
}

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

test('reasonLine 범용 커버 — 명시 벤핏이 없는 태그는 모든 가맹점으로 센다', () => {
  const s: Scored = { card: uni, score: 0, coveredTags: [], universalCovers: ['카페·편의점', '배달·외식'], isUniversal: true }
  expect(reasonLine(s, 2)).toBe('고른 2개 중 2개 커버 · 그 외 2개는 모든 가맹점 ★★ · 연회비 0원 · 실적 없음')
})

test('reasonLine 명시 커버 + 범용 커버 섞임', () => {
  const s: Scored = { card: uni, score: 0, coveredTags: ['주유'], universalCovers: ['카페·편의점'], isUniversal: true }
  expect(reasonLine(s, 2)).toBe('고른 2개 중 2개 커버 · 주유 ★★★ · 그 외 1개는 모든 가맹점 ★★ · 연회비 0원 · 실적 없음')
})

test('maxBenefitTable에 범용 커버가 있으면 모든 가맹점 줄이 붙는다', () => {
  const s: Scored = { card: uni, score: 0, coveredTags: ['주유'], universalCovers: ['카페·편의점'], isUniversal: true }
  const t = maxBenefitTable(s)
  expect(t.rows).toEqual([
    { tag: '주유', rate: 10, type: 'discount', monthlyMax: 15000, requiredSpend: 150000 },
    { tag: '모든 가맹점', rate: 1, type: 'points', monthlyMax: 20000, requiredSpend: 2000000 },
  ])
  expect(t.monthlyTotal).toBe(35000)
})

test('모든 가맹점이 이미 커버돼 있으면 줄을 두 번 넣지 않는다', () => {
  const s: Scored = { card: uni, score: 0, coveredTags: ['모든 가맹점'], universalCovers: ['카페·편의점'], isUniversal: true }
  const t = maxBenefitTable(s)
  expect(t.rows.map((r) => r.tag)).toEqual(['모든 가맹점'])
})

test('마일리지 한도는 마일 단위 — 원 합계에서 뺀다', () => {
  const card: Card = { ...oil, annualFee: 0, benefits: [
    { tag: '마일리지', type: 'mileage', rate: 0.1, monthlyCap: 5000, stars: 2 },
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3 },
  ] }
  const s: Scored = { card, score: 0, coveredTags: ['마일리지', '주유'], universalCovers: [], isUniversal: false }
  const t = maxBenefitTable(s)
  expect(t.rows[0]).toEqual({ tag: '마일리지', rate: 0.1, type: 'mileage', monthlyMax: 5000, requiredSpend: 5000000 })
  expect(t.monthlyTotal).toBe(15000)
  expect(t.annualTotal).toBe(180000)
  expect(t.annualNet).toBe(180000)
  expect(t.hasUncapped).toBe(false)
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
