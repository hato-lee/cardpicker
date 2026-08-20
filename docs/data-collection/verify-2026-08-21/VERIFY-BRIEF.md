# 검증 브리프 (2026-08-21) — 수집 시 "검수 필요" 표시분

너는 카드피커 데이터 검증가다. `src/data/cards.json`에서 배정된 카드를 읽고, 공식 페이지·카드고릴라 API(`curl -sL -A "Mozilla/5.0" https://api.card-gorilla.com/v1/cards/검색`)·뱅크샐러드·언론 보도로 교차 확인해라.
- 목표는 **숫자의 사실 확인**: 요율·월 한도·실적 구간·연회비·발급 여부. 카드피커는 "한도를 다 채웠을 때 연 최대치"를 계산하므로 monthlyCap이 제일 중요하다.
- 데이터를 직접 고치지 마라. 결과는 `docs/data-collection/verify-2026-08-21/findings-X.json`에 JSON 배열로 저장:
  `[{ "id": "...", "field": "benefits[0].rate 등", "current": 현재값, "proposed": 제안값(맞으면 null), "verdict": "확인일치|수정필요|확인불가", "evidence": "근거 한 줄(출처 포함)" }]`
- 카드고릴라 상세 API의 pr_detail/key_benefit이 상품안내 원문이라 1차 근거로 좋다. 공식 페이지가 JS면 그렇게 적어라.
- 마지막 답변 12줄 이내: 카드별 판정 한 줄씩 + 수정 필요 요약.
