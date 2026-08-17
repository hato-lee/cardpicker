/**
 * 조정 가능한 숫자는 전부 여기. 다른 파일에 숫자를 흩뿌리지 않는다.
 * 실제 카드를 넣고 결과를 보며 고친다.
 */
export const RULES = {
  topN: 5,
  staleDays: 90,
  // 성향 = 한도를 실제로 얼마나 챙기는지. 연 혜택에 곱한다.
  personaRealization: { meticulous: 1.0, moderate: 0.8, carefree: 0.6 },
  // 1마일 ≈ 15원으로 환산
  mileWon: 15,
  // 무심형은 복잡도 3 제외
  carefreeMaxComplexity: 2,
  // "이렇게 쓰면 최대" 문장 개수 (성향별)
  tipCount: { meticulous: Infinity, moderate: 2, carefree: 1 },
  // 한 달 사용액 빠른 선택 버튼 (만 원)
  spendPresetsMan: [30, 50, 100, 150],
  // 결과 카드의 내역 줄 최대 개수 (넘으면 "외 N개")
  breakdownMaxRows: 3,
}

export type Rules = typeof RULES

/** AI가 카드 페이지를 읽고 ★·복잡도를 매길 때 따르는 기준. 검수 때도 이 기준으로 조정. */
export const STAR_GUIDE = `
★3: 할인/적립 7% 이상이면서 월 한도 15,000원 이상, 또는 마일리지 1,000원당 1.5마일 이상
★2: 할인/적립 3~7% 또는 월 한도 5,000~15,000원, 마일리지 1,000원당 1마일 안팎
★1: 그 외 (5% 미만이면서 한도 5,000원 미만 등)
"모든 가맹점"(범용 적립/할인) 벤핏의 ★은 적립률로: 0.5% 미만 ★1, 0.5% 이상~1% 미만 ★2, 1% 이상 ★3 (마일리지 범용은 마일리지 기준 적용)
복잡도 1: 전 가맹점 단일 적립/할인, 실적 없거나 낮음, 제외 항목 거의 없음
복잡도 2: 영역 혜택 2~3개, 실적 조건 1단계
복잡도 3: 선택형 팩, 실적 구간별 한도, 제외 항목 많음
"모든 가맹점" 태그: universal이 있으면 벤핏에도 tag '모든 가맹점'을 하나 넣는다.
전 가맹점 마일리지 적립 카드: universal(type mileage) + 벤핏 tag '마일리지'와 '모든 가맹점' 둘 다 넣는다.
monthlyCap 단위: type이 'mileage'면 "월 최대 적립 마일"(마일 단위), 그 밖(discount/points)은 원 단위.
`
