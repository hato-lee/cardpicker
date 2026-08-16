# 카드 데이터 수집 도구

- `BRIEF.md` — AI 수집가에게 주는 지침(형식·태그·★ 기준). 수집 에이전트는 이 파일과 `existing-ids.txt`를 먼저 읽는다.
- `incoming/*.json` — 수집 결과(JSON 배열)를 여기 저장.
- `node docs/data-collection/merge.mjs a.json b.json` — incoming의 파일들을 `src/data/cards.json`에 합침(id 중복 건너뜀). 실행 후 `npm test`로 형식 검증.
- `node docs/data-collection/apply-corrections.mjs incoming/corrections.json` — 검증 에이전트가 만든 패치(id별 set/benefits/memoAppend)를 적용.
- `existing-ids.txt` 갱신: `node -e 'const c=require("./src/data/cards.json"); console.log(c.map(x=>x.id+" ("+x.name+")").join("\n"))' > docs/data-collection/existing-ids.txt`

흐름: 수집(에이전트 5~6명, 카드사/태그별 8~10장) → merge → npm test → 상위 카드 검증 에이전트 → apply-corrections → 검수 시트 → 커밋·push(자동 배포).
