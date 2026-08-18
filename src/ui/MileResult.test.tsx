import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MileResult, feePerMileText } from './MileResult'
import { Results } from './Results'
import { scoreMileage } from '../engine/mileage'
import type { Card, Query } from '../data/types'

const base: Card = {
  id: 'm', name: '마일카드', issuer: 'T', kind: 'credit', annualFee: 39000, minSpend: 0,
  benefits: [
    { tag: '마일리지', type: 'mileage', rate: 0.1, monthlyCap: null, stars: 2, note: '대한항공 스카이패스' },
    { tag: '해외 결제', type: 'mileage', rate: 0.2, monthlyCap: 1000, stars: 2 },
  ],
  universal: null, complexity: 1, officialUrl: 'https://example.com', lastChecked: '2026-08-18', status: 'active',
}
const q: Query = { persona: 'moderate', monthlySpend: 1_000_000, feeLimit: null, tags: ['마일리지'] }
const today = new Date('2026-08-18T00:00:00')

test('feePerMileText', () => {
  expect(feePerMileText(39000, 3.25)).toBe('마일당 3.3원')
  expect(feePerMileText(0, 0)).toBe('연회비 없음')
  expect(feePerMileText(39000, null)).toBe('')
})

test('연 마일·마일당 비용·덤 줄이 보인다', async () => {
  const s = scoreMileage(base, q)!
  render(<MileResult rank={1} scored={s} monthlySpend={q.monthlySpend} today={today} />)
  expect(screen.getByText('약 12,000마일')).toBeInTheDocument()
  expect(screen.getByText('연회비 3.9만 원 · 마일당 3.3원 · 월 100만 원을 전부 이 카드로 쓸 때')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
  expect(screen.getByText('쓰는 만큼 1,000원당 1마일 — 한도 없음')).toBeInTheDocument()
  expect(screen.getByText('덤으로')).toBeInTheDocument()
  expect(screen.getAllByText('해외 결제 1,000원당 2마일 · 월 최대 1,000마일').length).toBeGreaterThan(0)
})

test('Results 마일리지 모드: 성향 칩 없음, 빈 결과 문구', () => {
  render(<Results query={q} results={[]} mileResults={{ grouped: false, all: [] }} onEdit={() => {}} today={today} />)
  expect(screen.queryByText('적당형')).toBeNull()
  expect(screen.getByText('월 100만 원')).toBeInTheDocument()
  expect(screen.getByText('조건에 맞는 마일리지 카드를 못 찾았어요.')).toBeInTheDocument()
})

test('연간 보너스·프리미엄 혜택이 보인다 (보너스 포함 시 큰 숫자에 합산)', async () => {
  const premium: Card = { ...base, id: 'p', name: '더퍼스트', annualFee: 800000,
    mileageBonus: { miles: 30000, minAnnualSpend: 36_000_000, firstYearMinSpend: 1_000_000 },
    perks: ['전 세계 공항 라운지 무제한', '항공권 할인 쿠폰 연 4장'] }
  const s = scoreMileage(premium, { ...q, monthlySpend: 3_000_000 })!
  render(<MileResult rank={1} scored={s} monthlySpend={3_000_000} today={today} />)
  expect(screen.getByText('약 66,000마일')).toBeInTheDocument()
  expect(screen.getByText(/연간 보너스 30,000마일 포함/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
  expect(screen.getByText('연간 보너스 30,000마일 — 첫해는 누적 100만 원, 이후엔 연 3600만 원 이상 쓸 때')).toBeInTheDocument()
  expect(screen.getByText('프리미엄 혜택')).toBeInTheDocument()
  expect(screen.getByText('전 세계 공항 라운지 무제한')).toBeInTheDocument()
})

test('보너스 조건 미달이지만 첫해 조건은 되면 안내만', () => {
  const premium: Card = { ...base, id: 'p2', annualFee: 800000,
    mileageBonus: { miles: 30000, minAnnualSpend: 36_000_000, firstYearMinSpend: 1_000_000 } }
  const s = scoreMileage(premium, q)!
  render(<MileResult rank={1} scored={s} monthlySpend={q.monthlySpend} today={today} />)
  expect(screen.getByText('약 12,000마일')).toBeInTheDocument()
  expect(screen.getByText(/첫해엔 보너스 30,000마일 별도/)).toBeInTheDocument()
})

test('포인트 전환형 카드는 배지와 환산 기준이 보인다', async () => {
  const amex: Card = { ...base, id: 'amex', name: '아멕스', mileConversion: '멤버십 리워즈 포인트를 스카이패스 마일로 1.5:1 전환한 값이에요' }
  render(<MileResult rank={2} scored={scoreMileage(amex, q)!} monthlySpend={q.monthlySpend} today={today} />)
  expect(screen.getByText('포인트 전환형')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
  expect(screen.getByText('멤버십 리워즈 포인트를 스카이패스 마일로 1.5:1 전환한 값이에요')).toBeInTheDocument()
})
test('직접 적립 카드에는 배지가 없다', () => {
  render(<MileResult rank={1} scored={scoreMileage(base, q)!} monthlySpend={q.monthlySpend} today={today} />)
  expect(screen.queryByText('포인트 전환형')).toBeNull()
})

test('Results 묶음 모드: 일반/프리미엄 제목, 접힌 카드에도 부가혜택 첫 줄과 보너스 미충족 안내', () => {
  const cheap: Card = { ...base, id: 'c', name: '싼카드', annualFee: 20000 }
  const premium: Card = { ...base, id: 'p', name: '비싼카드', annualFee: 800000,
    mileageBonus: { miles: 30000, minAnnualSpend: 36_000_000 }, perks: ['라운지 무제한', '쿠폰 4장'] }
  const groups = { grouped: true as const, regular: [scoreMileage(cheap, q)!], premium: [scoreMileage(premium, q)!] }
  render(<Results query={{ ...q, feeLimit: null }} results={[]} mileResults={groups} onEdit={() => {}} today={today} />)
  expect(screen.getByRole('heading', { name: /연회비 10만 원 미만/ })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /프리미엄 · 연회비 10만 원 이상/ })).toBeInTheDocument()
  expect(screen.getByText('✦ 라운지 무제한 외 1개')).toBeInTheDocument()
  expect(screen.getByText(/연간 보너스 30,000마일은 연 3600만 원 이상 써야 받아요/)).toBeInTheDocument()
})

test('Results 묶음 모드: 프리미엄이 비면 그 묶음은 숨긴다', () => {
  const cheap: Card = { ...base, id: 'c', annualFee: 20000 }
  const groups = { grouped: true as const, regular: [scoreMileage(cheap, q)!], premium: [] }
  render(<Results query={{ ...q, feeLimit: null }} results={[]} mileResults={groups} onEdit={() => {}} today={today} />)
  expect(screen.queryByRole('heading', { name: /프리미엄/ })).toBeNull()
})
