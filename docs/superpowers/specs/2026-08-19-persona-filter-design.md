# 성향 = 카드 후보 필터 (금액 곱하기 폐지)

2026-08-19. `2026-08-18-annual-benefit-design.md`의 personaRealization 부분을 대체한다.

## 왜
"무심형은 한도의 60%로 계산" 같은 비율은 근거가 없고, 무심한 사람이 혜택을 덜 받는 게 아니라 **복잡한 카드를 못 써먹는** 것이라 개념이 어색했다. 성향은 이제 금액을 바꾸지 않고 **어떤 카드를 보여줄지**만 정한다.

## 규칙
| 성향 | 일반 트랙 후보 | 마일리지 트랙 후보 |
|---|---|---|
| 꼼꼼형 | 전부 | 전부 |
| 적당형 | complexity ≤ 2 | complexity ≤ 2 |
| 무심형 | complexity ≤ 2 **+ 고른 영역을 한 장으로 다 커버** | complexity ≤ 2 |

- "다 커버" = 고른 태그마다 그 태그 benefit이 있거나(coveredTags) 모든 가맹점 적립으로 받쳐준다(universalCovers). 즉 `coveredTags ∪ universalCovers == q.tags`.
- 무심형에서 다 커버하는 카드가 0장이면 **자동으로 풀어서** 커버 개수 많은 순 → 연 혜택 순으로 보여주고, 결과 위에 한 줄 안내: "고른 영역을 한 장으로 다 되는 카드가 없어서, 가장 많이 되는 카드부터 보여줘요."
- 금액: `annualNet = annualGross − annualFee`. 성향 무관. `personaRealization`·`annualRealized`·`carefreeMaxComplexity` 삭제.
- 무심형은 **할인·캐시백형 먼저, 포인트형 뒤** (`carefreeDiscountFirst`). 포인트형 = 월 혜택 중 포인트 적립 줄 비율(`AnnualBenefit.pointsShare`) > `pointsHeavyShare`(0.5). 이유: 포인트는 쌓아뒀다 써야 혜택이라 무심형은 흘려보내기 쉬움. 포인트형 카드엔 성향 무관하게 "포인트 적립형" 배지.
- 포인트 사용 난이도 데이터: `Card.pointsProgram`(포인트 이름) · `Card.pointsEase`('cash' 현금처럼 / 'shop' 써야 함 / 'limited' 특정 곳에서만) · `Card.pointsNote`(사용법 한 줄). 무심형 정렬은 `isHardPoints` = 포인트형 && pointsEase !== 'cash' (모르면 뒤로). 배지 문구는 pointsEase별("포인트 적립 · 현금처럼 써요" 등), 자세히 보기에 "쌓이는 포인트: 이름 — 사용법". 조사 브리프 `docs/data-collection/points-2026-08-19/`.
- 마일리지 트랙에는 복잡도 필터만 (마일 무심하게 쌓는 사람도 있으니 성향을 살짝만 반영).
- 실적(minSpend) 조건은 성향과 무관하게 기존대로 `monthlySpend ≥ minSpend`만 본다 (한 장으로 쓰면 자동 충족).

## RULES
```ts
personaMaxComplexity: { meticulous: 3, moderate: 2, carefree: 2 },
carefreeFullCoverOnly: true,
carefreeDiscountFirst: true,
pointsHeavyShare: 0.5,
```

## 엔진
- `recommend.ts`: `passesFilters`가 `personaMaxComplexity` 사용. 새 `recommendGeneral(cards, q, rules): { items: Scored[]; relaxed: boolean }` — 무심형이면 fullCover 필터 후 0장이면 relaxed=true로 커버 개수 정렬. 기존 `recommend()`는 `.items`를 돌려주는 래퍼로 유지.
- `mileage.ts`: `rankMileage`에 complexity 필터 추가.
- `explain.ts`: `rowAnnualValue(row)`에서 persona 제거. `tips`의 개수(tipCount)는 표시 취향이므로 유지.

## 화면
- 성향 설명(StepProfile):
  - 꼼꼼형 "실적·한도 계산하는 게 귀찮지 않아요 → 복잡한 카드까지 전부 봐요 — 가장 많이 아끼는 순"
  - 적당형 "대충은 알고 쓰지만 매번 계산하긴 귀찮아요 → 선택형·조건 복잡한 카드는 빼요 — 가장 많이 아끼는 순"
  - 무심형 "한 장 꽂아두고 아예 신경 끄고 싶어요 → 고른 영역이 한 장으로 다 되는 단순한 카드만 — 할인형 먼저"
- CardResult 부제: "연회비 X 뺀 금액 · 한도를 다 채웠을 때" (성향 % 표기 삭제)
- 마일리지 결과 칩에도 성향 표시 (이제 영향을 주므로)
- Results: relaxed 안내 한 줄

## 테스트
- recommend: 적당형 complexity 3 제외 / 무심형 fullCover만 / 0장이면 relaxed + 커버 개수 정렬 / annualNet에 성향 곱 없음
- mileage: 무심형에서 complexity 3 마일리지 카드 제외
- UI: 성향 문구, 부제 문구, relaxed 안내
