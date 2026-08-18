# 마일리지 재검수 진행 상태 (2026-08-18)
- 브리프: MILEAGE-BRIEF.md, 배치 A~D(batch-*.json), 에이전트 4명 실행.
- corrections-B·C·D 적용 완료(테스트 통과, 커밋됨). corrections-A(KB·NH) 에이전트 진행 중이었음 — 파일 생기면 적용:
  `for f in docs/data-collection/mileage-2026-08-18/corrections-*.json; do node docs/data-collection/apply-corrections.mjs $f; done && npm run build`
  (스키마 에러 나면 universal.tiers ↔ '모든 가맹점' tiers 일치 여부부터 확인) → 커밋·push.
- 엔진 발견: '마일리지'만 고르면 마일 혜택 없는 카드가 범용(포인트/할인)으로 대신 계산돼 상위에 옴(mileageOnlyWhenPicked의 반대 방향 미처리). 후보 수정: '마일리지' 태그는 universal.type이 mileage일 때만 범용으로 커버 (benefit.ts annualBenefit + recommend.ts universalCoversOf + 테스트). 사용자 결정 필요.
