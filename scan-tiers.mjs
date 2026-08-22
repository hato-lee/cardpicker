import fs from 'fs';
const cards = JSON.parse(fs.readFileSync('/Users/hato/Projects/cardpicker/src/data/cards.json','utf8'));
const w=(s)=>{s=String(s).replace(/,/g,'').replace(/원/g,'').trim();
 let m=s.match(/^(\d+(?:\.\d+)?)만\s*(\d+)?천?$/); if(m) return parseFloat(m[1])*10000+(m[2]?Number(m[2])*1000:0);
 m=s.match(/^(\d+(?:\.\d+)?)만$/); if(m) return parseFloat(m[1])*10000;
 m=s.match(/^(\d+(?:\.\d+)?)천$/); if(m) return parseFloat(m[1])*1000;
 m=s.match(/^(\d+)$/); if(m) return Number(m[1]); return null;};

console.log('===== A. 건당 금액대별 차등 요율(카드사가 그은 구간 경계) =====');
for(const c of cards){
  for(const b of (c.benefits||[])){
    const t=b.note||''; if(!t) continue;
    if(/건당|건별|1회|회당/.test(t) && /(미만|이상)[^.]{0,40}(미만|이상)/.test(t) && /%|원/.test(t)){
      if(/(건당|건별|1회|회당)[^.]{0,80}(미만[^.]{0,30}(이상|%)|이상[^.]{0,30}(미만|%))/.test(t)){
        const seg=t.match(/[^.]*(?:건당|건별|1회|회당)[^.]*/g)||[];
        for(const s of seg) if(/미만|↑|이상/.test(s)&&/%|원/.test(s)) console.log(`[${c.status}] ${c.id} | ${b.tag} rate=${b.rate}\n   ${s.trim()}\n`);
      }
    }
  }
}
console.log('\n===== B. 회당(건당) 할인·적립 한도 → 한도÷요율 = 카드사 인정 건당 상한 =====');
const perUse=[];
for(const c of cards){
  for(const b of (c.benefits||[])){
    const t=b.note||''; if(!t) continue;
    const pats=[/(?:할인|적립|캐시백|환급)(?:액|금액)?\s*(?:은|는)?\s*(?:1회|건당|회당|1건)\s*(?:최대\s*)?([\d,]+(?:\s*만\s*\d*천?|\s*천)?)\s*원/g,
                /(?:1회|건당|회당|1건|건별)\s*(?:최대\s*)?(?:할인|적립|캐시백)\s*(?:한도\s*)?([\d,]+(?:\s*만\s*\d*천?|\s*천)?)\s*원/g,
                /(?:1회|건당|회당)\s*(?:승인금액|이용금액|주유금액|결제금액)\s*([\d,]+(?:\s*만\s*\d*천?|\s*천)?)\s*원\s*까지/g,
                /이용금액\s*([\d,]+(?:\s*만\s*\d*천?|\s*천)?)\s*원까지/g];
    for(const p of pats){ p.lastIndex=0; let m;
      while((m=p.exec(t))){ const v=w(m[1]); if(!v) continue;
        const isSpendCap = /승인금액|이용금액|주유금액|결제금액/.test(m[0]);
        perUse.push({card:c.id,status:c.status,tag:b.tag,rate:b.rate,v,isSpendCap,frag:m[0].trim(),
          implied: isSpendCap? v : (b.rate? Math.round(v/(b.rate/100)):null)});
      }}
  }
}
const seen=new Set();
for(const x of perUse.sort((a,b)=>a.tag.localeCompare(b.tag))){
  const k=x.card+x.tag+x.v; if(seen.has(k))continue; seen.add(k);
  console.log(`[${x.status}] ${x.tag} | ${x.card} rate=${x.rate}% ${x.isSpendCap?'인정 건당 상한':'회당 한도'}=${x.v.toLocaleString()} → 카드사 인정 건당 결제 상한 ${x.implied?x.implied.toLocaleString():'?'}원  ("${x.frag}")`);
}
console.log('\n===== C. 태그별 인정 건당 상한 분포 =====');
const byTag={};
for(const x of perUse){ if(!x.implied) continue; (byTag[x.tag] ||= []).push(x.implied); }
for(const [t,v] of Object.entries(byTag).sort((a,b)=>b[1].length-a[1].length)){
  const s=v.slice().sort((a,b)=>a-b);
  console.log(`${t}: n=${s.length} min=${s[0].toLocaleString()} med=${s[Math.floor(s.length/2)].toLocaleString()} max=${s[s.length-1].toLocaleString()}  [${s.map(x=>x.toLocaleString()).join(', ')}]`);
}
