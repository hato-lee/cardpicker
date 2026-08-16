import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CardResult } from './CardResult'
import type { Scored } from '../engine/recommend'
import type { Card } from '../data/types'

const oil: Card = {
  id: 'oil', name: '신한카드 Deep Oil', issuer: '신한카드', kind: 'credit', annualFee: 10000, minSpend: 300000,
  benefits: [
    { tag: '주유', type: 'discount', rate: 10, monthlyCap: 15000, stars: 3 },
    { tag: '카페·편의점', type: 'discount', rate: 5, monthlyCap: 5000, stars: 1 },
  ],
  universal: null, complexity: 2, officialUrl: 'https://example.com/oil', lastChecked: '2026-08-16', status: 'active',
}
const scored: Scored = { card: oil, score: 100, coveredTags: ['주유', '카페·편의점'], isUniversal: false }
const today = new Date('2026-08-20')

test('이름·카드사·이유·공식 링크·확인일이 보인다', () => {
  render(<CardResult rank={1} scored={scored} persona="moderate" pickedCount={2} today={today} />)
  expect(screen.getByText('신한카드 Deep Oil')).toBeInTheDocument()
  expect(screen.getByText(/신한카드 · 신용/)).toBeInTheDocument()
  expect(screen.getByText(/고른 2개 중 2개 커버/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /카드사 페이지/ })).toHaveAttribute('href', 'https://example.com/oil')
  expect(screen.getByText(/마지막 확인 2026-08-16/)).toBeInTheDocument()
  expect(screen.queryByText('확인 필요')).not.toBeInTheDocument()
})

test('90일 넘으면 확인 필요 뱃지', () => {
  render(<CardResult rank={1} scored={scored} persona="moderate" pickedCount={2} today={new Date('2026-12-01')} />)
  expect(screen.getByText('확인 필요')).toBeInTheDocument()
})

test('적당형에는 최대 혜택 표가 없다', () => {
  render(<CardResult rank={1} scored={scored} persona="moderate" pickedCount={2} today={today} />)
  expect(screen.queryByText(/영역별 월 최대 혜택/)).not.toBeInTheDocument()
})

test('꼼꼼형에는 최대 혜택 표와 합계가 있다', () => {
  render(<CardResult rank={1} scored={scored} persona="meticulous" pickedCount={2} today={today} />)
  expect(screen.getByText(/영역별 월 최대 혜택/)).toBeInTheDocument()
  expect(screen.getByText(/월 최대 2만 원/)).toBeInTheDocument()
  expect(screen.getByText(/연 최대 24만 원/)).toBeInTheDocument()
  expect(screen.getByText(/약 23만 원/)).toBeInTheDocument()
  expect(screen.getByText(/주유 15만 원·카페·편의점 10만 원 이상/)).toBeInTheDocument()
})

test('한도 없는 항목만 있으면 합계 대신 안내 문구', () => {
  const mileageOnly: Card = {
    id: 'mileage', name: '마일리지 카드', issuer: '테스트', kind: 'credit', annualFee: 300000, minSpend: 0,
    benefits: [
      { tag: '마일리지', type: 'mileage', rate: 0.067, monthlyCap: null, stars: 1 },
    ],
    universal: null, complexity: 1, officialUrl: 'https://example.com/mileage', lastChecked: '2026-08-16', status: 'active',
  }
  const mileageScored: Scored = { card: mileageOnly, score: 100, coveredTags: ['마일리지'], isUniversal: false }
  render(<CardResult rank={1} scored={mileageScored} persona="meticulous" pickedCount={1} today={today} />)
  const sum = screen.getByText(/한도 없음 — 쓰는 만큼 적립돼요/)
  expect(sum).toBeInTheDocument()
  expect(sum.textContent).toBe('한도 없음 — 쓰는 만큼 적립돼요 (연회비 30만 원)')
  expect(screen.queryByText(/약 -/)).not.toBeInTheDocument()
  expect(screen.queryByText(/※ 한도를 다 채우려면/)).not.toBeInTheDocument()
})

test('연회비가 최대 혜택보다 크면 마이너스 대신 경고 문구', () => {
  const lossCard: Card = {
    id: 'loss', name: '손해 카드', issuer: '테스트', kind: 'credit', annualFee: 100000, minSpend: 0,
    benefits: [
      { tag: '주유', type: 'discount', rate: 10, monthlyCap: 5000, stars: 1 },
    ],
    universal: null, complexity: 1, officialUrl: 'https://example.com/loss', lastChecked: '2026-08-16', status: 'active',
  }
  const lossScored: Scored = { card: lossCard, score: 100, coveredTags: ['주유'], isUniversal: false }
  render(<CardResult rank={1} scored={lossScored} persona="meticulous" pickedCount={1} today={today} />)
  expect(screen.getByText(/연회비가 최대 혜택보다 4만 원 커요/)).toBeInTheDocument()
})

test('혜택 요약 펼치기', async () => {
  render(<CardResult rank={1} scored={scored} persona="moderate" pickedCount={2} today={today} />)
  expect(screen.queryByText(/10% 할인/)).not.toBeInTheDocument()
  const toggle = screen.getByRole('button', { name: /혜택 요약/ })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await userEvent.click(toggle)
  expect(screen.getByText(/10% 할인/)).toBeInTheDocument()
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
})
