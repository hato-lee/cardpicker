import raw from './cards.json'
import { validateCards } from './schema'
import { TAGS } from './tags'

test('cards.json은 스키마를 통과한다', () => {
  const cards = validateCards(raw)
  expect(cards.length).toBeGreaterThan(0)
})

test('TAGS는 14개', () => {
  expect(TAGS).toHaveLength(14)
})
