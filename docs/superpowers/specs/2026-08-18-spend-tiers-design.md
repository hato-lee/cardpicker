# 카드피커 — 실적 구간(tiers) 설계 (2026-08-18)

`2026-08-18-annual-benefit-design.md`의 "범위 밖: 실적 구간별 한도"를 범위 안으로 가져온다. 나머지(연 최대 혜택 계산, 화면 구조)는 그대로.

## 왜
많은 카드가 전월 실적 구간에 따라 **요율·월 한도**가 달라진다(예: 신한 Edu 50만↑ 5%·1.5만 / 100만↑ 7%·3만 / 150만↑ 10%·4.5만). 지금 데이터는 카드마다 임의의 한 구간 값만 들고 있어(대부분 최저, 일부는 최고) 어떤 카드는 과소, 어떤 카드는 과대평가된다. 사용자는 이미 **한 달 사용액 S**를 입력하므로, 구간을 데이터에 넣고 엔진이 S에 맞는 구간을 고르면 된다. 사용액 = 전월 실적으로 본다(기존 minSpend 필터와 같은 가정).

## 데이터

```ts
export interface Tier {
  minSpend: number          // 이 실적(원) 이상이면 이 구간. 카드 minSpend보다 커야 한다
  rate?: number             // 없으면 기본 rate 그대로
  monthlyCap: number | null // 이 구간의 월 한도(원, mileage면 마일). null = 한도 없음
}
Benefit.tiers?: Tier[]      // 기본 rate/monthlyCap보다 높은 구간들만, minSpend 오름차순
Universal.tiers?: Tier[]    // 같은 형식
```

- **기본값(rate/monthlyCap) = 최저 구간** = 카드 `minSpend`부터 적용되는 값. `tiers`는 그 위 구간만 적는다.
- 스키마 검증(zod, 한국어 메시지):
  - `tiers`는 `minSpend`가 **엄격히 오름차순**이고 모두 카드 `minSpend`보다 커야 한다.
  - `capGroup`이 같은 혜택들은 `tiers`가 **같은 길이·같은 minSpend·같은 monthlyCap**이어야 한다(rate는 달라도 됨). 기존 "기본 monthlyCap 동일" 규칙과 합쳐서 검사.
  - `universal.tiers`가 있으면 `모든 가맹점` 벤핏의 `tiers`와 (minSpend, monthlyCap) 열이 같아야 한다.
- 수집 브리프 규칙(BRIEF/VERIFY-BRIEF/CAP-BRIEF에 추가): "실적 구간이 있으면 기본값은 최저 구간, 상위 구간은 `tiers`에. note에는 구간 나열을 반복하지 않는다(화면이 구조적으로 보여준다)."

## 엔진 (`benefit.ts`)

- `resolveTier(b, S)`: `tiers` 중 `minSpend ≤ S`인 **마지막** 구간을 고른다. 없으면 기본값. 반환 `{ rate, monthlyCap, nextTier }` — `nextTier`는 고른 구간 바로 위 구간(없으면 undefined).
- `makeRow`는 resolve된 rate/monthlyCap으로 기존 계산을 그대로 한다(가정 한도, 정액, 마일 환산 모두 동일). `BenefitRow`에 `nextTier?: Tier` 추가. `BenefitRow.rate/monthlyCap`은 **적용된 구간 값**이다.
- `applyCapGroups`·총액 상한·성향 비율·정렬은 변화 없음(그룹 한도는 줄의 resolve된 monthlyCap을 그대로 씀 — 스키마가 그룹 내 동일을 보장).
- 범용 줄도 `card.universal.tiers`로 같은 resolve.

## 설명 (`explain.ts`)

- 한도 있는 정률 줄의 tip 끝에 `nextTier`가 있으면 괄호로 한 마디: 
  - 한도만 다르면 `(월 사용액 {won(next.minSpend)}부터는 한도 {cap})`
  - 요율도 다르면 `(월 사용액 {won(next.minSpend)}부터는 {rateText}·한도 {cap})` (cap null이면 "한도 없음")
- 범용 줄·정액 줄·가정 한도 줄에는 붙이지 않는다. 무심형은 기존대로 1줄에 접두 유지.

## 화면 (`CardResult.tsx` 전체 혜택 목록)

`benefitText`: 기본 표기 뒤에 tiers가 있으면 `(실적 {won(minSpend)}↑ [rate%·]{cap}, …)`를 붙인다. 예:
`학원·교육 5% 할인 · 월 최대 1.5만 원 (실적 100만 원↑ 7%·3만 원, 150만 원↑ 10%·4.5만 원)`. rate가 기본과 같으면 rate 부분 생략. note는 그 뒤에 기존처럼.

## 데이터 이행
- note에 구간이 적힌 혜택(~30장)을 카드사별 에이전트가 공식/참고 페이지로 재확인해 `tiers` 패치로 만든다(기본값을 최저 구간으로 되돌리는 것 포함: 신한 Edu·Edu Plan+, 삼성 iD SELECT ALL·taptap DIGITAL·iD PET, NH zgm shopping, BC 바로 클리어 플러스 등). note에서 구간 나열 문장은 제거.
- 패치 형식은 기존 `apply-corrections.mjs`(benefits[].set에 `tiers` 포함) 그대로.

## RULES
변경 없음.

## 테스트
- 스키마: tiers 오름차순 위반·카드 minSpend 이하·capGroup 불일치·universal/모든 가맹점 불일치 → 한국어 에러.
- 엔진: S가 구간 사이/경계(같음)/최상위 위/기본 이하일 때 rate·cap·nextTier; capGroup+tiers 그룹 한도가 구간에 따라 커지는지; universal tiers.
- 설명: nextTier 문구(한도만/요율도), viaUniversal엔 안 붙음.
- UI: 전체 혜택 줄에 구간 표기, tiers 없으면 기존 문자열 그대로.

## 범위 밖
태그별 지출 입력, 결제 건당 금액 구간(예: 3만원 이상 결제 시 5%), 연간 한도.
