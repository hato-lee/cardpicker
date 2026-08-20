import { recommend, recommendGeneral, coveredTagsOf, universalCoversOf, isPointsHeavy, kpassMonthlyRefund, kpassAnnualRefund } from './recommend'
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
  test('무심형: 금액이 작아도 할인형이 포인트형보다 앞 (포인트 사용법 모르면 뒤)', () => {
    expect(recommend([pts, disc], q({ persona: 'carefree' })).map((x) => x.card.id)).toEqual(['disc', 'pts'])
    expect(recommend([pts, disc], q({ persona: 'moderate' })).map((x) => x.card.id)).toEqual(['pts', 'disc'])
  })
  test('현금처럼 쓰는 포인트(cash)는 무심형에서도 할인형과 같게 금액순', () => {
    const cashPts = card({ ...pts, id: 'cashPts', pointsEase: 'cash', pointsProgram: '네이버페이 포인트' })
    const shopPts = card({ ...pts, id: 'shopPts', pointsEase: 'shop', pointsProgram: 'M포인트' })
    expect(recommend([shopPts, disc, cashPts], q({ persona: 'carefree' })).map((x) => x.card.id)).toEqual(['cashPts', 'disc', 'shopPts'])
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

describe('K-패스 트랙', () => {
  const transit = (over: Partial<Card>) => card({ benefits: [{ tag: '대중교통·택시', type: 'discount', rate: 10, monthlyCap: 5000, stars: 2 }], complexity: 2, ...over })
  test('kpass 입력이 있으면 K-패스 카드만 후보', () => {
    const kp = transit({ id: 'kp', kpass: true })
    const plain = transit({ id: 'plain', benefits: [{ tag: '대중교통·택시', type: 'discount', rate: 10, monthlyCap: 50000, stars: 3 }] })
    const got = recommend([plain, kp], q({ tags: ['대중교통·택시'], kpass: { transitSpend: 100_000, group: 'general' } }))
    expect(got.map((s) => s.card.id)).toEqual(['kp'])
  })
  test('kpass 입력이 없으면 K-패스 여부와 무관', () => {
    const kp = transit({ id: 'kp', kpass: true })
    const plain = transit({ id: 'plain' })
    expect(recommend([plain, kp], q({ tags: ['대중교통·택시'] }))).toHaveLength(2)
  })
  test('환급: 교통비 × 요율(일반 20%·청년 30%·3자녀 50%·저소득 53.3%), 상한 없음', () => {
    expect(kpassMonthlyRefund({ transitSpend: 100_000, group: 'general' })).toBe(20_000)
    expect(kpassMonthlyRefund({ transitSpend: 100_000, group: 'youth' })).toBe(30_000)
    expect(kpassMonthlyRefund({ transitSpend: 100_000, group: 'multi3' })).toBe(50_000)
    expect(kpassMonthlyRefund({ transitSpend: 100_000, group: 'low' })).toBe(53_300)
    expect(kpassAnnualRefund({ transitSpend: 100_000, group: 'general' })).toBe(240_000)
    expect(kpassMonthlyRefund({ transitSpend: 300_000, group: 'general' })).toBe(60_000)
  })
})

describe('빠른 길 타겟팅 (requireCover)', () => {
  // 태그 3개 중: big은 주유 하나만(금액 큼), fit은 주유+대중교통 둘(금액 작음)
  const big = card({ id: 'big', benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 50_000, stars: 3 }], complexity: 2 })
  const fit = card({
    id: 'fit', complexity: 2,
    benefits: [
      { tag: '주유', type: 'discount', rate: 5, monthlyCap: 10_000, stars: 2 },
      { tag: '대중교통·택시', type: 'discount', rate: 5, monthlyCap: 5_000, stars: 2 },
    ],
  })
  const tags3 = q({ tags: ['주유', '대중교통·택시', '통신비·OTT'] })

  test('requireCover 없으면 금액 큰 단일 태그 카드가 1위', () => {
    const got = recommendGeneral([fit, big], tags3)
    expect(got.items.map((s) => s.card.id)).toEqual(['big', 'fit'])
    expect(got.relaxed).toBe(false)
  })
  test('requireCover면 태그 과반(3개 중 2개)을 전용 혜택으로 커버해야 명단에 든다', () => {
    const got = recommendGeneral([fit, big], { ...tags3, requireCover: true })
    expect(got.items.map((s) => s.card.id)).toEqual(['fit'])
    expect(got.relaxed).toBe(false)
  })
  test('상황을 다 담는(3/3) 카드가 금액이 적어도 과반(2/3) 카드보다 먼저', () => {
    // full은 3태그 전부 커버하지만 금액은 fit보다 작다
    const full = card({
      id: 'full', complexity: 2,
      benefits: [
        { tag: '주유', type: 'discount', rate: 3, monthlyCap: 3_000, stars: 1 },
        { tag: '대중교통·택시', type: 'discount', rate: 3, monthlyCap: 3_000, stars: 1 },
        { tag: '통신비·OTT', type: 'discount', rate: 3, monthlyCap: 3_000, stars: 1 },
      ],
    })
    const got = recommendGeneral([fit, full], { ...tags3, requireCover: true })
    expect(got.items.map((s) => s.card.id)).toEqual(['full', 'fit'])
  })
  test('범용(모든 가맹점) 커버도 상황 담기로 쳐준다 — 전용 과반 + 범용으로 전부 커버면 전용만 2/3인 카드보다 먼저', () => {
    // fitUni: 주유·대중교통 전용 + 나머지는 범용 적립으로 커버 (총 3/3)
    const fitUni = card({
      id: 'fituni', complexity: 2,
      universal: { type: 'points', rate: 0.5, monthlyCap: null },
      benefits: [
        { tag: '모든 가맹점', type: 'points', rate: 0.5, monthlyCap: null, stars: 1 },
        { tag: '주유', type: 'discount', rate: 5, monthlyCap: 5_000, stars: 2 },
        { tag: '대중교통·택시', type: 'discount', rate: 5, monthlyCap: 5_000, stars: 2 },
      ],
    })
    const got = recommendGeneral([fit, fitUni], { ...tags3, requireCover: true })
    expect(got.items[0].card.id).toBe('fituni')
  })
  test('범용(모든 가맹점) 커버는 과반 계산에 안 쳐준다', () => {
    // universalCard는 범용 적립뿐 — 전용 혜택 0개라 탈락
    const got = recommendGeneral([universalCard, fit], { ...tags3, requireCover: true })
    expect(got.items.map((s) => s.card.id)).toEqual(['fit'])
  })
  test('과반 커버 카드가 하나도 없으면 커버 많은 순으로 풀고 relaxed', () => {
    const got = recommendGeneral([big], { ...tags3, requireCover: true })
    expect(got.items.map((s) => s.card.id)).toEqual(['big'])
    expect(got.relaxed).toBe(true)
  })
  test('태그 1개면 그 혜택이 있는 카드만', () => {
    const got = recommendGeneral([universalCard, big], q({ tags: ['주유'], requireCover: true }))
    expect(got.items.map((s) => s.card.id)).toEqual(['big'])
  })
})

describe('지방은행 카드는 같은 조건이면 뒤로', () => {
  const t = (over: Partial<Card>) => card({ benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 20_000, stars: 3 }], complexity: 2, ...over })
  test('금액이 더 커도 지방은행이면 전국 카드 뒤 (일반 정렬)', () => {
    const local = t({ id: 'local', regional: true, benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 50_000, stars: 3 }] })
    const nation = t({ id: 'nation' })
    const got = recommend([local, nation], q({ tags: ['주유'] }))
    expect(got.map((s) => s.card.id)).toEqual(['nation', 'local'])
  })
  test('빠른 길(requireCover)에서도 같은 커버면 지방은행이 뒤', () => {
    const local = t({ id: 'local', regional: true, benefits: [{ tag: '주유', type: 'discount', rate: 10, monthlyCap: 50_000, stars: 3 }] })
    const nation = t({ id: 'nation' })
    const got = recommendGeneral([local, nation], q({ tags: ['주유'], requireCover: true }))
    expect(got.items.map((s) => s.card.id)).toEqual(['nation', 'local'])
  })
  test('커버가 더 많으면 지방은행이라도 먼저 (커버가 우선)', () => {
    const local2 = card({
      id: 'local2', regional: true, complexity: 2,
      benefits: [
        { tag: '주유', type: 'discount', rate: 5, monthlyCap: 5_000, stars: 2 },
        { tag: '대중교통·택시', type: 'discount', rate: 5, monthlyCap: 5_000, stars: 2 },
      ],
    })
    const nation1 = t({ id: 'nation1' })
    const got = recommendGeneral([nation1, local2], q({ tags: ['주유', '대중교통·택시'], requireCover: true }))
    expect(got.items.map((s) => s.card.id)).toEqual(['local2', 'nation1'])
  })
})
