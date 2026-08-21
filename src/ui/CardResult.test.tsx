import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CardResult } from './CardResult'
import { Results, RELAXED_NOTE } from './Results'
import { annualBenefit } from '../engine/benefit'
import { recommend, type Scored } from '../engine/recommend'
import type { Card, Query } from '../data/types'

const oil: Card = {
  id: 'oil', name: '신한카드 Deep Oil', issuer: '신한카드', kind: 'credit', annualFee: 10000, minSpend: 300000,
  benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3, note: '정유사 1곳 선택' },
    { tag: '카페', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
  ],
  universal: null, complexity: 2, officialUrl: 'https://example.com/oil', lastChecked: '2026-08-18', status: 'active',
  memo: 'AI 수집, 검수 전. 출처: 공식 페이지',
}
const q: Query = { persona: 'moderate', monthlySpend: 1_000_000, feeLimit: null, tags: ['주유', '카페'] }
const scored: Scored = { card: oil, benefit: annualBenefit(oil, q)!, coveredTags: ['주유', '카페'], universalCovers: [] }
const today = new Date('2026-08-20')
// 월 2만 × 12 = 240,000 − 10,000 = 230,000

test('이름·카드사·큰 숫자·부제·링크가 보이고 확인일은 자세히 보기 안에', async () => {
  render(<CardResult rank={1} scored={scored} persona="moderate" today={today} />)
  expect(screen.getByText('신한카드 Deep Oil')).toBeInTheDocument()
  expect(screen.getByText(/신한카드 · 신용/)).toBeInTheDocument()
  expect(screen.getByText('1년에 약')).toBeInTheDocument()
  expect(screen.getByText('23만 원')).toBeInTheDocument()
  expect(screen.getByText('한도를 다 채웠을 때 최대치 · 연회비 1만 원은 뺐어요')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /카드사에서 보기/ })).toHaveAttribute('href', 'https://example.com/oil')
  expect(screen.queryByText(/마지막으로 확인한 날/)).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
  expect(screen.getByText(/마지막으로 확인한 날 2026-08-18/)).toBeInTheDocument()
})

test('내역 줄: 태그와 연 금액', () => {
  render(<CardResult rank={2} scored={scored} persona="moderate" today={today} />)
  // 주유 15,000×12 = 180,000 / 카페 5,000×12 = 60,000
  expect(screen.getByText('주유')).toBeInTheDocument()
  expect(screen.getByText('18만 원')).toBeInTheDocument()
  expect(screen.getByText('카페')).toBeInTheDocument()
  expect(screen.getByText('6만 원')).toBeInTheDocument()
})

test('발급 조건(issueNote)이 있으면 📌 한 줄이 보인다', () => {
  const noted: Card = { ...oil, issueNote: '유료 멤버십 가입자만 발급할 수 있어요' }
  const s: Scored = { ...scored, card: noted }
  const { unmount } = render(<CardResult rank={1} scored={s} persona="moderate" today={today} />)
  expect(screen.getByText(/📌 유료 멤버십 가입자만 발급할 수 있어요/)).toBeInTheDocument()
  unmount()
  // 접힌 줄에서는 📌 마크로
  render(<CardResult rank={2} scored={s} persona="moderate" today={today} compact maxNet={230000} />)
  expect(screen.getByLabelText(/발급 조건: 유료 멤버십/)).toBeInTheDocument()
})

test('1위는 가장 많이 아껴요 배지, 2위는 없음', () => {
  const { unmount } = render(<CardResult rank={1} scored={scored} persona="moderate" today={today} />)
  expect(screen.getByText('가장 많이 아껴요')).toBeInTheDocument()
  unmount()
  render(<CardResult rank={2} scored={scored} persona="moderate" today={today} />)
  expect(screen.queryByText('가장 많이 아껴요')).not.toBeInTheDocument()
})

test('자세히 보기를 펼치면 tips와 전체 혜택이 보이고 memo·★는 없다', async () => {
  render(<CardResult rank={1} scored={scored} persona="meticulous" today={today} />)
  expect(screen.queryByText(/이렇게 쓰면 최대/)).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
  expect(screen.getByText(/이렇게 쓰면 최대/)).toBeInTheDocument()
  expect(screen.getByText('주유에 월 15만 원 이상 쓰면 한도(1.5만 원)를 꽉 채워요')).toBeInTheDocument()
  expect(screen.getByText(/주유 10% 할인 · 월 최대 1.5만 원/)).toBeInTheDocument()
  expect(screen.getByText('정유사 1곳 선택')).toBeInTheDocument()
  expect(screen.queryByText(/AI 수집/)).not.toBeInTheDocument()
  expect(screen.queryByText(/★/)).not.toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /접기/ })[0]).toHaveAttribute('aria-expanded', 'true')
})

test('연회비가 혜택보다 크면 문구로 표시', () => {
  const pricey: Card = { ...oil, id: 'p', annualFee: 300000 }
  const s: Scored = { ...scored, card: pricey, benefit: annualBenefit(pricey, q)! }
  render(<CardResult rank={3} scored={s} persona="moderate" today={today} />)
  // 240,000 − 300,000 = −60,000
  expect(screen.getByText('연회비가 혜택보다 커요 (−6만 원)')).toBeInTheDocument()
  expect(screen.queryByText(/^약 /)).not.toBeInTheDocument()
})

test('연회비가 혜택과 정확히 같으면(net 0) 괄호 없이 문구만', () => {
  // monthlyMax 20,000 × 12 = 240,000 = annualFee → net 0
  const evenFee: Card = { ...oil, id: 'e', annualFee: 240000 }
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
    { tag: '카페', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
    { tag: '온라인 쇼핑', type: 'discount', rate: 5, monthlyCap: 8000, stars: 2 },
    { tag: '통신비', type: 'discount', rate: 5, monthlyCap: 3000, stars: 1 },
  ] }
  const mq: Query = { ...q, tags: ['주유', '카페', '온라인 쇼핑', '통신비'] }
  const s: Scored = { card: many, benefit: annualBenefit(many, mq)!, coveredTags: mq.tags, universalCovers: [] }
  render(<CardResult rank={1} scored={s} persona="moderate" today={today} />)
  expect(screen.getByText('외 1개')).toBeInTheDocument()
  expect(screen.queryByText('통신비')).not.toBeInTheDocument()
})

test('전체 혜택 줄에 실적 구간이 붙는다', async () => {
  const tiered: Card = { ...oil, benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3, note: '정유사 1곳 선택',
      tiers: [{ minSpend: 700000, monthlyCap: 30000 }, { minSpend: 1000000, rate: 12, monthlyCap: 50000 }] },
    { tag: '카페', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
  ] }
  const s: Scored = { card: tiered, benefit: annualBenefit(tiered, q)!, coveredTags: ['주유', '카페'], universalCovers: [] }
  render(<CardResult rank={2} scored={s} persona="moderate" today={today} />)
  await userEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
  expect(screen.getByText(/주유 10% 할인 · 월 최대 1.5만 원/)).toBeInTheDocument()
  expect(screen.getByText('전월 70만 원 이상 쓰면 3만 원까지, 100만 원 이상이면 12% 할인·5만 원까지 · 정유사 1곳 선택')).toBeInTheDocument()
  expect(screen.getByText(/카페 5% 할인 · 월 최대 5,000원/)).toBeInTheDocument()
})

test('전체 혜택 줄: 마일리지 구간의 monthlyCap이 null이면 한도 없음으로 표기된다', async () => {
  const mileageCard: Card = { ...oil, benefits: [
    { tag: '마일리지', type: 'mileage', rate: 0.1, monthlyCap: 1000, stars: 3,
      tiers: [{ minSpend: 2000000, rate: 0.15, monthlyCap: null }] },
  ] }
  const mq: Query = { ...q, tags: ['마일리지'] }
  const s: Scored = { card: mileageCard, benefit: annualBenefit(mileageCard, mq)!, coveredTags: ['마일리지'], universalCovers: [] }
  render(<CardResult rank={2} scored={s} persona="moderate" today={today} />)
  await userEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
  expect(screen.getByText(/마일리지 1,000원당 1마일 · 월 최대 1,000마일/)).toBeInTheDocument()
  expect(screen.getByText('전월 200만 원 이상 쓰면 1,000원당 1.5마일·한도 없이')).toBeInTheDocument()
})

test('Results: 무심형 풀어서 보여줄 때만 안내 문구', () => {
  const cq: Query = { ...q, persona: 'carefree' }
  const { unmount } = render(<Results query={cq} results={[scored]} relaxed onEdit={() => {}} today={today} />)
  expect(screen.getByText(RELAXED_NOTE)).toBeInTheDocument()
  unmount()
  render(<Results query={cq} results={[scored]} relaxed={false} onEdit={() => {}} today={today} />)
  expect(screen.queryByText(RELAXED_NOTE)).toBeNull()
})

test('포인트 적립이 절반 넘으면 포인트 배지(사용 난이도별 문구), 할인형엔 없음', async () => {
  const ptsCard: Card = { ...oil, id: 'pts', benefits: [{ tag: '주유', type: 'points', rate: 10, monthlyCap: 15000, stars: 3 }] }
  const mk = (over: Partial<Card>): Scored => {
    const c = { ...ptsCard, ...over }
    return { card: c, benefit: annualBenefit(c, { ...q, tags: ['주유'] })!, coveredTags: ['주유'], universalCovers: [] }
  }
  let r = render(<CardResult rank={2} scored={mk({})} persona="carefree" today={today} />)
  expect(screen.getByText('포인트 적립형')).toBeInTheDocument()
  r.unmount()
  r = render(<CardResult rank={2} scored={mk({ pointsEase: 'cash', pointsProgram: '마이신한포인트', pointsNote: '계좌 입금·결제대금 차감 가능' })} persona="carefree" today={today} />)
  expect(screen.getByText('포인트 적립 · 현금처럼 써요')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
  expect(screen.getByText('쌓이는 포인트')).toBeInTheDocument()
  expect(screen.getByText('마이신한포인트 — 계좌 입금·결제대금 차감 가능')).toBeInTheDocument()
  r.unmount()
  r = render(<CardResult rank={2} scored={mk({ pointsEase: 'shop' })} persona="carefree" today={today} />)
  expect(screen.getByText('포인트 적립 · 써야 혜택')).toBeInTheDocument()
  r.unmount()
  r = render(<CardResult rank={2} scored={mk({ pointsEase: 'limited' })} persona="carefree" today={today} />)
  expect(screen.getByText('포인트 적립 · 쓰는 곳 제한')).toBeInTheDocument()
  r.unmount()
  render(<CardResult rank={2} scored={scored} persona="carefree" today={today} />)
  expect(screen.queryByText(/포인트 적립/)).toBeNull()
})

test('2위부터는 한 줄로 접혀 있고 누르면 펼쳐진다, 1위엔 이유 한 줄', async () => {
  const { unmount } = render(<CardResult rank={2} scored={scored} persona="moderate" today={today} compact maxNet={500000} />)
  const row = screen.getByRole('button', { name: /신한카드 Deep Oil/ })
  expect(row).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByText('1년에 약')).toBeNull()
  await userEvent.click(row)
  expect(screen.getByText('1년에 약')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: '줄이기' }))
  expect(screen.queryByText('1년에 약')).toBeNull()
  unmount()
  render(<CardResult rank={1} scored={scored} persona="moderate" today={today} lead="2위 X보다 1년에 5만 원 더 아껴요" />)
  expect(screen.getByText('2위 X보다 1년에 5만 원 더 아껴요')).toBeInTheDocument()
})

test('leadText: 1위는 2위와 비교, 그 외는 1위와 비교, 안 되는 영역 표시', async () => {
  const { leadText } = await import('./Results')
  const cafeOnly: Card = { ...oil, id: 'c', name: '카페카드', benefits: [{ tag: '카페', type: 'discount', rate: 10, monthlyCap: 10000, stars: 2 }] }
  const second: Scored = { card: cafeOnly, benefit: annualBenefit(cafeOnly, q)!, coveredTags: ['카페'], universalCovers: [] }
  const list = [scored, second]
  expect(leadText(list, 0, q.tags)).toBe('2위 카페카드보다 1년에 12만 원 더 아껴요 · 주유에서 거의 다 나와요')
  expect(leadText(list, 1, q.tags)).toBe('1위 신한카드 Deep Oil보다 1년에 12만 원 적어요 · 주유 혜택은 없어요')
})

test('혜택 목록: 사용액을 주면 요약 줄이 내 실적 구간 기준, 고른 영역이 먼저', async () => {
  const tiered: Card = { ...oil, benefits: [
    { tag: '카페', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3,
      tiers: [{ minSpend: 700000, monthlyCap: 30000 }, { minSpend: 1000000, rate: 12, monthlyCap: 50000 }] },
  ] }
  const oq: Query = { ...q, tags: ['주유'] }
  const s: Scored = { card: tiered, benefit: annualBenefit(tiered, oq)!, coveredTags: ['주유'], universalCovers: [] }
  render(<CardResult rank={1} scored={s} persona="moderate" today={today} pickedTags={['주유']} monthlySpend={1_000_000} />)
  await userEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
  const items = document.querySelectorAll('.benefit-item')
  expect(items[0].textContent).toContain('주유 12% 할인 · 월 최대 5만 원 (월 100만 원 기준)')
  expect(items[0].className).toContain('is-picked')
  expect(items[1].textContent).toContain('카페 5% 할인 · 월 최대 5,000원')
  expect(items[1].className).not.toContain('is-picked')
})

describe('K-패스 배지', () => {
  const base: Card = {
    id: 'kp', name: 'K카드', issuer: 'T', kind: 'credit', annualFee: 0, minSpend: 0, complexity: 1,
    benefits: [{ tag: '대중교통', type: 'discount', rate: 10, monthlyCap: 5000, stars: 2 }], universal: null,
    officialUrl: 'https://example.com', lastChecked: '2026-08-20', status: 'active', kpass: true,
  }
  const q = { persona: 'moderate' as const, monthlySpend: 500_000, feeLimit: null, tags: ['대중교통' as const] }
  test('일반 결과에서 K-패스 카드엔 배지, K-패스 트랙(환급 포함)에선 안 붙는다', () => {
    const [s] = recommend([base], q)
    const { rerender } = render(<CardResult rank={1} scored={s} persona="moderate" today={new Date('2026-08-20')} />)
    expect(screen.getByText(/K-패스 환급도 받아요/)).toBeInTheDocument()
    rerender(<CardResult rank={1} scored={s} persona="moderate" today={new Date('2026-08-20')} kpassRefund={240_000} />)
    expect(screen.queryByText(/K-패스 환급도 받아요/)).toBeNull()
  })
  test('K-패스 카드가 아니면 배지 없음', () => {
    const [s] = recommend([{ ...base, kpass: undefined }], q)
    render(<CardResult rank={1} scored={s} persona="moderate" today={new Date('2026-08-20')} />)
    expect(screen.queryByText(/K-패스 환급도 받아요/)).toBeNull()
  })
})
