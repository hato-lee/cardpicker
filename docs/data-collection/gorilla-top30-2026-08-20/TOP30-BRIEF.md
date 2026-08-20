# 카드고릴라 월간 TOP 30 빈 카드 수집 브리프 (2026-08-20)

너는 인기 카드 데이터를 `docs/data-collection/BRIEF.md` 형식의 JSON으로 정리하는 수집가다.
먼저 **`docs/data-collection/BRIEF.md`를 반드시 읽어라** — 형식·태그 14개(2026-08-20에 카페/편의점, 통신비/OTT·구독으로 분리됨)·★ 기준·tiers·capGroup 규칙이 다 거기 있다.
`docs/data-collection/existing-ids.txt`의 id와 겹치면 안 된다.

## 방법
1. 배정 파일 `targets-X.json`의 카드만 수집한다. 각 항목의 `gorillaUrl`(카드고릴라 상세)을 WebFetch로 읽어라 — 혜택 요약·연회비·전월실적·공식 페이지 링크가 있다. `annualFeeRaw`/`topBenefitRaw`는 랭킹 API 원본 참고값.
2. 카드고릴라에서 공식 페이지 링크를 찾아 officialUrl로 쓰고, 가능하면 공식 페이지를 WebFetch로 읽어 요율·월 한도·실적 구간·제외 항목을 교차 확인해라. 안 읽히면(JS 페이지 등) 카드고릴라+뱅크샐러드로 확정하고 memo에 명시.
3. **월 한도를 꼭 찾아라** — 이 사이트는 한도로 연 혜택을 계산한다. 실적 구간별 한도가 다르면 tiers.
4. lastChecked "2026-08-20". memo는 "AI 수집(2026-08-20, 고릴라TOP30), 검수 전. 출처: …"로 시작. 카드고릴라 월간 순위도 memo에 적어라(예: "카드고릴라 월간 7위").

## 특별 확인 사항
- **현대 알파벳카드 S/R**: 현대카드가 2026년에 낸 '알파벳카드' 시리즈다. 기존 DB의 현대카드X·현대카드 H·Z 시리즈(existing-ids: hyundai-x, hyundai-h, hyundai-z-play 등)의 리뉴얼/후속인지, 기존 카드가 아직 신규 발급되는지 확인해서 마지막 답변에 적어라 (기존 카드 데이터는 고치지 말 것).
- **신한 Discount Plan+ / Simple Plan+**: 신한 Plan+ 시리즈. 기존 Simple+(단종 처리됨)·Deep 시리즈와의 관계, Deep Oil·Deep Dream이 아직 발급되는지도 마지막 답변에.
- 프리미엄 카드(AmEx Gold Edition2 등): BRIEF의 프리미엄 규칙대로 — 누구나 신청 가능해야 하고, 14개 태그 안 혜택이 하나도 없으면 넣지 말고 마지막 답변에 사유.
- 단종·발급중단이면 넣지 말고 마지막 답변에 적어라.

## 출력
- `docs/data-collection/gorilla-top30-2026-08-20/incoming/top30-X.json`에 JSON 배열만 저장(주석 없음). 저장 후 `node -e 'JSON.parse(require("fs").readFileSync("<파일>","utf8"))'`로 파싱 확인.
- 마지막 답변(12줄 이내): 카드별 이름·연회비·핵심 혜택 한 줄 / 뺀 카드와 이유 / 특별 확인 사항 답 / 미확인 사항.
