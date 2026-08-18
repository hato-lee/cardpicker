import { rateText, won } from './format'

test('won', () => {
  expect(won(0)).toBe('0원')
  expect(won(5000)).toBe('5,000원')
  expect(won(10000)).toBe('1만 원')
  expect(won(13000)).toBe('1.3만 원')
  expect(won(300000)).toBe('30만 원')
})

test('rateText 할인/적립', () => {
  expect(rateText('discount', 10)).toBe('10% 할인')
  expect(rateText('points', 1)).toBe('1% 적립')
})

test('rateText 마일리지', () => {
  expect(rateText('mileage', 0.067)).toBe('1,000원당 0.67마일')
  expect(rateText('mileage', 0.1)).toBe('1,000원당 1마일')
  expect(rateText('mileage', 0.15)).toBe('1,000원당 1.5마일')
})

test('rateText: rate 0은 정액·특별 혜택으로 표기', () => {
  expect(rateText('discount', 0)).toBe('정액·특별 혜택')
  expect(rateText('mileage', 0)).toBe('정액·특별 혜택')
})
