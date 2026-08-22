import fs from 'fs';
const cards = JSON.parse(fs.readFileSync('/Users/hato/Projects/cardpicker/src/data/cards.json','utf8'));
const w=(s)=>{s=String(s).replace(/,/g,'').replace(/원/g,'').trim();
 let m=s.match(/^(\d+(?:\.\d+)?)만\s*(\d+)?천?$/); if(m) return parseFloat(m[1])*10000+(m[2]?Number(m[2])*1000:0);
 m=s.match(/^(\d+(?:\.\d+)?)만$/); if(m) return parseFloat(m[1])*10000;
 m=s.match(/^(\d+(?:\.\d+)?)천$/); if(m) return parseFloat(m[1])*1000;
 m=s.match(/^(\d+)$/); if(m) return Number(m[1]); return null;};
const MIN=[/(?:건당|건별|1회|회당|건마다)\s*([\d,]+(?:\s*만\s*\d*천?|\s*천)?)\s*원?\s*이상/g,
 /([\d,]+(?:\s*만\s*\d*천?|\s*천)?)\s*원\s*이상\s*(?:단일\s*)?(?:결제|납부|이용)\s*건/g,
 /단일\s*결제\s*([\d,]+(?:\s*만\s*\d*천?|\s*천)?)\s*원?\s*이상/g];
const TAGS=['마일리지','모든 가맹점','주유','카페','편의점','마트·장보기','온라인 쇼핑','배달앱','외식','대중교통','택시','통신비','OTT·구독','병의원·약국','해외 결제','학원·교육','관리비·공과금'];
const agg={}; for(const t of TAGS) agg[t]={min:[],uses:0,perUse:0,rows:0};
let totalRows=0, activeCards=new Set();
for(const c of cards){
  for(const b of (c.benefits||[])){
    const t=b.note||''; if(!t) continue; totalRows++;
    const A=agg[b.tag]; if(!A) continue;
    const mins=new Set();
    for(const p of MIN){p.lastIndex=0;let m;while((m=p.exec(t))){const v=w(m[1]);if(v&&v>=1000&&v<=1000000)mins.add(v);}}
    const neg=t.match(/건당\s*([\d,]+(?:\s*만|\s*천)?)\s*원?\s*미만[^.]{0,25}(제외|미적립|불가|절사)/); if(neg){const v=w(neg[1]);if(v>=1000)mins.add(v);}
    if(mins.size && c.status==='active'){ A.rows++; A.min.push(Math.min(...mins)); activeCards.add(c.id);
      if(/월\s*\d+\s*회|일\s*\d+\s*회/.test(t)) A.uses++;
      if(/(건당|회당|1회|건별)[^.]{0,20}(할인한도|최대|결제분까지|이용분까지|승인금액)/.test(t)) A.perUse++; }
  }
}
console.log('=== active 카드 한정: 태그별 「건당 N원 이상」 조건 행 집계 ===');
for(const [t,A] of Object.entries(agg).sort((a,b)=>b[1].rows-a[1].rows)){
  if(!A.rows){console.log(`${t}: 0행 — 기준값 불필요`);continue;}
  const s=A.min.slice().sort((a,b)=>a-b); const cnt={}; s.forEach(x=>cnt[x]=(cnt[x]||0)+1);
  const mode=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
  console.log(`${t}: ${A.rows}행 | 최빈 ${Number(mode[0]).toLocaleString()}원(${mode[1]}행) 중앙 ${s[Math.floor(s.length/2)].toLocaleString()}원 범위 ${s[0].toLocaleString()}~${s[s.length-1].toLocaleString()} | 그중 횟수조건 동반 ${A.uses}행·회당한도 동반 ${A.perUse}행 | 분포 ${Object.entries(cnt).sort((a,b)=>a[0]-b[0]).map(([k,n])=>Number(k).toLocaleString()+'×'+n).join(' ')}`);
}
console.log('\n영향 카드 수(active):', activeCards.size, '/ 전체 note 보유 행:', totalRows);
