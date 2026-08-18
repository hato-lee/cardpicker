import { recommend, recommendGeneral, coveredTagsOf, universalCoversOf, isPointsHeavy } from './recommend'
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
  test("포인트/할인 범용은 '마일리지'를 커버하지 않는다, 마일리지형 범용은 커버", () => {
    expect(universalCoversOf(universalCard, ['마일리지', '카페·편의점'])).toEqual(['카페·편의점'])
    const mileUni = card({ universal: { type: 'mileage', rate: 0.1, monthlyCap: null }, benefits: [{ tag: '모든 가맹점', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2 }] })
    expect(universalCoversOf(mileUni, ['마일리지'])).toEqual(['마일리지'])
  })
})

describe('걸러내기', () => {
  test('단종 카드는 빠진다', () => {
    expect(recommend([card({ ...oilCard, id: 'd', status: 'discontinued' })], q())).toHaveLength(0)
  })
  test('추천 제외(excluded) 카드도 빠진다', () => {
    expect(recommend([card({ ...oilCard, id: 'e', status: 'excluded' })], q())).toHaveLength(0)
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
  test('적당형·무심형은 복잡도 3이 빠지고 꼼꼼형은 본다', () => {
    const c3 = card({ ...oilCard, id: 'c3', complexity: 3 })
    expect(recommend([c3], q({ persona: 'carefree' }))).toHaveLength(0)
    expect(recommend([c3], q({ persona: 'moderate' }))).toHaveLength(0)
    expect(recommend([c3], q({ persona: 'meticulous' }))).toHaveLength(1)
  })
  test('무심형은 고른 영역을 한 장으로 다 커버하는 카드만', () => {
    const cafe = card({ id: 'cafe', benefits: [{ tag: '카페·편의점', type: 'discount', rate: 10, monthlyCap: 5000, stars: 2 }] })
    const both = card({ id: 'both', benefits: [
      { tag: '주유', type: 'discount', rate: 5, monthlyCap: 3000, stars: 1 },
      { tag: '카페·편의점', type: 'discount', rate: 5, monthlyCap: 3000, stars: 1 }] })
    const tags = ['주유', '카페·편의점'] as const
    const r = recommendGeneral([oilCard, cafe, both, universalCard], q({ persona: 'carefree', tags: [...tags] }))
    expect(r.relaxed).toBe(false)
    // both(직접 둘 다) + uni(모든 가맹점으로 둘 다) 만 남고, oil·cafe는 한 영역만이라 빠짐
    expect(r.items.map((x) => x.card.id).sort()).toEqual(['both', 'uni'])
    // 적당형은 넷 다 후보
    expect(recommend([oilCard, cafe, both, universalCard], q({ persona: 'moderate', tags: [...tags] }))).toHaveLength(4)
  })
  test('무심형에 다 커버하는 카드가 없으면 풀어서 커버 많은 순', () => {
    const cafe = card({ id: 'cafe', benefits: [{ tag: '카페·편의점', type: 'discount', rate: 10, monthlyCap: 50000, stars: 2 }] })
    const two = card({ id: 'two', benefits: [
      { tag: '주유', type: 'discount', rate: 5, monthlyCap: 1000, stars: 1 },
      { tag: '카페·편의점', type: 'discount', rate: 5, monthlyCap: 1000, stars: 1 }] })
    const r = recommendGeneral([cafe, two], q({ persona: 'carefree', tags: ['주유', '카페·편의점', '대중교통·택시'] }))
    expect(r.relaxed).toBe(true)
    // cafe가 금액은 크지만 two가 2영역 커버라 먼저
    expect(r.items.map((x) => x.card.id)).toEqual(['two', 'cafe'])
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
  test('금액은 성향과 무관하다', () => {
    const m = recommend([oilCard], q({ persona: 'meticulous' }))[0].benefit.annualNet
    const c = recommend([oilCard], q({ persona: 'carefree' }))[0].benefit.annualNet
    expect(c).toBe(m)
    expect(m).toBe(15000 * 12)
  })
  test('상위 topN만', () => {
    const many = Array.from({ length: 8 }, (_, i) => card({ id: `c${i}`, benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 1000 * (i + 1), stars: 1 }] }))
    expect(recommend(many, q())).toHaveLength(RULES.topN)
  })
})

describe('무심형은 할인형 먼저, 포인트형 뒤', () => {
  const disc = card({ id: 'disc', benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 10000, stars: 2 }] })
  const pts = card({ id: 'pts', benefits: [{ tag: '주유', type: 'points', rate: 10, monthlyCap: 30000, stars: 3 }] })
  test('isPointsHeavy: 금액의 절반 넘게 포인트면 포인트형', () => {
    const rp = recommend([pts], q())[0]
    const rd = recommend([disc], q())[0]
    expect(isPointsHeavy(rp.benefit)).toBe(true)
    expect(isPointsHeavy(rd.benefit)).toBe(false)
  })
  test('무심형: 금액이 작아도 할인형이 포인트형보다 앞', () => {
    expect(recommend([pts, disc], q({ persona: 'carefree' })).map((x) => x.card.id)).toEqual(['disc', 'pts'])
    expect(recommend([pts, disc], q({ persona: 'moderate' })).map((x) => x.card.id)).toEqual(['pts', 'disc'])
  })
  test('무심형 풀어서 보여줄 때도 커버 개수 → 할인형 → 금액 순', () => {
    const cafe = card({ id: 'cafe', benefits: [{ tag: '카페·편의점', type: 'discount', rate: 10, monthlyCap: 50000, stars: 2 }] })
    const twoPts = card({ id: 'twoPts', benefits: [
      { tag: '주유', type: 'points', rate: 5, monthlyCap: 1000, stars: 1 },
      { tag: '카페·편의점', type: 'points', rate: 5, monthlyCap: 1000, stars: 1 }] })
    const r = recommendGeneral([cafe, twoPts], q({ persona: 'carefree', tags: ['주유', '카페·편의점', '대중교통·택시'] }))
    expect(r.relaxed).toBe(true)
    expect(r.items.map((x) => x.card.id)).toEqual(['twoPts', 'cafe'])
  })
})
