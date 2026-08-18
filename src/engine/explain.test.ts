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

test('가정 한도가 걸린 줄의 문구', () => {
  const c: Card = { ...base, benefits: [{ tag: '온라인 쇼핑', type: 'discount', rate: 10, monthlyCap: null, stars: 2 }] }
  const ab = annualBenefit(c, q({ tags: ['온라인 쇼핑'], monthlySpend: 500_000 }))!
  expect(tips(ab, 'meticulous')).toEqual(['온라인 쇼핑은 한도 정보가 없어 월 1만 원으로 계산했어요'])
})

test('조사 은/는: 받침 있으면 은, 없으면 는 (한글 아니면 는)', () => {
  const c: Card = { ...base, benefits: [
    { tag: '온라인 쇼핑', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 },
    { tag: '해외 결제', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 1 },
    { tag: '통신비·OTT', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 1 },
  ] }
  // 마일 적립은 '마일리지'를 골랐을 때만 세므로 태그에 넣어둔다
  const ab = annualBenefit(c, q({ tags: ['마일리지', '온라인 쇼핑', '해외 결제', '통신비·OTT'], monthlySpend: 500_000 }))!
  const t = tips(ab, 'meticulous')
  expect(t).toContain('온라인 쇼핑은 쓰는 만큼 1,000원당 1마일 — 한도 없음')
  expect(t).toContain('해외 결제는 쓰는 만큼 1,000원당 1마일 — 한도 없음')
  expect(t).toContain('통신비·OTT는 쓰는 만큼 1,000원당 1마일 — 한도 없음')
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
