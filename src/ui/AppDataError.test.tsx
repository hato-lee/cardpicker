import { render, screen } from '@testing-library/react'

// cards.json이 스키마를 어기는 상황을 흉내 낸다
vi.mock('../data/cards.json', () => ({ default: [{ id: 'broken-card' }] }))

const { default: App } = await import('./App')

test('cards.json이 깨졌으면 흰 화면 대신 안내가 나온다', () => {
  render(<App />)
  expect(screen.getByText(/카드 데이터에 문제가 있어요/)).toBeInTheDocument()
  expect(screen.getByText(/broken-card/)).toBeInTheDocument()
})
