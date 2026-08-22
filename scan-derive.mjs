import fs from 'fs';
const cards = JSON.parse(fs.readFileSync('/Users/hato/Projects/cardpicker/src/data/cards.json','utf8'));
const wonToNum=(str)=>{let s=String(str).replace(/,/g,'').replace(/원/g,'').trim();
 let m=s.match(/^(\d+(?:\.\d+)?)만\s*(\d+)?천?$/); if(m) return parseFloat(m[1])*10000+(m[2]?Number(m[2])*1000:0);
 m=s.match(/^(\d+(?:\.\d+)?)만$/); if(m) return parseFloat(m[1])*10000;
 m=s.match(/^(\d+(?:\.\d+)?)천$/); if(m) return parseFloat(m[1])*1000;
 m=s.match(/^(\d+)$/); if(m) return Number(m[1]); return null;};

const out=[];
// A. 카드사 공식 계산 예시 / 환산 근거가 적힌 문장
const EXAMPLE_RE = /[^.。]*(?:예:|예\)|예시|환산|객단가|평균\s*(?:결제|객단|이용)|기준값|1,850|1,550|4,800|건당\s*[\d,]+\s*원\s*(?:할인|적립|캐시백))[^.]*\./g;
// B. 정액 ÷ 요율 병기: "건당 N원(=X%)" 또는 "건당 N원 할인" + rate
const FLAT_RE = /(?:건당|회당|1회당|건별|건마다)\s*(?:최대\s*)?([\d,]+(?:\s*만\s*\d*천?|\s*천)?)\s*원\s*(?:씩\s*)?(?:정액\s*)?(?:할인|적립|캐시백|청구할인|환급)/g;
// C. 조건 3종 조합 (건당 최소 + 월 N회 + 월 한도)
for(const c of cards){
  const texts=[['memo',c.memo||'']];
  for(const b of (c.benefits||[])) texts.push(['note:'+b.tag,b.note||'',b]);
  for(const [where,t,b] of texts){
    if(!t) continue;
    let m;
    EXAMPLE_RE.lastIndex=0;
    while((m=EXAMPLE_RE.exec(t))){
      const sent=m[0].trim();
      if(/1,850|1,550|4,800|객단가|평균\s*결제|평균\s*객단|건당\s*[\d,]+\s*원\s*(할인|적립|캐시백)|예:|예시/.test(sent))
        out.push({kind:'EXAMPLE',cardId:c.id,status:c.status,where,tag:b?.tag,rate:b?.rate,cap:b?.monthlyCap,text:sent.slice(0,420)});
    }
    FLAT_RE.lastIndex=0;
    while((m=FLAT_RE.exec(t))){
      const flat=wonToNum(m[1]);
      if(!flat) continue;
      const ctx=t.slice(Math.max(0,m.index-140), m.index+180);
      out.push({kind:'FLAT',cardId:c.id,status:c.status,where,tag:b?.tag,rate:b?.rate,cap:b?.monthlyCap,flat,
        implied: b?.rate? Math.round(flat/(b.rate/100)) : null, ctx});
    }
  }
}
fs.writeFileSync('/private/tmp/claude-501/-Users-hato/5ea76652-43aa-4bdc-8425-74be9e194400/scratchpad/derive.json',JSON.stringify(out,null,1));
console.log('EXAMPLE hits:', out.filter(o=>o.kind==='EXAMPLE').length, ' FLAT hits:', out.filter(o=>o.kind==='FLAT').length);

// C: 건당최소 + 월횟수 + 월한도 조합 → 카드사 상정 객단가 역산
console.log('\n=== C. 건당최소 × 월횟수 × 월한도 조합 (카드사가 설계한 건당 금액대) ===');
const comb=[];
for(const c of cards){
  for(const b of (c.benefits||[])){
    const t=b.note||''; if(!t) continue;
    let min=null;
    let mm=t.match(/(?:건당|건별|1회|회당)\s*([\d,]+(?:\s*만\s*\d*천?|\s*천)?)\s*원?\s*이상/); if(mm) min=wonToNum(mm[1]);
    if(!min){ const neg=t.match(/건당\s*([\d,]+(?:\s*만|\s*천)?)\s*원?\s*미만/); if(neg) min=wonToNum(neg[1]); }
    if(!min) continue;
    let uses=null; const um=t.match(/월\s*(\d+)\s*회/); if(um) uses=Number(um[1]);
    let perUse=null; const pm=t.match(/(?:건당|회당|1회당|건별)\s*(?:최대\s*)?(?:할인|적립|캐시백)?\s*(?:한도\s*)?([\d,]+(?:\s*만\s*\d*천?|\s*천)?)\s*원(?!\s*이상)/); if(pm) perUse=wonToNum(pm[1]);
    const cap=b.monthlyCap, rate=b.rate;
    // 역산1: perUse / rate = 상정 객단가
    const d1 = (perUse&&rate)? Math.round(perUse/(rate/100)) : null;
    // 역산2: (cap/uses) / rate = 상정 객단가
    const d2 = (cap&&uses&&rate)? Math.round((cap/uses)/(rate/100)) : null;
    if(d1||d2) comb.push({cardId:c.id,status:c.status,tag:b.tag,rate,cap,min,uses,perUse,d1,d2,note:t.slice(0,200)});
  }
}
comb.sort((a,b)=>a.tag.localeCompare(b.tag));
for(const x of comb) console.log(`[${x.status}] ${x.cardId} | ${x.tag} rate=${x.rate}% cap=${x.cap} min=${x.min} uses=${x.uses} perUse=${x.perUse} → 역산 perUse/rate=${x.d1} (cap/uses)/rate=${x.d2}\n    "${x.note}"`);
