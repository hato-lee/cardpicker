# 카드고릴라 월간 31~100위 빈 카드 수집 브리프 (2026-08-20)

`docs/data-collection/gorilla-top30-2026-08-20/TOP30-BRIEF.md`의 방법·규칙을 그대로 따르되, 아래만 다르다:
- 배정 파일: `docs/data-collection/gorilla-31-100-2026-08-20/targets-X.json`
- 출력 파일: `docs/data-collection/gorilla-31-100-2026-08-20/incoming/top100-X.json`
- memo의 순위 표기는 "카드고릴라 월간 N위".
- **먼저 반드시 읽을 것**: `docs/data-collection/BRIEF.md`(형식·태그 14개), `docs/data-collection/existing-ids.txt`(중복 금지).
- 카드고릴라 상세는 페이지가 JS라서 공개 API를 써라: `curl -sL "https://api.card-gorilla.com/v1/cards/{gorillaIdx}"` 형식이 안 되면 A조가 쓴 방법대로 api.card-gorilla.com에서 카드 상세를 찾아라. 상품안내 원문·공식 신청 링크·발급 여부(is_discon)가 들어 있다.

## 이 배치의 특별 규칙
- **프리미엄 카드**(연회비 10만 원 이상: AmEx Green/Platinum, Summit, 메리어트, TWO CHAIRS, ALL Infinite, JADE Prime, THE 1, BLISS, BeV Ⅲ, 하나 스카이패스 아멕스 등): BRIEF의 프리미엄 규칙 — 초대·자산 조건 없이 누구나 신청 가능해야 수록. 바우처·라운지·호텔 무료숙박은 memo 한 줄. 14개 태그 안 혜택(마일리지·모든 가맹점·해외 결제 포함)이 없으면 빼고 사유를 마지막 답변에.
- **TWO CHAIRS(연회비 250만)**: 자산 조건(우리은행 TWO CHAIRS 고객 전용)이 있으면 빼라.
- **국민행복 삼성카드 V2**: 정부 바우처 카드지만 일반 발급 가능하면 수록하고 memo에 "국민행복카드(바우처 겸용)" 명시. 바우처 자체는 혜택으로 넣지 마라.
- **단종 의심**: 신한 The CLASSIC+·The BEST-XO·RPM+ Platinum#, 삼성 iD SIMPLE·네이버페이 taptap 같은 구형은 신규 발급 여부(is_discon)를 꼭 확인. 단종이면 넣지 말고 마지막 답변에.
- 체크카드(토스뱅크 하나카드 Day 등)는 kind "check", annualFee 0 (연회비가 있으면 그 값).
