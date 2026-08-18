# 카드피커 — 마일리지 전용 트랙 설계 (2026-08-18)

## 왜
항공 마일을 원하는 사람은 "원 환산 혜택"이 아니라 **마일 수**로 카드를 고른다. 지금은 '마일리지'가 12개 태그 중 하나라 (1) 다른 태그와 섞여 원으로 환산(1마일=15원 가정)돼 순위가 매겨지고, (2) 화면도 원으로만 보여서 "10.5만 원이 어디서 나왔지?"가 된다. 그래서 마일리지는 **별도 트랙**으로 뗀다: 마일리지를 고르면 다른 태그를 못 고르고, 결과는 마일 단위로, 순위도 마일로.

## 흐름
- 1단계(성향·월 사용액·연회비 한도)는 그대로. 마일리지 트랙은 **월 사용액 S·연회비 한도**만 쓰고 성향은 무시한다(마일 카드는 대부분 한도가 없어 "한도의 80%"가 의미 없음).
- 2단계(태그): '마일리지'는 **배타적**. 마일리지를 누르면 다른 태그가 모두 해제되고, 다른 태그를 누르면 마일리지가 해제된다. 마일리지가 선택돼 있으면 힌트: "항공 마일리지는 따로 추천해요. 다른 혜택과는 같이 고를 수 없어요."
- 3단계: `query.tags`가 `['마일리지']`이면 마일리지 결과 화면, 아니면 기존 화면. 조건 칩에서 성향 칩은 뺀다.

## 엔진 (`src/engine/mileage.ts`)
```ts
export interface MileScored {
  card: Card
  rate: number              // 적용 구간의 1,000원당 마일 ×0.1 표기(데이터 rate 그대로)
  monthlyCap: number | null // 적용 구간 월 한도(마일)
  nextTier?: Tier
  monthlyMiles: number      // min(S × rate/100, cap)  (cap null이면 S × rate/100)
  annualMiles: number       // monthlyMiles × 12, 정수 반올림
  feePerMile: number | null // annualFee / annualMiles (annualMiles 0이면 null)
  extras: Benefit[]         // '마일리지'·'모든 가맹점' 이외 벤핏(해외 결제 2마일 등). 순위엔 안 씀
}
export function recommendMileage(cards: Card[], q: Query, rules = RULES): MileScored[]
```
- 후보: `status === 'active'`, `annualFee ≤ feeLimit`(null이면 무시), `minSpend ≤ S`, 그리고 `type mileage`인 '마일리지' 벤핏이 있거나 `universal.type === 'mileage'`. 기본 적립원은 '마일리지' 벤핏, 없으면 universal.
- 구간은 기존 `resolveTier`로 S에 맞춰 고른다.
- 정렬: `annualMiles` 큰 순 → 연회비 낮은 순 → 실적 낮은 순. `RULES.topN`개.
- 원 환산(`mileWon`)은 이 트랙에서 **쓰지 않는다**. 성향 비율도 안 쓴다.

## 화면 (`src/ui/MileResult.tsx`, `Results.tsx` 분기)
- 제목: "당신에게 맞는 마일리지 카드 TOP N".
- 카드 머리: 기존과 같음(이름·카드사·연회비·실적).
- 큰 숫자: `연 약 12,000마일` (천 단위 콤마, "약"). 아래 작은 글씨: `연회비 3.9만 원 · 마일당 3.3원 · 월 100만 원을 전부 이 카드로 쓸 때`. 연회비 0이면 "마일당 0원" 대신 "연회비 없음".
- "이렇게 쓰면 최대" 1줄: `쓰는 만큼 1,000원당 1마일 — 한도 없음` / 한도 있으면 `월 N만 원 이상 쓰면 한도(2,000마일)를 꽉 채워요` + 다음 구간 괄호(기존 nextTierText와 같은 문구).
- "덤으로": extras 각 줄 `해외 결제 1,000원당 2마일 · 월 최대 1,000마일 (note)` (기존 benefitText 재사용). 없으면 섹션 생략.
- 전체 혜택·카드사 페이지·마지막 확인은 기존과 동일. 접기/펼치기 동일.
- 빈 결과 문구: "조건에 맞는 마일리지 카드를 못 찾았어요. 연회비 허용치를 올려보세요."

## RULES
변경 없음(`mileWon`은 일반 트랙에서 마일 카드가 섞일 일이 없어져 사실상 안 쓰이지만 남겨둔다).

## 데이터
형식 변경 없음. 마일리지 카드 추가 수집(프리미엄·포인트→마일 전환형)은 `docs/data-collection/mileage-2026-08-18/COLLECT-BRIEF.md`.
후속 후보: 프리미엄 부가서비스(라운지·바우처)를 보여주려면 사용자용 필드(`perks?: string`)가 필요 — 이번엔 memo에만.

## 테스트
- 엔진: 후보 필터(연회비·실적·마일 벤핏 없음), monthlyMiles(한도 없음/있음/구간), 정렬, extras, feePerMile.
- StepTags: 마일리지 누르면 다른 태그 해제, 다른 태그 누르면 마일리지 해제, 힌트 표시.
- Results/MileResult: 마일 단위 표시, 마일당 비용, 덤 줄, 빈 결과, 성향 칩 없음.

## 범위 밖
해외 결제 비중 입력, 마일 가치 원 환산 표시, 마일 종류(항공사) 필터, 부가서비스 표시.
