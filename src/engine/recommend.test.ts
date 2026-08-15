import { recommend, coveredTagsOf, isUniversalCard } from './recommend'
import type { Card, Query } from '../data/types'

const base: Card = {
  id: 'x', name: 'X', issuer: 'T', kind: 'credit', annualFee: 0, minSpend: 0,
  benefits: [], universal: null, complexity: 1,
  officialUrl: 'https://example.com', lastChecked: '2026-08-16', status: 'active',
}
const card = (over: Partial<Card>): Card => ({ ...base, ...over, id: over.id ?? Math.random().toString(36).slice(2) })

const q = (over: Partial<Query> = {}): Query => ({
  persona: 'moderate', monthlySpend: 1_000_000, feeLimit: null, tags: ['주유'], ...over,
})

const oilCard = card({ id: 'oil', benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3 }], complexity: 2 })
const universalCard = card({ id: 'uni', universal: { type: 'points', rate: 1, monthlyCap: null }, benefits: [{ tag: '모든 가맹점', type: 'points', rate: 1, monthlyCap: null, stars: 2 }], complexity: 1 })

describe('coveredTagsOf / isUniversalCard', () => {
  test('벤핏 태그가 있으면 커버', () => {
    expect(coveredTagsOf(oilCard, ['주유', '카페·편의점'])).toEqual(['주유'])
  })
  test('universal + 복잡도 1이면 범용 카드', () => {
    expect(isUniversalCard(universalCard)).toBe(true)
    expect(isUniversalCard(oilCard)).toBe(false)
  })
})

describe('걸러내기', () => {
  test('단종 카드는 빠진다', () => {
    const r = recommend([card({ ...oilCard, id: 'd', status: 'discontinued' })], q())
    expect(r).toHaveLength(0)
  })
  test('연회비 허용치 초과는 빠진다', () => {
    const r = recommend([card({ ...oilCard, id: 'f', annualFee: 50000 })], q({ feeLimit: 30000 }))
    expect(r).toHaveLength(0)
  })
  test('feeLimit이 null이면 연회비 상관없이 통과', () => {
    const r = recommend([card({ ...oilCard, id: 'f', annualFee: 300000 })], q({ feeLimit: null }))
    expect(r).toHaveLength(1)
  })
  test('월 사용액이 실적 미만이면 빠진다', () => {
    const r = recommend([card({ ...oilCard, id: 's', minSpend: 500000 })], q({ monthlySpend: 400000 }))
    expect(r).toHaveLength(0)
  })
  test('고른 태그를 하나도 커버 못 하면 빠진다', () => {
    const r = recommend([oilCard], q({ tags: ['병의원·약국'] }))
    expect(r).toHaveLength(0)
  })
  test('무심형은 복잡도 3이 빠진다', () => {
    const c3 = card({ ...oilCard, id: 'c3', complexity: 3 })
    expect(recommend([c3], q({ persona: 'carefree' }))).toHaveLength(0)
    expect(recommend([c3], q({ persona: 'moderate' }))).toHaveLength(1)
    expect(recommend([c3], q({ persona: 'meticulous' }))).toHaveLength(1)
  })
})

describe('순위', () => {
  test('고른 태그를 더 많이 커버하면 위', () => {
    const two = card({ id: 'two', complexity: 2, benefits: [
      { tag: '주유', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
      { tag: '카페·편의점', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
    ] })
    const r = recommend([oilCard, two], q({ persona: 'meticulous', tags: ['주유', '카페·편의점'] }))
    expect(r[0].card.id).toBe('two')
    expect(r[0].coveredTags).toEqual(['주유', '카페·편의점'])
  })
  test('같은 커버면 ★ 높은 쪽이 위', () => {
    const weak = card({ id: 'weak', complexity: 2, benefits: [{ tag: '주유', type: 'discount', rate: 3, monthlyCap: 3000, stars: 1 }] })
    const r = recommend([weak, oilCard], q({ persona: 'meticulous' }))
    expect(r[0].card.id).toBe('oil')
  })
  test('같은 조건이면 연회비 낮은 쪽이 위', () => {
    const pricey = card({ ...oilCard, id: 'pricey', annualFee: 50000 })
    const r = recommend([pricey, oilCard], q({ persona: 'meticulous' }))
    expect(r[0].card.id).toBe('oil')
  })
  test('무심형은 범용 카드가 영역별 카드보다 위', () => {
    const r = recommend([oilCard, universalCard], q({ persona: 'carefree', tags: ['주유', '모든 가맹점'] }))
    expect(r[0].card.id).toBe('uni')
  })
  test('꼼꼼형은 영역별 카드가 위로 올라온다', () => {
    // 범용 카드와 영역 카드가 같은 커버·★일 때 꼼꼼형은 영역 카드 우선
    const areaSameStars = card({ id: 'area', complexity: 2, benefits: [{ tag: '주유', type: 'discount', rate: 5, monthlyCap: 5000, stars: 2 }] })
    const uniOil = card({ id: 'uniOil', complexity: 1, universal: { type: 'points', rate: 1, monthlyCap: null }, benefits: [{ tag: '주유', type: 'points', rate: 1, monthlyCap: null, stars: 2 }, { tag: '모든 가맹점', type: 'points', rate: 1, monthlyCap: null, stars: 2 }] })
    const r = recommend([uniOil, areaSameStars], q({ persona: 'meticulous', tags: ['주유'] }))
    expect(r[0].card.id).toBe('area')
  })
  test('최대 topN장', () => {
    const many = Array.from({ length: 8 }, (_, i) => card({ ...oilCard, id: `o${i}` }))
    expect(recommend(many, q())).toHaveLength(5)
  })
})
