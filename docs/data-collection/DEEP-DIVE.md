# 카드 해부 절차 (Deep-Dive Playbook)

하토님이 "○○카드 뜯어봐" / "해부해줘"라고 하면 이 절차를 돌린다. 목표: **카드 한 장의 혜택 구조를 공식 근거로 완전히 해체하고, 저장값과의 차이를 찾아 정정**하는 것. 인코딩 판단은 전부 [ENCODING-RULES.md](./ENCODING-RULES.md)를 따른다.

## 절차 (5단계)

### 1. 현재 저장값 확인 (메인 세션)
cards.json에서 해당 카드의 benefits·universal·tiers·capGroup·memo·perks·status를 dump. 지금 뭘 어떻게 계산하고 있는지 파악.

### 2. 출처 수집 (에이전트)
- **카드고릴라 API**: `curl -sL 'https://api.card-gorilla.com/v1/cards/{idx}' -H 'User-Agent: Mozilla/5.0'` — pr_detail·key_benefit에 카드사 상품안내 원문, is_discon, annual_fee_basic, request_pc(공식 링크). idx는 WebSearch "card-gorilla 카드명"으로 상세 URL 숫자.
- **카드사 공식** (접근성 표):

| 카드사 | 접근법 |
|---|---|
| 신한 | 공식 상세 WebFetch 잘 됨 (연회비는 템플릿 변수라 미노출 잦음 → 보도·고릴라 보조) |
| 삼성 | 페이지 접힘/JS → 고릴라 원문 우선, code=AAPxxxx 페이지로 연회비는 확인 가능 |
| 현대 | 스크립트 접근 차단 → 고릴라 원문 |
| KB | m.kbcard.com 읽힘 + **상품설명서 PDF**(img2.kbcard.com/obj/card/download/…) 최상급, kbthink.com 보조 |
| 하나·NH·우리·IBK | JS 렌더링 → 고릴라 원문 우선. NH는 `card.nonghyup.com/servlet/IpCc2021R.act?CD_WRS_SQNO=` 우회 |
| BC | m.bccard.com 읽힘 |
| 아멕스 네트워크 페이지 | **구버전 정보 노출 사례 있음** — Edition 교차 확인 필수 |

- 출시 보도자료(연회비·핵심 혜택 교차), 상품설명서 PDF가 있으면 최우선.

### 3. 구조 해체 체크리스트 (에이전트)
원문을 읽으며 아래를 전부 답한다:

- [ ] 기본 적립/할인: 요율, 실적 조건, 한도, 제외 업종(공과금·상품권·임대매장 등)
- [ ] 추가·우대 적립: 영역별 요율(**추가분으로 환산**), 조건(실적/요일/시간/결제수단)
- [ ] **한도의 기준: 총액인가 추가분인가 — 공식 예시 계산으로 검산** (삼성·IBK=총액 관행)
- [ ] 한도 구조: 월/연/일/건당, 영역별 개별인가 통합인가 (통합이면 capGroup 후보)
- [ ] 택1·선택형: 무엇과 무엇이 배타인가, 언제 바꿀 수 있나
- [ ] 실적 구간(tiers): 구간별 요율·한도, 최저 구간이 기본값인가
- [ ] 발급 조건(issueNote 후보): 멤버십·전용 통장·초대제·발급 채널·일시 중단
- [ ] 단종·리뉴얼 신호: is_discon, Edition 세대, 이름-혜택-연회비가 같은 세대인가
- [ ] 태그 밖 혜택: memo 한 줄로 (백화점·영화·골프 등)
- [ ] 포인트라면: 무슨 포인트, 현금성(pointsEase), 전환처

### 4. findings JSON (에이전트 → 파일)
`docs/data-collection/deep-dive/<card-id>-<날짜>.json`. **cards.json 직접 수정 금지.**
```json
{ "cardId": "...", "confidence": "high|medium|low",
  "diffs": [{ "where": "benefits.주유", "current": "...", "proposal": {...}, "evidence": "출처·원문 요지", "warning": "..." }],
  "structureTree": "혜택 구조를 사람이 읽는 트리 텍스트로",
  "verified": ["현재값과 일치 확인된 항목들"],
  "outOfTag": "...", "issueNoteProposal": "...", "unresolved": ["끝내 미확인"] }
```

### 5. 판단·적용 (메인 세션)
diffs를 하나씩 타당성 검토(보수 원칙) → 스크립트로 적용 → `npm run build` exit 0 확인 → 커밋·push·배포 해시 확인 → memo에 이력 → 필요시 메모리 갱신 → 하토님께 정정 내역 보고.

## 에이전트 프롬프트 템플릿

> 카드피커(/Users/hato/Projects/cardpicker) 카드 해부 태스크. 대상: **<카드명> (<card-id>)**.
> ① docs/data-collection/ENCODING-RULES.md와 DEEP-DIVE.md 3단계 체크리스트를 먼저 읽어라.
> ② src/data/cards.json에서 이 카드의 현재값을 읽어라.
> ③ DEEP-DIVE 2단계 출처(고릴라 API 원문 우선, 카드사별 접근법 표 참고)로 혜택 구조를 체크리스트 순서대로 전부 해체하라. 한도의 총액/추가분 기준은 공식 예시로 검산하라.
> ④ 규약대로 인코딩했을 때 현재 저장값과 다른 곳만 diffs로 정리해 docs/data-collection/deep-dive/<card-id>-<YYYY-MM-DD>.json에 저장하라. cards.json은 절대 수정하지 마라. 수치를 지어내지 말고 애매하면 보수값+warning.
> ⑤ 최종 텍스트로는 구조 트리 요약과 diff 개수만 반환하라.

## 실전 사례 (참고용 결과물 수준)

- 미플 합계 2마일 확정 + 총액 한도 판별: `mileage-extra-2026-08-21/findings.json`
- 마트 태그 재수집: `mart-2026-08-21/findings-A.json`
- 검증 라운드: `verify-2026-08-21/findings-V1~V3.json`
