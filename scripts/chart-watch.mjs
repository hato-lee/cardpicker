// 카드고릴라 차트 감시: 종합 TOP100 + 인기혜택 차트를 훑어
// ① DB에 없는 인기 카드 감지, ② 차트에 있는 보유 카드의 공식 페이지 1:1 매칭 검수.
// 사용: node scripts/chart-watch.mjs  → 결과 JSON을 stdout으로.
import fs from 'node:fs'

const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36' }
const API = 'https://api.card-gorilla.com/v1'
// 인기혜택 차트 idx (2026-08-20 화면 대조로 확정. 해외결제는 미확정이라 근사값 265=해외이용)
const BENEFIT_CHARTS = { 'K-패스': 216, '공과금': 229, '온라인쇼핑': 225, '주유·충전': 221, '모든가맹점': 200, '마일리지': 213, '간편결제': 258, '디지털구독': 205, '교육비': 209, '해외이용(≈해외결제)': 265 }

const get = async (url) => {
  const res = await fetch(url, { headers: UA, redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.json()
}
const today = new Date().toISOString().slice(0, 10)

// ---- 이름 매칭 (카드사 표기 차이 흡수) ----
const ISSUERS = /kb국민|kb|국민|신한|삼성|현대|nh농협|nh|농협|하나|우리|롯데|ibk기업은행|ibk|bc바로|bc|바로|케이뱅크|카카오뱅크|토스뱅크|씨티|전북|광주|경남|im뱅크|새마을|신협|티머니|아메리칸엑스프레스|americanexpress|®|™|&/g
const norm = (s) => s.replace(/[\s()\[\]·.\-+#&®™]/g, '').replace(/카드/g, '').toLowerCase().replace(ISSUERS, '')
const cards = JSON.parse(fs.readFileSync(new URL('../src/data/cards.json', import.meta.url), 'utf8'))
const ours = cards.map((c) => ({ id: c.id, name: c.name, n: norm(c.name), officialUrl: c.officialUrl, status: c.status, memo: c.memo || '' }))
const findOurs = (gname) => {
  const gn = norm(gname)
  return ours.find((o) => o.n && gn && (o.n === gn || (gn.length >= 3 && o.n.includes(gn)) || (o.n.length >= 3 && gn.includes(o.n))))
}
// 알려진 가짜 경보: 표기 차이로 매칭이 안 되지만 이미 보유했거나, 의도적으로 제외한 카드
const KNOWN_ALIASES = [
  '신한카드 처음(ANNIVERSE)', // = shinhan-cheoeum 디자인 변형
  'American Express® Gold Card Edition2', // = hyundai-amex-gold
  'American Express® Green Card Edition2', // = hyundai-amex-green
  'American Express The Platinum Card®Edition2', // = hyundai-amex-platinum
  'BC 바로 Air Max 카드', // = bc-baro-air-max
  'TWO CHAIRS', // 우리은행 자산가 전용이라 제외 결정(2026-08-20)
]
const EXCLUDE_PATTERNS = [/MY BUSINESS/i, /SOHO/i] // 개인사업자 전용은 대상 아님

// ---- 1) 차트 수집 ----
const seen = new Map() // gname -> { idx, charts: [] }
const add = (rows, chart) => {
  for (const r of rows) {
    const e = seen.get(r.name) || { idx: r.idx, charts: [] }
    e.charts.push(`${chart} ${r.ranking}위`)
    seen.set(r.name, e)
  }
}
add(await get(`${API}/charts/ranking?term=monthly`), '종합(월간)')
for (const [name, idx] of Object.entries(BENEFIT_CHARTS)) {
  try {
    add(await get(`${API}/charts/ranking?term=weekly&chart=benefit&idx=${idx}&idx2=&card_gb=CRD&limit=10&date=${today}`), name)
  } catch (e) { console.error(`차트 실패: ${name} — ${e.message}`) }
}

// ---- 2) 새 카드 감지 ----
const newCards = []
const matched = new Map() // our id -> { our, gnames, charts }
for (const [gname, info] of seen) {
  const hit = findOurs(gname)
  if (!hit) {
    if (!KNOWN_ALIASES.includes(gname) && !EXCLUDE_PATTERNS.some((re) => re.test(gname))) newCards.push({ name: gname, gorillaIdx: info.idx, charts: info.charts })
  } else {
    const m = matched.get(hit.id) || { our: hit, gnames: [], charts: [] }
    m.gnames.push(gname); m.charts.push(...info.charts)
    matched.set(hit.id, m)
  }
}

// ---- 3) 보유 카드 공식 페이지 1:1 검수 ----
// 카드 이름의 특징 토큰이 페이지 본문(또는 NH servlet 렌더링)에 있는지 확인
const token = (name) => {
  const t = name.replace(/[()\[\]]/g, ' ').split(/\s+/).filter((w) => w.length >= 2 && !/카드|신용|체크|Edition2?/i.test(w))
  return t.sort((a, b) => b.length - a.length)[0] || name
}
const fetchText = async (url) => {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(url, { headers: UA, redirect: 'follow', signal: ctrl.signal })
    const orig = new URL(url)
    const final = new URL(res.url)
    const isRoot = (u) => (u.pathname === '/' || u.pathname === '') && !u.search
    const body = await res.text()
    // 전용 마이크로사이트(원래 주소가 루트)는 루트 착지가 정상
    return { status: res.status, atHome: isRoot(final) && !isRoot(orig), body }
  } finally { clearTimeout(t) }
}
const linkIssues = []
const linkUnverified = [] // JS 렌더링이라 이름 확인이 안 된 것 — 문제 아님, 참고용
const linkChecked = []
for (const { our, charts } of matched.values()) {
  if (our.status !== 'active') continue
  let verdict = 'ok', detail = ''
  try {
    // NH는 index_cardProd 진입 URL이 JS라 servlet 렌더링으로 대신 검수
    let checkUrl = our.officialUrl
    const nh = our.officialUrl.match(/cd_wrs_sqno=(\d+)/)
    if (nh) checkUrl = `https://card.nonghyup.com/servlet/IpCc2021R.act?CD_WRS_SQNO=${nh[1]}`
    const r = await fetchText(checkUrl)
    if (r.status >= 400) { verdict = 'error'; detail = `HTTP ${r.status}` }
    else if (r.atHome) { verdict = 'home'; detail = '홈으로 리다이렉트' }
    else {
      const tok = token(our.name)
      if (!r.body.includes(tok) && !r.body.includes(our.name)) { verdict = 'unverified'; detail = `페이지 원문에 '${tok}' 없음 — JS 렌더링 페이지일 가능성` }
    }
  } catch (e) { verdict = 'error'; detail = e.name === 'AbortError' ? '타임아웃' : e.message.slice(0, 80) }
  // 현대카드는 봇 차단으로 fetch가 실패하는 것이 정상 — 오탐 방지
  if (verdict === 'error' && /hyundaicard\.com/.test(our.officialUrl)) { verdict = 'skip'; detail = '현대카드는 스크립트 접근 차단(브라우저 정상)' }
  linkChecked.push(our.id)
  const row = { id: our.id, name: our.name, url: our.officialUrl, verdict, detail, charts: [...new Set(charts)].slice(0, 3) }
  if (verdict === 'unverified') linkUnverified.push(row)
  else if (verdict !== 'ok' && verdict !== 'skip') linkIssues.push(row)
}

const report = {
  date: today,
  chartCards: seen.size,
  matchedInDb: matched.size,
  newCards,
  linkChecked: linkChecked.length,
  linkIssues,
  linkUnverified,
}
console.log(JSON.stringify(report, null, 1))
