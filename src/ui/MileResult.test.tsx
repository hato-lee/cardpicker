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
  render(<Results query={q} results={[]} mileResults={[]} onEdit={() => {}} today={today} />)
  expect(screen.queryByText('적당형')).toBeNull()
  expect(screen.getByText('월 100만 원')).toBeInTheDocument()
  expect(screen.getByText('조건에 맞는 마일리지 카드를 못 찾았어요.')).toBeInTheDocument()
})
