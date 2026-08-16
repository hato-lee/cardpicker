import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

async function goToResults(persona = '적당형', tags = ['주유']) {
  await userEvent.click(screen.getByText(persona))
  await userEvent.type(screen.getByLabelText(/한 달 카드 사용액/), '100')
  fireEvent.change(screen.getByLabelText(/연회비 허용치/), { target: { value: '200000' } })
  await userEvent.click(screen.getByRole('button', { name: '다음' }))
  for (const t of tags) await userEvent.click(screen.getByRole('button', { name: t }))
  await userEvent.click(screen.getByRole('button', { name: '추천 받기' }))
}

test('세 화면을 순서대로 지나 결과가 나온다', async () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: '나에 대해' })).toBeInTheDocument()
  await goToResults()
  expect(screen.getByRole('heading', { name: /맞는 카드/ })).toBeInTheDocument()
  expect(screen.getByText('신한카드 Deep Oil')).toBeInTheDocument()
})

test('조건 바꾸기를 누르면 첫 화면으로', async () => {
  render(<App />)
  await goToResults()
  await userEvent.click(screen.getByRole('button', { name: '조건 바꾸기' }))
  expect(screen.getByRole('heading', { name: '나에 대해' })).toBeInTheDocument()
})

test('맞는 카드가 없으면 빈 안내', async () => {
  render(<App />)
  await goToResults('무심형', ['학원·교육'])
  expect(screen.getByText(/맞는 카드를 못 찾았어요/)).toBeInTheDocument()
})

test('제보 링크가 있다', async () => {
  render(<App />)
  await goToResults()
  expect(screen.getByRole('link', { name: /제보하기/ })).toBeInTheDocument()
})
