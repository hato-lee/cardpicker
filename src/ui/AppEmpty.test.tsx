import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// cards.json을 빈 배열로 바꿔서, 실데이터가 늘어나도 '결과 없음' 화면을 안정적으로 검증한다.
vi.mock('../data/cards.json', () => ({ default: [] }))

import App from './App'

test('맞는 카드가 없으면 빈 안내', async () => {
  render(<App />)
  await userEvent.click(screen.getByText('무심형'))
  await userEvent.type(screen.getByLabelText(/한 달 카드 사용액/), '100')
  fireEvent.change(screen.getByLabelText(/연회비 허용치/), { target: { value: '200000' } })
  await userEvent.click(screen.getByRole('button', { name: '다음' }))
  await userEvent.click(screen.getByRole('button', { name: '학원·교육' }))
  await userEvent.click(screen.getByRole('button', { name: '추천 받기' }))
  expect(screen.getByText(/맞는 카드를 못 찾았어요/)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '당신에게 맞는 카드' })).toBeInTheDocument()
})
