# 마일리지 재검수 진행 상태 (2026-08-18)
- 브리프: MILEAGE-BRIEF.md, 배치 A~D(batch-*.json), 에이전트 4명 실행.
- corrections-A·B·C·D 모두 적용·커밋 완료(테스트 117 통과). 남은 것: 배포 확인, 엔진 결정(아래).
- 엔진 발견: '마일리지'만 고르면 마일 혜택 없는 카드가 범용(포인트/할인)으로 대신 계산돼 상위에 옴(mileageOnlyWhenPicked의 반대 방향 미처리). 후보 수정: '마일리지' 태그는 universal.type이 mileage일 때만 범용으로 커버 (benefit.ts annualBenefit + recommend.ts universalCoversOf + 테스트). → 구현 완료(RULES.mileageTagOnlyByMileage). 마일 표기 0.067 → '1,500원당 1마일'로 변경.
