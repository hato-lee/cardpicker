import raw from './cards.json'
import { validateCards } from './schema'
import { TAGS } from './tags'

test('cards.json은 스키마를 통과한다', () => {
  const cards = validateCards(raw)
  expect(cards.length).toBeGreaterThan(0)
})

test('TAGS는 17개', () => {
  expect(TAGS).toHaveLength(17)
})

// 한 혜택이 두 태그에 다 걸리면 줄을 복제해서 넣는다(대중교통/택시 2026-08-21, 배달앱/외식 2026-08-22).
// 복제하면서 통합 한도를 capGroup으로 안 묶으면 한도가 두 배로 계산된다 — 그 회귀를 막는다.
// 원문에 영역별 개별 한도가 있어 정말로 안 묶이는 카드만 예외로 둔다.
const SEPARATE_CAP_OK = [
  'hana-wonder-daily',   // 공식 상세표에 영역별 한도표가 각각 있음
  'ibk-bliss-mileage',   // 외식은 자체 한도, 배달앱은 '온라인' 영역 한도(capGroup on) — 영역이 달라 값만 같다
]
describe.each([
  ['대중교통', '택시'],
  ['배달앱', '외식'],
] as const)('%s·%s를 쪼개면서 한도를 두 배로 만들지 않았다', (tagA, tagB) => {
  test('똑같은 줄 두 개면 capGroup으로 묶여 있다', () => {
    const cards = validateCards(raw)
    const tiersKey = (b: { tiers?: unknown }) => JSON.stringify(b.tiers ?? [])
    const unsafe: string[] = []
    for (const c of cards) {
      const a = c.benefits.find((b) => b.tag === tagA)
      const b = c.benefits.find((x) => x.tag === tagB)
      if (!a || !b) continue
      if (a.capGroup !== undefined && a.capGroup === b.capGroup) continue
      if (a.monthlyCap === null) continue // 한도 없는 혜택은 나눠 쓸 상한 자체가 없다
      if (SEPARATE_CAP_OK.includes(c.id)) continue
      const sameBenefit = a.rate === b.rate && a.monthlyCap === b.monthlyCap && tiersKey(a) === tiersKey(b)
      if (sameBenefit) unsafe.push(c.id)
    }
    expect(unsafe).toEqual([])
  })
})
