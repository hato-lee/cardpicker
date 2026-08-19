import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StepPersona, StepBudget, type Profile } from './StepProfile'
import { useState } from 'react'

function PersonaHarness({ onNext = () => {} }: { onNext?: () => void }) {
  const [p, setP] = useState<Profile>({ persona: null, monthlySpendMan: '', feeLimit: 30_000, transitSpendMan: '', kpassGroup: 'general' })
  return <StepPersona value={p} onChange={setP} onNext={onNext} />
}
function Harness({ onSubmit = () => {}, mileage = false, kpass = false }: { onSubmit?: () => void; mileage?: boolean; kpass?: boolean }) {
  const [p, setP] = useState<Profile>({ persona: 'moderate', monthlySpendMan: '', feeLimit: 30_000, transitSpendMan: '', kpassGroup: 'general' })
  return <StepBudget value={p} onChange={setP} onBack={() => {}} onSubmit={onSubmit} mileage={mileage} kpass={kpass} />
}

test('성향 타일 3개, 고르기 전엔 안내, 고르면 그 성향 설명만', async () => {
  render(<PersonaHarness />)
  expect(screen.getAllByRole('radio')).toHaveLength(3)
  expect(screen.getByText('하나를 골라 주세요 — 어떤 카드를 보여줄지 달라져요')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('radio', { name: '적당형' }))
  expect(screen.getByRole('radio', { name: '적당형' })).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByText('대충은 알고 쓰지만 매번 계산하긴 귀찮아요')).toBeInTheDocument()
  expect(screen.getByText('→ 선택형·조건 복잡한 카드는 빼요 — 가장 많이 아끼는 순')).toBeInTheDocument()
  expect(screen.queryByText(/복잡한 카드까지 전부 봐요/)).toBeNull()
  await userEvent.click(screen.getByRole('radio', { name: '무심형' }))
  expect(screen.getByText('한 장 꽂아두고 아예 신경 끄고 싶어요')).toBeInTheDocument()
  expect(screen.getByText('→ 고른 영역이 한 장으로 다 되는 단순한 카드만 — 할인형 먼저')).toBeInTheDocument()
})

test('사용액 빠른 선택 버튼을 누르면 입력칸에 들어간다', async () => {
  render(<Harness />)
  await userEvent.click(screen.getByRole('button', { name: '50만' }))
  expect(screen.getByLabelText(/한 달에 카드로 얼마나/)).toHaveValue(50)
  await userEvent.click(screen.getByRole('button', { name: '200만' }))
  expect(screen.getByLabelText(/한 달에 카드로 얼마나/)).toHaveValue(200)
})

test('연회비 힌트 문구', () => {
  render(<Harness />)
  expect(screen.getByText('이 금액을 넘는 카드는 안 보여줘요.')).toBeInTheDocument()
})

test('성향을 고르기 전엔 다음 비활성, 고르면 활성', async () => {
  const onNext = vi.fn()
  render(<PersonaHarness onNext={onNext} />)
  const next = screen.getByRole('button', { name: '다음' })
  expect(next).toBeDisabled()
  await userEvent.click(screen.getByText('적당형'))
  expect(next).toBeEnabled()
  await userEvent.click(next)
  expect(onNext).toHaveBeenCalled()
})

test('사용액을 넣기 전엔 추천 받기 비활성, 넣으면 활성 (마일리지면 문구가 다름)', async () => {
  const onSubmit = vi.fn()
  const { unmount } = render(<Harness onSubmit={onSubmit} />)
  const go = screen.getByRole('button', { name: '추천 받기' })
  expect(go).toBeDisabled()
  await userEvent.type(screen.getByLabelText(/한 달에 카드로 얼마나/), '100')
  expect(go).toBeEnabled()
  await userEvent.click(go)
  expect(onSubmit).toHaveBeenCalled()
  unmount()
  render(<Harness mileage />)
  expect(screen.getByRole('button', { name: '마일리지 카드 추천 받기' })).toBeInTheDocument()
})

test('연회비 슬라이더: 20만 원까지는 실제 값, 그 다음 한 칸이 상관없음', () => {
  render(<Harness />)
  const slider = screen.getByLabelText(/연회비는 얼마까지/) as HTMLInputElement
  expect(screen.getByText('3만 원')).toBeInTheDocument()
  fireEvent.change(slider, { target: { value: '200000' } })
  expect(screen.getByText('20만 원', { selector: '.slider-value' })).toBeInTheDocument()
  fireEvent.change(slider, { target: { value: '210000' } })
  expect(screen.getByText('상관없음', { selector: '.slider-value' })).toBeInTheDocument()
  expect(slider.max).toBe('210000')
})

test('+10/−10 버튼으로 사용액을 미세 조정한다', async () => {
  render(<Harness />)
  const input = screen.getByLabelText(/한 달에 카드로 얼마나/)
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

describe('K-패스 트랙 입력', () => {
  test('kpass가 아니면 교통비 질문이 없다', () => {
    render(<Harness />)
    expect(screen.queryByLabelText('그중 버스·지하철비는 얼마예요?')).toBeNull()
  })
  test('교통비 프리셋·그룹 타일, 교통비 없으면 못 넘어간다', async () => {
    const onSubmit = vi.fn()
    render(<Harness kpass onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: '100만' }))
    const go = screen.getByRole('button', { name: 'K-패스 카드 추천 받기' })
    expect(go).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: '10만' }))
    expect(screen.getByLabelText('그중 버스·지하철비는 얼마예요?')).toHaveValue(10)
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    await userEvent.click(screen.getByRole('radio', { name: /청년/ }))
    expect(screen.getByRole('radio', { name: /청년/ })).toHaveAttribute('aria-checked', 'true')
    expect(go).toBeEnabled()
    await userEvent.click(go)
    expect(onSubmit).toHaveBeenCalled()
  })
  test('교통비가 카드 사용액보다 크면 경고하고 막는다', async () => {
    render(<Harness kpass />)
    await userEvent.click(screen.getByRole('button', { name: '30만' }))
    fireEvent.change(screen.getByLabelText('그중 버스·지하철비는 얼마예요?'), { target: { value: '40' } })
    expect(screen.getByText('카드 사용액보다 클 수는 없어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'K-패스 카드 추천 받기' })).toBeDisabled()
  })
})
