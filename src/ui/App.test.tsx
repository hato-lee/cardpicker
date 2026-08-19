import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

async function goToResults(persona = '적당형', tags = ['주유'], feeLimit = '200000') {
  await userEvent.click(screen.getByText(persona))
  await userEvent.type(screen.getByLabelText(/한 달 카드 사용액/), '100')
  fireEvent.change(screen.getByLabelText(/연회비 허용치/), { target: { value: feeLimit } })
  await userEvent.click(screen.getByRole('button', { name: '다음' }))
  for (const t of tags) await userEvent.click(screen.getByRole('button', { name: t }))
  await userEvent.click(screen.getByRole('button', { name: '추천 받기' }))
}

test('세 화면을 순서대로 지나 결과가 나온다', async () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /^나에 대해/ })).toBeInTheDocument()
  await goToResults()
  expect(screen.getByRole('heading', { name: /맞는 카드 TOP \d/ })).toBeInTheDocument()
  // 실데이터에 의존하지 않도록 특정 카드명 대신 "결과 카드가 1장 이상"만 확인한다
  expect(screen.getAllByRole('link', { name: /카드사 페이지/ }).length).toBeGreaterThan(0)
})

test('조건 바꾸기를 누르면 첫 화면으로', async () => {
  render(<App />)
  await goToResults()
  await userEvent.click(screen.getAllByRole('button', { name: '조건 바꾸기' })[0])
  expect(screen.getByRole('heading', { name: /^나에 대해/ })).toBeInTheDocument()
})

test('무심형·학원·교육 조합에서도 결과가 나온다', async () => {
  render(<App />)
  await goToResults('무심형', ['학원·교육'])
  expect(screen.getAllByText('연 최대').length).toBeGreaterThan(0)
})

// '맞는 카드가 없으면 빈 안내' 테스트는 실데이터와 무관하게 AppEmpty.test.tsx에서 cards.json을 비워 검증한다.

// 제보 폼 주소는 아직 자리표시자(REPLACE_ME)라 링크를 숨긴다.
// Task 10에서 실제 구글 폼 주소로 바꾸면 링크가 보인다.
test('제보 폼 주소가 자리표시자면 링크를 숨긴다', async () => {
  render(<App />)
  await goToResults()
  expect(screen.queryByRole('link', { name: /제보하기/ })).toBeNull()
})

test('마일리지만 고르면 마일리지 트랙: 마일 단위 결과', async () => {
  render(<App />)
  await goToResults('적당형', ['마일리지'])
  // 연회비 한도 20만(프리미엄 기준 이상)이라 일반/프리미엄 묶음으로 나뉜다
  expect(screen.getByRole('heading', { name: '당신에게 맞는 마일리지 카드' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /연회비 10만 원 미만/ })).toBeInTheDocument()
  expect(screen.getAllByText('연 예상').length).toBeGreaterThan(0)
  expect(screen.getAllByText(/약 [\d,]+마일/).length).toBeGreaterThan(0)
  expect(screen.queryByText('연 최대')).toBeNull()
})

test('마일리지 트랙: 연회비 한도가 10만 원 미만이면 한 줄 TOP N', async () => {
  render(<App />)
  await goToResults('적당형', ['마일리지'], '50000')
  expect(screen.getByRole('heading', { name: /맞는 마일리지 카드 TOP \d/ })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: /프리미엄/ })).toBeNull()
})
