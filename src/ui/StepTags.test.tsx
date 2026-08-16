import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { StepTags, TAG_WARN_TEXT } from './StepTags'
import type { Tag } from '../data/tags'

function Harness({ onSubmit = () => {} }: { onSubmit?: () => void }) {
  const [t, setT] = useState<Tag[]>([])
  return <StepTags value={t} onChange={setT} onBack={() => {}} onSubmit={onSubmit} />
}

test('태그 12개 버튼이 보인다', () => {
  render(<Harness />)
  expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(12)
})

test('하나도 안 고르면 추천 받기 비활성, 고르면 활성', async () => {
  render(<Harness />)
  const submit = screen.getByRole('button', { name: '추천 받기' })
  expect(submit).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: '주유' }))
  expect(submit).toBeEnabled()
  expect(screen.getByRole('button', { name: '주유' })).toHaveAttribute('aria-pressed', 'true')
})

test('다시 누르면 해제된다', async () => {
  render(<Harness />)
  await userEvent.click(screen.getByRole('button', { name: '주유' }))
  await userEvent.click(screen.getByRole('button', { name: '주유' }))
  expect(screen.getByRole('button', { name: '주유' })).toHaveAttribute('aria-pressed', 'false')
})

test('4개째부터 안내 문구가 뜬다', async () => {
  render(<Harness />)
  for (const t of ['주유', '마일리지', '해외 결제']) await userEvent.click(screen.getByRole('button', { name: t }))
  expect(screen.queryByText(TAG_WARN_TEXT)).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: '온라인 쇼핑' }))
  expect(screen.getByText(TAG_WARN_TEXT)).toBeInTheDocument()
})
