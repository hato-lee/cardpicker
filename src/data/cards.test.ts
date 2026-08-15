import raw from './cards.json'
import { validateCards } from './schema'
import { TAGS } from './tags'

test('cards.json은 스키마를 통과한다', () => {
  const cards = validateCards(raw)
  expect(cards.length).toBeGreaterThan(0)
})

test('universal이 있는 카드는 "모든 가맹점" 벤핏도 가진다', () => {
  for (const c of validateCards(raw)) {
    if (c.universal) {
      expect(c.benefits.some((b) => b.tag === '모든 가맹점')).toBe(true)
    }
  }
})

test('TAGS는 12개', () => {
  expect(TAGS).toHaveLength(12)
})
