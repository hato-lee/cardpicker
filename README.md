# 카드픽

성향·관심 혜택·월 사용액·연회비 허용치를 넣으면 정답에 가까운 카드 TOP 5를 골라주는 사이트.
서버 없음 — 카드 데이터는 `src/data/cards.json`, 추천 규칙 숫자는 `src/engine/rules.ts`.

## 개발
- `npm install`
- `npm run dev` — 로컬 실행
- `npm test` — 테스트 (cards.json 형식 검증 포함)
- `npm run build` — 배포용 빌드

## 데이터 갱신
1. `src/data/cards.json` 수정 (★·복잡도 기준은 `src/engine/rules.ts`의 STAR_GUIDE)
2. `npm test`로 형식 확인
3. 커밋 → push → Vercel 자동 배포

설계: `docs/superpowers/specs/2026-08-16-cardpick-design.md`
