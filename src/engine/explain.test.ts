import { isStale } from './explain'

test('isStale', () => {
  const today = new Date('2026-11-20')
  expect(isStale('2026-08-16', today)).toBe(true)   // 96일
  expect(isStale('2026-09-01', today)).toBe(false)  // 80일
})

test('isStale 날짜 경계 (시각에 무관한 달력일 비교)', () => {
  expect(isStale('2026-08-16', new Date('2026-11-14T23:59:00'))).toBe(false) // 정확히 90일
  expect(isStale('2026-08-16', new Date('2026-11-15T00:00:01'))).toBe(true)  // 91일
})
