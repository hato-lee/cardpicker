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

test('벤핏에 같은 태그가 두 번 있으면 실패한다', () => {
  const bad = {
    ...good,
    id: 'dup-tag-card',
    benefits: [...good.benefits, { tag: '주유', type: 'points', rate: 2, monthlyCap: null, stars: 1 }],
  }
  expect(() => validateCards([bad])).toThrow(/dup-tag-card/)
  expect(() => validateCards([bad])).toThrow(/중복 태그/)
})
