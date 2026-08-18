# 공식 상세 페이지 주소 찾기 (2026-08-19)

`targets.json`의 카드 15장은 officialUrl이 카드사 홈 첫 화면이다. 각 카드의 **카드사 공식 도메인 상세 페이지 주소**를 찾아라. 서브에이전트 만들지 말고 직접.

## 방법 (카드당 WebSearch 3회 안)
- WebSearch "<카드명> site:hyundaicard.com" 식으로 공식 도메인 한정 검색 → 후보 URL을 WebFetch로 열어 카드명이 나오는지 확인. 현대카드는 `https://www.hyundaicard.com/cpc/cr/CPCCR0201_01.hc?cardWcd=XXX` 형태, NH는 `https://card.nonghyup.com/index_cardProd.html?cd_wrs_sqno=NNNNNNNN`, 하나는 `https://www.hanacard.co.kr/OPI41000000D.web?CD_PD_SEQ=NNNNN` 또는 m.hanacard.co.kr, 우리는 `https://pc.wooricard.com/dcpc/yh1/crd/crd01/H1CRD101S01.do?cdPrdCd=NNNNNN`, KB는 `https://m.kbcard.com/CRD/DVIEW/MCAMCXHIACRC0002?mainCC=b&allianceCode=NNNNN`. 정확한 형태는 사이트마다 다르니 실제로 열리는 주소를 우선.
- 공식 페이지가 JS라 WebFetch로 내용이 안 보이면, 카드고릴라/뱅크샐러드 상세에 적힌 "공식 페이지/신청하기" 링크의 도메인·파라미터를 근거로 써도 된다. 그래도 못 찾으면 memoAppend에 사유만.
- 절대 뱅크샐러드·카드고릴라·토스 주소를 officialUrl로 쓰지 마라. https만.

## 출력: `corrections.json` 패치 배열 (15장 전부, 1장 = 1패치)
```json
[
  { "id": "hyundai-m", "set": { "officialUrl": "https://www.hyundaicard.com/cpc/cr/CPCCR0201_01.hc?cardWcd=MMX" }, "memoAppend": "URL 정정(2026-08-19): 공식 상세 페이지로 교체" },
  { "id": "xxx", "memoAppend": "URL 정정(2026-08-19): 상세 주소 못 찾음 — 사유" }
]
```
