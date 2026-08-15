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
