# K-패스 카드 전수 수집 브리프 (2026-08-20)

너는 **K-패스(대중교통비 환급) 카드**를 전부 찾아 `docs/data-collection/BRIEF.md` 형식의 JSON으로 정리하는 수집가다.
먼저 `docs/data-collection/BRIEF.md`(형식·태그·★ 기준·tiers·capGroup 규칙)와 `docs/data-collection/existing-ids.txt`(이미 있는 카드 — 중복 금지)를 읽어라.
이미 들어있는 K-패스 카드 6장: shinhan-kpass, shinhan-kpass-check, kb-kpass, kb-kpass-check, nh-chaeum-kpass-check, bnk-gyeongnam-kpass-check → 이건 넣지 마라.

## 목표
카드피커에 "K-패스 카드만 따로 소개하는 칸"을 만들지 검토 중이다. 그래서 **현재 신규 발급 가능한 K-패스 카드 전부**(신용·체크 모두, 지방은행·인터넷은행·모바일 포함)가 필요하다.
- K-패스 공식 사이트(korea-pass.kr)의 카드 안내 / 카드사별 K-패스 카드 페이지가 1순위 근거.
- 배정받은 카드사 목록의 카드만 수집한다. 한 카드사에 신용·체크가 따로 있으면 각각 1장.
- **선불/모바일형(카카오페이 모바일교통카드, 이동의즐거움 모바일 K-패스 등)**도 카드 형태라면 넣되 kind는 "check", annualFee 0, 신용/체크가 아니면 memo에 "선불·모바일형"이라고 적어라.

## K-패스 카드 기재 규칙 (BRIEF.md에 더해)
- **K-패스 정부 환급(일반 20%·청년 30%·저소득층 53%, 월 15회 이상 이용 시, 월 60회 한도)은 카드사 혜택이 아니다.** benefits에 넣지 말고 memo에 "K-패스 환급 대상 카드"라고만 적어라. 모든 K-패스 카드에 공통이므로 나중에 화면에서 따로 설명한다.
- benefits엔 **카드사가 K-패스 환급과 별개로 주는 자체 혜택**만: 대중교통 추가 할인/적립(보통 10% 안팎), 생활서비스(카페·편의점·온라인쇼핑·통신비 등), 해외 결제 등. `대중교통·택시` 태그는 거의 모든 카드에 있을 것이다.
- 월 한도·실적 구간·통합 한도는 BRIEF.md의 tiers/capGroup 규칙대로. **한도를 꼭 찾아라**(이 사이트는 한도로 연 혜택을 계산한다).
- 체크카드는 kind "check", annualFee 0. 신용카드 연회비는 국내전용 최저값.
- id는 `<카드사영문>-kpass` / `<카드사영문>-kpass-check` 형식(예: samsung-kpass, hyundai-kpass, woori-kpass-check, ibk-kpass, kbank-kpass-check, kwangju-kpass, dgb-kpass, busan-kpass-check, kakaopay-kpass-mobile). 기존 6장과 id·이름 겹치지 않게.
- name은 카드사 공식 표기(예: "삼성카드 K-패스", "현대카드 Z work Edition2(K-패스)"처럼 공식 명칭이 다른 이름이면 그 이름 + 괄호로 K-패스 표기).
- lastChecked "2026-08-20". memo는 "AI 수집(2026-08-20), 검수 전. K-패스 환급 대상 카드. 출처: …"로 시작.
- 단종·발급중단이면 넣지 말고 마지막 답변에 적어라.

## 출력
- 지정된 `docs/data-collection/kpass-2026-08-20/incoming/kpass-X.json`에 JSON 배열만 저장(주석 없음). 저장 후 `node -e 'JSON.parse(require("fs").readFileSync("<파일>","utf8"))'`로 파싱 확인.
- 마지막 답변(12줄 이내): 넣은 카드 이름·연회비·대중교통 혜택 한 줄씩 / 찾았지만 뺀 카드와 이유 / 미확인 사항.

## 배정 파일 (targets-X.json)
- 각 에이전트는 `targets-X.json`에 있는 카드만 수집한다. 이 파일은 K-패스 공식 사이트(korea-pass.kr/assets/js/cardData.js)에서 뽑은 요약(혜택·실적·한도·연회비·공식 URL)이라 **출발점이자 교차 확인 근거**다. 공식 카드사 페이지(officialUrl)를 WebFetch로 읽어 세부 수치(요율·월 한도·실적 구간·제외 항목)를 확정하고, 안 읽히면 뱅크샐러드/카드고릴라 참고 후 memo에 명시. 그래도 못 찾으면 cardData 요약값을 쓰고 memo에 "출처: korea-pass.kr 요약(세부 미확인)".
- 지역 변형(경기패스·경남패스·이응패스 등)은 targets에 없으면 넣지 말고, 기본 카드 memo에 "경기패스/경남패스/이응패스 버전 있음(혜택 동일, 지역 추가 혜택)"처럼 한 줄만.
- 지역화폐형(동백전·여민전)이나 범용 체크카드에 K-패스 기능만 붙은 카드: 12개 태그 안의 상시 혜택(대중교통·카페·편의점·통신 등)이 하나라도 있으면 넣고, 전통시장처럼 태그 밖 혜택뿐이면 넣지 말고 마지막 답변에 "태그 밖 혜택뿐이라 제외"로 적어라.
- 이미 DB에 있는 같은 카드(예: tossbank-check 토스뱅크 체크카드, kbank-one-check 케이뱅크 ONE 체크카드, hyundai-z-work-edition2)는 새로 만들지 말고, 마지막 답변에 "기존 카드 = K-패스 대상" 목록으로 알려라. 단 혜택 구조가 다른 별도 상품(예: 카카오뱅크 'K-패스 프렌즈 체크카드'는 '프렌즈 체크카드'와 다름)은 새로 넣는다.
- IBK K-패스 체크의 "건당 100원" 같은 정액은 BRIEF 규칙대로 rate 0 + monthlyCap + note. 광주은행 "1만 5천점"처럼 포인트면 type "points".
