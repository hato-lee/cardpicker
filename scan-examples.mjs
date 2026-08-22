import fs from 'fs';
const cards = JSON.parse(fs.readFileSync('/Users/hato/Projects/cardpicker/src/data/cards.json','utf8'));
// 카드사 공식 계산 예시: "N원 결제/이용/납부 시 M" 형태
const RE = /[^.]{0,120}([\d,]{3,})\s*원\s*(?:결제|이용|납부|사용|구매|주유|승인)(?:하면|\s*시|해야|할\s*때|하면)[^.]{0,160}/g;
const RE2 = /[^.]{0,120}(?:공식\s*예시|예시|예\s*:|예\))[^.]{0,220}/g;
const seen=new Set();
for(const c of cards){
  const parts=[['memo',c.memo||'']];
  for(const b of c.benefits||[]) parts.push(['note['+b.tag+' rate='+b.rate+' cap='+b.monthlyCap+']', b.note||'']);
  for(const [w,t] of parts){
    if(!t) continue;
    for(const re of [RE,RE2]){
      re.lastIndex=0; let m;
      while((m=re.exec(t))){
        const s=m[0].trim(); const key=c.id+'|'+w+'|'+s.slice(0,60);
        if(seen.has(key)) continue; seen.add(key);
        console.log(`[${c.status}] ${c.id} ${w}\n   ${s}\n`);
      }
    }
  }
}
