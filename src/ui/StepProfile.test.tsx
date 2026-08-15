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
  expect(screen.getByText('실적·한도 다 따지고 결제 전에 어떤 카드 낼지 생각해요')).toBeInTheDocument()
  expect(screen.getByText('적당형')).toBeInTheDocument()
  expect(screen.getByText('무심형')).toBeInTheDocument()
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
