/**
 * 조정 가능한 숫자는 전부 여기. 다른 파일에 숫자를 흩뿌리지 않는다.
 * 실제 카드를 넣고 결과를 보며 고친다.
 */
export const RULES = {
  topN: 5,
  staleDays: 90,

  // 점수 비중
  weight: {
    coverage: 30,   // 고른 태그 하나 커버할 때마다
    stars: 8,       // 커버한 태그의 ★ 하나마다
    fee: 10,        // 연회비 0원이면 만점, feeCap 이상이면 0점
    minSpend: 10,   // 실적 0원이면 만점, spendCap 이상이면 0점
  },
  feeCap: 100_000,
  spendCap: 500_000,

  // 성향 보정: 최종 점수에 곱한다
  personaMultiplier: {
    meticulous: { universal: 1.0, area: 1.15 },
    moderate:   { universal: 1.15, area: 0.85 },
    carefree:   { universal: 1.4,  area: 0.6 },
  },
  // 무심형은 복잡도 3 제외
  carefreeMaxComplexity: 2,
} as const

export type Rules = typeof RULES

/** AI가 카드 페이지를 읽고 ★·복잡도를 매길 때 따르는 기준. 검수 때도 이 기준으로 조정. */
export const STAR_GUIDE = `
★3: 할인/적립 7% 이상이면서 월 한도 15,000원 이상, 또는 마일리지 1,000원당 1.5마일 이상
★2: 할인/적립 3~7% 또는 월 한도 5,000~15,000원, 마일리지 1,000원당 1마일 안팎
★1: 그 외 (5% 미만이면서 한도 5,000원 미만 등)
복잡도 1: 전 가맹점 단일 적립/할인, 실적 없거나 낮음, 제외 항목 거의 없음
복잡도 2: 영역 혜택 2~3개, 실적 조건 1단계
복잡도 3: 선택형 팩, 실적 구간별 한도, 제외 항목 많음
"모든 가맹점" 태그: universal이 있으면 벤핏에도 tag '모든 가맹점'을 하나 넣는다.
전 가맹점 마일리지 적립 카드: universal(type mileage) + 벤핏 tag '마일리지'.
`
