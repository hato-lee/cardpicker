import raw from './cards.json'
import { validateCards } from './schema'
import { TAGS } from './tags'

test('cards.json은 스키마를 통과한다', () => {
  const cards = validateCards(raw)
  expect(cards.length).toBeGreaterThan(0)
})

test('TAGS는 16개', () => {
  expect(TAGS).toHaveLength(16)
})

// 한 혜택이 버스·지하철과 택시에 다 걸리면 줄을 복제해서 넣는다(2026-08-21 태그 분리).
// 복제하면서 통합 한도를 capGroup으로 안 묶으면 한도가 두 배로 계산된다 — 그 회귀를 막는다.
// 원문에 수단별 개별 한도가 있어 정말로 안 묶이는 카드만 예외로 둔다.
const SEPARATE_TRANSIT_CAP = ['hana-wonder-daily'] // 공식 상세표에 영역별 한도표가 각각 있음
test('대중교통·택시가 똑같은 줄 두 개면 capGroup으로 묶여 있다', () => {
  const cards = validateCards(raw)
  const tiersKey = (b: { tiers?: unknown }) => JSON.stringify(b.tiers ?? [])
  const unsafe: string[] = []
  for (const c of cards) {
    const bus = c.benefits.find((b) => b.tag === '대중교통')
    const taxi = c.benefits.find((b) => b.tag === '택시')
    if (!bus || !taxi) continue
    if (bus.capGroup !== undefined && bus.capGroup === taxi.capGroup) continue
    if (bus.monthlyCap === null) continue // 한도 없는 혜택은 나눠 쓸 상한 자체가 없다
    if (SEPARATE_TRANSIT_CAP.includes(c.id)) continue
    const sameBenefit = bus.rate === taxi.rate && bus.monthlyCap === taxi.monthlyCap && tiersKey(bus) === tiersKey(taxi)
    if (sameBenefit) unsafe.push(c.id)
  }
  expect(unsafe).toEqual([])
})
