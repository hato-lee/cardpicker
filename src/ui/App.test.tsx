import { render, screen } from '@testing-library/react'
import App from './App'

test('앱이 뜬다', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: '카드픽' })).toBeInTheDocument()
})
