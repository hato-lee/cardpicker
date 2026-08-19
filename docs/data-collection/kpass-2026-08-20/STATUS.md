# K-패스 카드 전수 수집 상태 (2026-08-20)

## 출처
- 공식 목록: https://korea-pass.kr/info/card_guide.do → 실제 데이터는 `korea-pass.kr/assets/js/cardData.js` (`korea-pass.kr_cardData.raw.js`로 보관). 발급사 27곳, 61종.
- 2026-08-12부터 사업 명칭이 "모두의카드"로 바뀜(카드 이름은 아직 K-패스). 서울 기후동행패스 연계는 2026-09-01 예정(혜택 레이어, 새 카드 아님).
- 미참여: 우체국·수협.

## 정리 원칙
- 지역 변형(경기패스·경남패스·이응패스 등, 혜택 동일)은 별도 카드로 안 넣고 기본 카드 memo에 한 줄. 혜택 구조가 다른 신한 인천 i-패스는 별도 수록.
- 지역화폐형(부산 동백전·세종 여민전·제주 탐나는전) 5장은 `regional-hold.json`에 보관, DB엔 미수록(지역 주민 전용이라 전국 추천에 부적합 — 나중에 지역 필터 생기면 검토).
- 선불·모바일 10종은 신용/체크가 아니라 `incoming/kpass-prepaid.json`(느슨한 형식)에 따로. "K-패스 칸"을 만들면 "앱으로 바로 쓰는 방법"으로 쓸 수 있음.
- K-패스 정부 환급(일반 20%·청년 30%·저소득층 53%, 월 15회↑, 월 60회 한도)은 카드 혜택에 안 넣음(전 카드 공통 → 화면에서 따로 설명).
- 이미 DB에 있던 K-패스 대상 카드: shinhan-kpass(+check), kb-kpass(+check), nh-chaeum-kpass-check, bnk-gyeongnam-kpass-check, 그리고 K-패스 기능이 붙는 tossbank-check·kbank-one-check·hyundai-z-work-edition2.

## 결과
- 신규 수록 23장 (incoming/kpass-A~D → kpass-merge.json): 신한 3(인천 신용·체크, 티머니 Pay&GO), NH 신용 1, 하나 2, 우리 2, 삼성 2, 롯데 1, iM뱅크 2, IBK 2, 광주 1, BC 바로 1, 경남 신용 1, 전북 2, 카카오뱅크 K-패스 프렌즈 체크 1, 신협 1, 새마을금고 1.
- 검증: 상위 노출 카드 batch-V1/V2 (corrections-V1/V2.json 참고).
- 제외: 하나 부산 동백전 체크(태그 밖 혜택뿐), 부산은행 동백전 체크(부산 내 전용), 우리 BC망 구형 K-패스(단종).
