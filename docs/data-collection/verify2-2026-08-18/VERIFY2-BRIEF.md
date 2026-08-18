# 카드피커 일반(할인·적립) 카드 전체 재검수 브리프 (2026-08-18)

너는 이미 저장된 한국 신용/체크카드 데이터(AI 초안 + 부분 검증)를 **공식 정보와 대조해 틀린 값을 고치는 검증가**다.
마일리지 카드는 따로 끝냈고, 이번엔 **할인·적립 카드 전부**를 처음부터 다시 본다. 추측으로 고치지 말고 확인된 것만 고쳐라. 못 확인한 건 "미확인"으로 남겨라.

## 입력
- 지정된 `batch-X.json`: 검증할 카드 배열(현재 저장된 값 그대로). `memo`에 지난 검증 이력이 있지만 참고만 하고 처음부터 다시 확인한다.

## 도구·순서 (카드 1장당 WebSearch 4회 안에서. 세션 전체 검색 한도가 있다.)
1. `officialUrl`을 WebFetch로 읽는다. 읽히면 1순위 근거.
2. 안 읽히면 WebSearch로 "<카드명> 혜택 연회비 전월실적" → 카드사 공식(모바일 m.xxx 포함) 우선, 안 되면 뱅크샐러드(banksalad.com/product/cards/…)·카드고릴라·토스 카드라운지. 참고 사이트를 쓰면 memoAppend에 "출처: 뱅크샐러드 참고" 명시.
3. 사이트 경험: 신한(shinhancard.com)·KB(m.kbcard.com)·롯데·BC(m.bccard.com)·케이뱅크 잘 읽힘 / 삼성 절반 / 현대·하나·NH·우리 JS라 참고 사이트.

## 확인할 것 (카드마다)
1. **판매 중인가?** 단종·신규발급 중단이 확실하면 `status: "discontinued"`.
2. `annualFee`(원, 정수. 브랜드별로 다르면 가장 낮은 값, 국내전용 우선), `minSpend`(전월실적 원, 없으면 0).
3. `benefits` 각 항목: `rate`(%), `monthlyCap`(월 한도 원), `note`, `capGroup`(한도를 공유하는 혜택들엔 같은 문자열). 값이 바뀌면 `stars`도 다시.
   - **월 한도**: 공식에 있으면 숫자, "한도 없음"이 명시돼 있으면 null, 모르면 null + memoAppend에 "미확인: 월 한도". (엔진은 한도 정보가 없는 영역 혜택을 월 1만 원까지만 계산한다.)
   - **실적 구간**: 구간이 있으면 note로 쓰지 말고 `tiers`로. 기본 rate/monthlyCap = 카드 minSpend부터 적용되는 최저 구간, `tiers`는 그 위 구간만 minSpend 오름차순(카드 minSpend보다 커야 함): `"tiers": [{ "minSpend": 700000, "monthlyCap": 30000 }, { "minSpend": 1000000, "rate": 12, "monthlyCap": 50000 }]`. rate는 기본과 다를 때만. capGroup 혜택들은 tiers의 minSpend·monthlyCap이 서로 같아야 하고 tiers의 monthlyCap은 null 불가. universal에 구간이 있으면 universal.tiers와 '모든 가맹점' 벤핏 tiers를 같게. 상위 구간 monthlyCap은 공식 '한도 없음'일 때만 null(모르면 구간을 넣지 마라).
   - **정액 혜택**(리터당 N원, 건당 N원, 수수료 면제): rate 0, note에 내용, monthlyCap에 월 한도 원(없으면 null).
4. `universal`: 전 가맹점 적립/할인이 있으면 {type, rate, monthlyCap}, 없으면 null. universal이 있으면 benefits에 `모든 가맹점` 항목이 반드시 있고 rate/cap/tiers가 같아야 한다.
5. 12개 태그 안에서 **빠진 큰 혜택**이 있으면 addBenefits, 태그 밖(영화·백화점·라운지 등)은 memoAppend에만.
6. `officialUrl`이 카드사 공식 도메인 https 상세 페이지인지. 더 정확한 주소를 찾으면 교체(뱅크샐러드·카드고릴라 주소 금지).
7. 이벤트성·기간 한정 혜택은 반영하지 않는다. 상시 기본 혜택만.
8. **note는 사용자에게 그대로 보이는 문장이다.** "확인 필요", "미확인", "출처: …", "참고", "공식 확인", "addBenefits", "tiers" 같은 내부 문구를 note에 절대 쓰지 마라(memoAppend로). 구간 나열도 note에 쓰지 마라(tiers가 화면에 나온다). 짧고 자연스럽게.

## 태그 12개 (정확히 이 문자열만)
`마일리지` · `모든 가맹점` · `주유` · `카페·편의점` · `온라인 쇼핑` · `배달·외식` · `대중교통·택시` · `통신비·OTT` · `병의원·약국` · `해외 결제` · `학원·교육` · `관리비·공과금`
- 해외 결제 수수료 면제만 있으면 rate 0, note에 적고 stars 1.
- 같은 카드 안에 같은 tag 두 번 금지.

## ★ 기준
- 영역 혜택: ★3 = 7% 이상이면서 월 한도 15,000원 이상 / ★2 = 3~7% 또는 한도 5,000원 초과~15,000원 / ★1 = 그 외.
- `모든 가맹점`은 rate 기준: 0.5% 미만 ★1, 0.5~1% 미만 ★2, 1% 이상 ★3.
- 복잡도(complexity): 1 = 전 가맹점 단일 적립/할인·실적 없거나 낮음 / 2 = 영역 혜택 2~3개·실적 1단계 / 3 = 선택형·실적 구간별·제외 많음.

## 출력: 지정된 `corrections-X.json`에 **패치 배열만** (JSON, 주석 없음)
카드 1장 = 패치 1개. 고칠 게 없어도 memoAppend는 반드시.
```json
[
  {
    "id": "kb-gaon",
    "set": { "annualFee": 15000, "minSpend": 300000, "lastChecked": "2026-08-18" },
    "benefits": [
      { "tag": "주유", "set": { "rate": 5, "monthlyCap": 10000, "stars": 2, "note": "정유사 1곳 선택, LPG 제외", "tiers": [{ "minSpend": 700000, "monthlyCap": 20000 }] } },
      { "tag": "학원·교육", "remove": true }
    ],
    "addBenefits": [
      { "tag": "통신비·OTT", "type": "discount", "rate": 10, "monthlyCap": 5000, "stars": 2, "note": "이동통신 자동이체" }
    ],
    "memoAppend": " 재검수(2026-08-18): 공식 페이지 대조. 연회비 일치, 주유 구간 tiers 이행, 학원 혜택 없어 삭제, 통신 자동이체 추가. 미확인: 온라인 월 한도. 출처: m.kbcard.com"
  }
]
```
- `set`·`benefits`·`addBenefits`는 **바뀐 것만**. 안 바뀌면 키 자체를 빼라.
- 벤핏 필드를 지우려면 `"note": null` / `"tiers": null` / `"capGroup": null`. 카드의 `universal`을 없애려면 `"universal": null`.
- `set`에 `lastChecked: "2026-08-18"`을 항상(아무것도 확인 못 한 경우만 제외).
- `memoAppend`는 " 재검수(2026-08-18): "로 시작(앞에 공백 하나). 무엇을 대조하고 무엇을 고쳤는지, 출처, 미확인 항목을 한 줄로.
- 단종: `"set": {"status": "discontinued", "lastChecked": "2026-08-18"}` + memoAppend 근거.
- 아무것도 확인 못 하면 set 없이 memoAppend에 " 재검수(2026-08-18): 확인 실패 — <이유>"만.

## 마지막 답변 (12줄 이내)
검증 카드 수 / 값이 바뀐 카드와 무엇이 바뀌었는지 한 줄씩 / 단종 / 확인 실패.
