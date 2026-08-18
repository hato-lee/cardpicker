# 일반 카드 재검수 진행 상태 (2026-08-18)
- 브리프: VERIFY2-BRIEF.md, 배치 G01~G14(8장씩, 112장).
- 적용 완료(커밋됨): G01, G02, G04, G05.
- 미완료(세션 사용 한도로 에이전트 중단, 21:20 KST 이후 재개): G03(신한 3·KB 5), G06(KB 1·삼성 7), G07(삼성 7·현대 1), G08(현대), G09(현대 5·롯데 3), G10~G14(롯데·우리·하나·NH·BC·인터넷은행) 미시작.
- 재개 방법: 각 배치에 대해 "VERIFY2-BRIEF.md 읽고 batch-GXX.json 검증 → corrections-GXX.json" 에이전트 실행 → `node docs/data-collection/apply-corrections.mjs <file>` → `npx vitest run` 통과 시 커밋·push. corrections-GXX.json이 이미 있으면 파싱 확인 후 적용.
