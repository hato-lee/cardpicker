import { validateCards } from './schema'

const good = {
  id: 'shinhan-deep-oil',
  name: '신한카드 Deep Oil',
  issuer: '신한카드',
  kind: 'credit',
  annualFee: 10000,
  minSpend: 300000,
  benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3 },
    { tag: '카페·편의점', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
  ],
  universal: null,
  complexity: 2,
  officialUrl: 'https://www.shinhancard.com/x',
  lastChecked: '2026-08-16',
  status: 'active',
}

test('올바른 카드는 통과한다', () => {
  expect(validateCards([good])).toHaveLength(1)
})

test('없는 태그는 실패한다', () => {
  const bad = { ...good, benefits: [{ ...good.benefits[0], tag: '영화' }] }
  expect(() => validateCards([bad])).toThrow(/shinhan-deep-oil/)
})

test('복잡도 4는 실패한다', () => {
  expect(() => validateCards([{ ...good, complexity: 4 }])).toThrow()
})

test('날짜 형식이 틀리면 실패한다', () => {
  expect(() => validateCards([{ ...good, lastChecked: '2026/08/16' }])).toThrow()
})

test('officialUrl은 https만 통과한다', () => {
  expect(() => validateCards([{ ...good, officialUrl: 'javascript:alert(1)' }])).toThrow(/https/)
  expect(() => validateCards([{ ...good, officialUrl: 'http://x.com' }])).toThrow(/https/)
  expect(validateCards([{ ...good, officialUrl: 'https://x.com' }])).toHaveLength(1)
})

test('모르는 키(오타)가 있으면 실패한다', () => {
  const bad = { ...good, statuss: 'active' }
  expect(() => validateCards([bad])).toThrow(/shinhan-deep-oil/)
  expect(() => validateCards([bad])).toThrow(/statuss/)
})

test('벤핏·universal 안의 모르는 키도 실패한다', () => {
  const badBenefit = { ...good, benefits: [{ ...good.benefits[0], starz: 3 }] }
  expect(() => validateCards([badBenefit])).toThrow(/starz/)
  const badUniversal = {
    ...good,
    universal: { type: 'points', rate: 1, monthlyCap: null, cap: 100 },
    benefits: [...good.benefits, { tag: '모든 가맹점', type: 'points', rate: 1, monthlyCap: null, stars: 2 }],
  }
  expect(() => validateCards([badUniversal])).toThrow(/cap/)
})

test('복잡도·날짜 오류 메시지는 한국어다', () => {
  expect(() => validateCards([{ ...good, complexity: 4 }])).toThrow(/1~3 중 하나여야 합니다/)
  expect(() => validateCards([{ ...good, lastChecked: '2026/08/16' }])).toThrow(/YYYY-MM-DD 형식이어야 합니다/)
})

test('id가 겹치면 실패한다', () => {
  expect(() => validateCards([good, good])).toThrow(/중복/)
})

test('배열이 아니면 실패한다', () => {
  expect(() => validateCards({})).toThrow()
})

test('universal이 있는데 모든 가맹점 벤핏이 없으면 실패한다', () => {
  const bad = {
    ...good,
    id: 'universal-no-tag',
    universal: { type: 'points', rate: 1, monthlyCap: null },
    // benefits는 good 그대로 — '모든 가맹점' 태그 없음
  }
  expect(() => validateCards([bad])).toThrow(/universal-no-tag/)
  expect(() => validateCards([bad])).toThrow(/모든 가맹점/)
})

test('universal이 있고 모든 가맹점 벤핏도 있으면 통과한다', () => {
  const ok = {
    ...good,
    id: 'universal-with-tag',
    universal: { type: 'points', rate: 1, monthlyCap: null },
    benefits: [...good.benefits, { tag: '모든 가맹점', type: 'points', rate: 1, monthlyCap: null, stars: 2 }],
  }
  expect(validateCards([ok])).toHaveLength(1)
})

test('capGroup이 같고 monthlyCap도 같으면 통과한다', () => {
  const ok = {
    ...good,
    id: 'cap-group-ok',
    benefits: [
      { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3, capGroup: 'shared' },
      { tag: '카페·편의점', type: 'discount', rate: 5, monthlyCap: 15000, stars: 1, capGroup: 'shared' },
    ],
  }
  expect(validateCards([ok])).toHaveLength(1)
})

test('capGroup이 같은데 monthlyCap이 다르면 실패한다', () => {
  const bad = {
    ...good,
    id: 'cap-group-bad',
    benefits: [
      { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3, capGroup: 'shared' },
      { tag: '카페·편의점', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1, capGroup: 'shared' },
    ],
  }
  expect(() => validateCards([bad])).toThrow(/cap-group-bad/)
  expect(() => validateCards([bad])).toThrow(/capGroup 'shared'의 monthlyCap이 서로 다르거나 비어 있음/)
})

test('벤핏에 같은 태그가 두 번 있으면 실패한다', () => {
  const bad = {
    ...good,
    id: 'dup-tag-card',
    benefits: [...good.benefits, { tag: '주유', type: 'points', rate: 2, monthlyCap: null, stars: 1 }],
  }
  expect(() => validateCards([bad])).toThrow(/dup-tag-card/)
  expect(() => validateCards([bad])).toThrow(/중복 태그/)
})

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

test('capGroup: tiers의 monthlyCap이 null이면 실패', () => {
  const bad = { ...tiered, benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 5000, stars: 2, capGroup: 'g', tiers: [{ minSpend: 700000, monthlyCap: null }] },
    { tag: '통신비·OTT', type: 'discount', rate: 5, monthlyCap: 5000, stars: 2, capGroup: 'g', tiers: [{ minSpend: 700000, monthlyCap: null }] },
  ] }
  expect(() => validateCards([bad])).toThrow(/capGroup 'g'.*monthlyCap/)
})

test('universal.tiers는 모든 가맹점 벤핏의 tiers와 열이 같아야 한다', () => {
  const uni = { ...good, minSpend: 200000,
    universal: { type: 'points', rate: 0.2, monthlyCap: 5000, tiers: [{ minSpend: 400000, monthlyCap: 15000 }] },
    benefits: [{ tag: '모든 가맹점', type: 'points', rate: 0.2, monthlyCap: 5000, stars: 1, tiers: [{ minSpend: 400000, monthlyCap: 15000 }] }] }
  expect(validateCards([uni])).toHaveLength(1)
  const bad = { ...uni, benefits: [{ ...uni.benefits[0], tiers: [{ minSpend: 400000, monthlyCap: 30000 }] }] }
  expect(() => validateCards([bad])).toThrow(/universal.*tiers/)
})

test('universal에 tiers가 없는데 모든 가맹점 벤핏에 tiers가 있으면 실패한다', () => {
  const bad = { ...good, id: 'universal-missing-tiers', minSpend: 200000,
    universal: { type: 'points', rate: 0.2, monthlyCap: 5000 },
    benefits: [{ tag: '모든 가맹점', type: 'points', rate: 0.2, monthlyCap: 5000, stars: 1, tiers: [{ minSpend: 400000, monthlyCap: 15000 }] }] }
  expect(() => validateCards([bad])).toThrow(/universal.*tiers/)
})

test('mileageBonus·perks: 올바르면 통과, 형식이 틀리면 실패', () => {
  const ok = { ...good, mileageBonus: { miles: 30000, minAnnualSpend: 36_000_000, firstYearMinSpend: 1_000_000 }, perks: ['전 세계 공항 라운지 무제한', '항공권 할인 쿠폰 연 4장'] }
  expect(validateCards([ok])).toHaveLength(1)
  expect(() => validateCards([{ ...good, mileageBonus: { miles: 0, minAnnualSpend: 0 } }])).toThrow(/shinhan-deep-oil/)
  expect(() => validateCards([{ ...good, mileageBonus: { miles: 1000 } }])).toThrow(/shinhan-deep-oil/)
  expect(() => validateCards([{ ...good, perks: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }])).toThrow(/6줄/)
})
