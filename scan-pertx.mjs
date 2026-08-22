import fs from 'fs';
const cards = JSON.parse(fs.readFileSync('/Users/hato/Projects/cardpicker/src/data/cards.json','utf8'));

const num = (s) => Number(String(s).replace(/,/g,''));
// 한국어 금액 파서: "1만원", "1만 5천원", "5,000원", "3천원", "10만원"
function wonToNum(str){
  // str like "1만", "1만5천", "5,000", "3천", "10만"
  let s = str.replace(/,/g,'').replace(/원/g,'').trim();
  let total = 0;
  const m1 = s.match(/^(\d+(?:\.\d+)?)만\s*(\d+)?천?$/);
  if(m1){ total = parseFloat(m1[1])*10000 + (m1[2]?Number(m1[2])*1000:0); return total; }
  const m2 = s.match(/^(\d+(?:\.\d+)?)만$/); if(m2) return parseFloat(m2[1])*10000;
  const m3 = s.match(/^(\d+(?:\.\d+)?)천$/); if(m3) return parseFloat(m3[1])*1000;
  const m4 = s.match(/^(\d+)$/); if(m4) return Number(m4[1]);
  return null;
}

// 건당 최소금액 패턴
const MIN_PATTERNS = [
  /건당\s*([\d,]+(?:\.\d+)?\s*만\s*\d*천?|[\d,]+\s*천|[\d,]+)\s*원?\s*이상/g,
  /건별\s*([\d,]+(?:\.\d+)?\s*만\s*\d*천?|[\d,]+\s*천|[\d,]+)\s*원?\s*이상/g,
  /1회\s*(?:결제\s*)?([\d,]+(?:\.\d+)?\s*만\s*\d*천?|[\d,]+\s*천|[\d,]+)\s*원?\s*이상/g,
  /회당\s*([\d,]+(?:\.\d+)?\s*만\s*\d*천?|[\d,]+\s*천|[\d,]+)\s*원?\s*이상/g,
  /([\d,]+(?:\.\d+)?\s*만\s*\d*천?|[\d,]+\s*천|[\d,]+)\s*원\s*이상\s*(?:단일\s*)?결제\s*건/g,
  /단일\s*결제\s*([\d,]+(?:\.\d+)?\s*만\s*\d*천?|[\d,]+\s*천|[\d,]+)\s*원?\s*이상/g,
  /건당\s*최소\s*([\d,]+(?:\.\d+)?\s*만\s*\d*천?|[\d,]+\s*천|[\d,]+)/g,
];
const MIN_NEG = /건당\s*([\d,]+(?:만|천)?)\s*원?\s*미만/;

const rows = [];   // {cardId, name, tag, rate, cap, note, mins:[], counts:[], perUse:[]}
const memoHits = [];

function scanText(t){
  const mins = new Set();
  for(const p of MIN_PATTERNS){
    p.lastIndex=0; let m;
    while((m=p.exec(t))){ const v = wonToNum(m[1]); if(v && v>=500 && v<=2000000) mins.add(v); }
  }
  // "건당 1만원 미만 ... 제외" → 사실상 건당 1만원 이상 조건
  const neg = t.match(/건당\s*([\d,]+(?:\s*만|\s*천)?)\s*원?\s*미만[^.]{0,20}(제외|미적립|불가|안)/);
  if(neg){ const v=wonToNum(neg[1]); if(v) mins.add(v); }
  // 월 횟수
  const counts=[]; let m;
  const cp=/월\s*(\d+)\s*회/g; while((m=cp.exec(t))) counts.push(Number(m[1]));
  const dp=/일\s*(\d+)\s*회/g; while((m=dp.exec(t))) counts.push('일'+m[1]);
  // 회당/건당 한도 (정액 할인/한도)
  const perUse=[];
  const up=/(?:건당|회당|1회당|건별)\s*(?:최대\s*)?(?:할인|적립|캐시백)?\s*(?:한도\s*)?([\d,]+(?:\s*만\s*\d*천?|\s*천)?)\s*원/g;
  while((m=up.exec(t))){ const v=wonToNum(m[1]); if(v) perUse.push(v); }
  return {mins:[...mins], counts, perUse};
}

for(const c of cards){
  for(const b of (c.benefits||[])){
    const t = b.note||'';
    const r = scanText(t);
    if(r.mins.length||r.counts.length||r.perUse.length){
      rows.push({cardId:c.id,name:c.name,status:c.status,tag:b.tag,type:b.type,rate:b.rate,cap:b.monthlyCap,note:t,...r});
    }
  }
  const mt=c.memo||'';
  const mr=scanText(mt);
  if(mr.mins.length) memoHits.push({cardId:c.id,status:c.status,mins:mr.mins,counts:mr.counts,perUse:mr.perUse});
}

fs.writeFileSync('/private/tmp/claude-501/-Users-hato/5ea76652-43aa-4bdc-8425-74be9e194400/scratchpad/rows.json', JSON.stringify({rows,memoHits},null,1));

// 태그별 집계 (minPerTx 조건이 걸린 행)
const byTag={};
for(const r of rows){
  if(!r.mins.length) continue;
  byTag[r.tag] ||= {rows:0, active:0, amounts:[]};
  byTag[r.tag].rows++;
  if(r.status==='active') byTag[r.tag].active++;
  byTag[r.tag].amounts.push(...r.mins);
}
console.log('=== 태그별 건당최소금액(minPerTx) 조건 행 수 / 조건금액 분포 ===');
const order = Object.entries(byTag).sort((a,b)=>b[1].rows-a[1].rows);
for(const [tag,v] of order){
  const cnt={}; v.amounts.forEach(a=>cnt[a]=(cnt[a]||0)+1);
  const dist=Object.entries(cnt).sort((a,b)=>Number(a[0])-Number(b[0])).map(([k,n])=>`${Number(k).toLocaleString()}원×${n}`).join(', ');
  const sorted=v.amounts.slice().sort((a,b)=>a-b);
  const med=sorted[Math.floor(sorted.length/2)];
  console.log(`${tag}: 행 ${v.rows} (active ${v.active}) | 중앙값 ${med.toLocaleString()} | ${dist}`);
}
const allTags=['마일리지','모든 가맹점','주유','카페','편의점','마트·장보기','온라인 쇼핑','배달앱','외식','대중교통','택시','통신비','OTT·구독','병의원·약국','해외 결제','학원·교육','관리비·공과금'];
console.log('\n조건 0건 태그:', allTags.filter(t=>!byTag[t]).join(', ')||'(없음)');
console.log('\n총 minPerTx 행:', rows.filter(r=>r.mins.length).length, '/ 스캔 히트 행 전체:', rows.length);
