import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StepProfile, type Profile } from './StepProfile'
import { useState } from 'react'

function Harness({ onNext = () => {} }: { onNext?: () => void }) {
  const [p, setP] = useState<Profile>({ persona: null, monthlySpendMan: '', feeLimit: 30_000 })
  return <StepProfile value={p} onChange={setP} onNext={onNext} />
}

test('성향 3개와 설명이 보인다', () => {
  render(<Harness />)
  expect(screen.getByText('꼼꼼형')).toBeInTheDocument()
  expect(screen.getByText('실적·한도 다 따지고 결제 전에 어떤 카드 낼지 생각해요 → 한도를 다 챙긴다고 계산해요')).toBeInTheDocument()
  expect(screen.getByText('대충은 알고 쓰지만 매번 계산하진 않아요 → 한도의 80%로 계산해요')).toBeInTheDocument()
  expect(screen.getByText('한 장 꽂아두고 신경 끄고 싶어요 → 한도의 60%로 계산해요')).toBeInTheDocument()
})

test('사용액 빠른 선택 버튼을 누르면 입력칸에 들어간다', async () => {
  render(<Harness />)
  await userEvent.click(screen.getByRole('button', { name: '50만' }))
  expect(screen.getByLabelText(/한 달 카드 사용액/)).toHaveValue(50)
  await userEvent.click(screen.getByRole('button', { name: '200만' }))
  expect(screen.getByLabelText(/한 달 카드 사용액/)).toHaveValue(200)
})

test('연회비 힌트 문구', () => {
  render(<Harness />)
  expect(screen.getByText('이 금액을 넘는 카드는 안 보여줘요. 결과의 연 혜택은 연회비를 이미 뺀 금액이에요.')).toBeInTheDocument()
})

test('성향과 사용액을 넣기 전엔 다음 버튼이 비활성', async () => {
  const onNext = vi.fn()
  render(<Harness onNext={onNext} />)
  const next = screen.getByRole('button', { name: '다음' })
  expect(next).toBeDisabled()
  await userEvent.click(screen.getByText('적당형'))
  expect(next).toBeDisabled()
  await userEvent.type(screen.getByLabelText(/한 달 카드 사용액/), '100')
  expect(next).toBeEnabled()
  await userEvent.click(next)
  expect(onNext).toHaveBeenCalled()
})

test('연회비 슬라이더 끝은 상관없음', () => {
  render(<Harness />)
  const slider = screen.getByLabelText(/연회비 허용치/) as HTMLInputElement
  expect(screen.getByText('3만 원')).toBeInTheDocument()
  fireEvent.change(slider, { target: { value: '200000' } })
  expect(screen.getByText('상관없음')).toBeInTheDocument()
})

test('+10/−10 버튼으로 사용액을 미세 조정한다', async () => {
  render(<Harness />)
  const input = screen.getByLabelText(/한 달 카드 사용액/)
  const plus = screen.getByRole('button', { name: '10만 원 더하기' })
  const minus = screen.getByRole('button', { name: '10만 원 빼기' })
  expect(minus).toBeDisabled() // 비어 있으면(0) 더 못 뺌
  await userEvent.click(screen.getByRole('button', { name: '50만' }))
  await userEvent.click(plus)
  await userEvent.click(plus)
  expect(input).toHaveValue(70)
  await userEvent.click(minus)
  expect(input).toHaveValue(60)
  // 빠른 선택 버튼 하이라이트는 정확히 그 값일 때만
  expect(screen.getByRole('button', { name: '50만' })).toHaveAttribute('aria-pressed', 'false')
})
