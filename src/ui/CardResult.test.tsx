import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CardResult } from './CardResult'
import { annualBenefit } from '../engine/benefit'
import type { Scored } from '../engine/recommend'
import type { Card, Query } from '../data/types'

const oil: Card = {
  id: 'oil', name: '신한카드 Deep Oil', issuer: '신한카드', kind: 'credit', annualFee: 10000, minSpend: 300000,
  benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3, note: '정유사 1곳 선택' },
    { tag: '카페·편의점', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
  ],
  universal: null, complexity: 2, officialUrl: 'https://example.com/oil', lastChecked: '2026-08-18', status: 'active',
  memo: 'AI 수집, 검수 전. 출처: 공식 페이지',
}
const q: Query = { persona: 'moderate', monthlySpend: 1_000_000, feeLimit: null, tags: ['주유', '카페·편의점'] }
const scored: Scored = { card: oil, benefit: annualBenefit(oil, q)!, coveredTags: ['주유', '카페·편의점'], universalCovers: [] }
const today = new Date('2026-08-20')
// 월 2만 × 12 × 0.8 = 192,000 − 10,000 = 182,000

test('이름·카드사·큰 숫자·부제·링크·확인일이 보인다', () => {
  render(<CardResult rank={1} scored={scored} persona="moderate" today={today} />)
  expect(screen.getByText('신한카드 Deep Oil')).toBeInTheDocument()
  expect(screen.getByText(/신한카드 · 신용/)).toBeInTheDocument()
  expect(screen.getByText('연 최대')).toBeInTheDocument()
  expect(screen.getByText('약 18.2만 원')).toBeInTheDocument()
  expect(screen.getByText('연회비 1만 원 뺀 금액 · 적당형 기준(한도의 80%)')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /카드사 페이지/ })).toHaveAttribute('href', 'https://example.com/oil')
  expect(screen.getByText(/마지막 확인 2026-08-18/)).toBeInTheDocument()
})

test('내역 줄: 태그와 연 금액', () => {
  render(<CardResult rank={2} scored={scored} persona="moderate" today={today} />)
  // 주유 15,000×12×0.8 = 144,000 / 카페 5,000×12×0.8 = 48,000
  expect(screen.getByText('주유')).toBeInTheDocument()
  expect(screen.getByText('14.4만 원')).toBeInTheDocument()
  expect(screen.getByText('카페·편의점')).toBeInTheDocument()
  expect(screen.getByText('4.8만 원')).toBeInTheDocument()
})

test('1위는 추천 배지, 2위는 없음', () => {
  const { unmount } = render(<CardResult rank={1} scored={scored} persona="moderate" today={today} />)
  expect(screen.getByText('추천')).toBeInTheDocument()
  unmount()
  render(<CardResult rank={2} scored={scored} persona="moderate" today={today} />)
  expect(screen.queryByText('추천')).not.toBeInTheDocument()
})

test('자세히 보기를 펼치면 tips와 전체 혜택이 보이고 memo·★는 없다', async () => {
  render(<CardResult rank={1} scored={scored} persona="meticulous" today={today} />)
  expect(screen.queryByText(/이렇게 쓰면 최대/)).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
  expect(screen.getByText(/이렇게 쓰면 최대/)).toBeInTheDocument()
  expect(screen.getByText('주유에 월 15만 원 이상 쓰면 한도(1.5만 원)를 꽉 채워요')).toBeInTheDocument()
  expect(screen.getByText(/주유 10% 할인 · 월 최대 1.5만 원 \(정유사 1곳 선택\)/)).toBeInTheDocument()
  expect(screen.queryByText(/AI 수집/)).not.toBeInTheDocument()
  expect(screen.queryByText(/★/)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /접기/ })).toHaveAttribute('aria-expanded', 'true')
})

test('연회비가 혜택보다 크면 문구로 표시', () => {
  const pricey: Card = { ...oil, id: 'p', annualFee: 300000 }
  const s: Scored = { ...scored, card: pricey, benefit: annualBenefit(pricey, q)! }
  render(<CardResult rank={3} scored={s} persona="moderate" today={today} />)
  // 192,000 − 300,000 = −108,000
  expect(screen.getByText('연회비가 혜택보다 커요 (−10.8만 원)')).toBeInTheDocument()
  expect(screen.queryByText(/^약 /)).not.toBeInTheDocument()
})

test('연회비가 혜택과 정확히 같으면(net 0) 괄호 없이 문구만', () => {
  // monthlyMax 20,000 × 12 × 0.8(적당형) = 192,000 = annualFee → net 0
  const evenFee: Card = { ...oil, id: 'e', annualFee: 192000 }
  const s: Scored = { ...scored, card: evenFee, benefit: annualBenefit(evenFee, q)! }
  render(<CardResult rank={3} scored={s} persona="moderate" today={today} />)
  expect(screen.getByText('연회비가 혜택보다 커요')).toBeInTheDocument()
  expect(screen.queryByText(/−/)).not.toBeInTheDocument()
  expect(screen.queryByText(/^약 /)).not.toBeInTheDocument()
})

test('90일 넘으면 확인 필요 뱃지', () => {
  render(<CardResult rank={1} scored={scored} persona="moderate" today={new Date('2026-12-01')} />)
  expect(screen.getByText('확인 필요')).toBeInTheDocument()
})

test('내역이 3개 넘으면 상위 3개 + 외 N개', () => {
  const many: Card = { ...oil, id: 'm', benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3 },
    { tag: '카페·편의점', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
    { tag: '온라인 쇼핑', type: 'discount', rate: 5, monthlyCap: 8000, stars: 2 },
    { tag: '통신비·OTT', type: 'discount', rate: 5, monthlyCap: 3000, stars: 1 },
  ] }
  const mq: Query = { ...q, tags: ['주유', '카페·편의점', '온라인 쇼핑', '통신비·OTT'] }
  const s: Scored = { card: many, benefit: annualBenefit(many, mq)!, coveredTags: mq.tags, universalCovers: [] }
  render(<CardResult rank={1} scored={s} persona="moderate" today={today} />)
  expect(screen.getByText('외 1개')).toBeInTheDocument()
  expect(screen.queryByText('통신비·OTT')).not.toBeInTheDocument()
})

test('전체 혜택 줄에 실적 구간이 붙는다', async () => {
  const tiered: Card = { ...oil, benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3, note: '정유사 1곳 선택',
      tiers: [{ minSpend: 700000, monthlyCap: 30000 }, { minSpend: 1000000, rate: 12, monthlyCap: 50000 }] },
    { tag: '카페·편의점', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
  ] }
  const s: Scored = { card: tiered, benefit: annualBenefit(tiered, q)!, coveredTags: ['주유', '카페·편의점'], universalCovers: [] }
  render(<CardResult rank={2} scored={s} persona="moderate" today={today} />)
  await userEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
  expect(screen.getByText('주유 10% 할인 · 월 최대 1.5만 원 (실적 70만 원↑ 3만 원, 100만 원↑ 12% 할인·5만 원) (정유사 1곳 선택)')).toBeInTheDocument()
  expect(screen.getByText('카페·편의점 5% 할인 · 월 최대 5,000원')).toBeInTheDocument()
})
