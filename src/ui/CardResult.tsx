import { useState } from 'react'
import type { Scored } from '../engine/recommend'
import type { Persona, Benefit, BenefitType } from '../data/types'
import { isStale } from '../engine/explain'
import { won, rateText } from './format'

interface Props {
  rank: number
  scored: Scored
  persona: Persona
  pickedCount: number
  today: Date
}

/** 월 한도 표기. 마일리지 한도는 '원'이 아니라 '마일' 단위다. */
function capText(type: BenefitType, cap: number | null): string {
  if (cap === null) return '한도 없음'
  if (type === 'mileage') return `월 최대 ${cap.toLocaleString('ko-KR')}마일`
  return `월 최대 ${won(cap)}`
}

function benefitText(b: Benefit): string {
  return `${b.tag} ${rateText(b.type, b.rate)} · ${capText(b.type, b.monthlyCap)}${b.note ? ` (${b.note})` : ''}`
}

export function CardResult({ rank, scored, persona: _persona, pickedCount: _pickedCount, today }: Props) {
  const [open, setOpen] = useState(false)
  const { card } = scored
  const stale = isStale(card.lastChecked, today)

  return (
    <article className="card">
      <header className="card-head">
        <span className="rank">{rank}</span>
        <div>
          <h3>{card.name}</h3>
          <div className="card-sub">{card.issuer} · {card.kind === 'credit' ? '신용' : '체크'} · 연회비 {won(card.annualFee)} · {card.minSpend === 0 ? '실적 없음' : `전월실적 ${won(card.minSpend)}`}</div>
        </div>
      </header>

      <button type="button" className="link-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        혜택 요약 {open ? '접기 ▲' : '펼치기 ▼'}
      </button>
      {open && (
        <ul className="benefits">
          {card.benefits.map((b) => <li key={b.tag}>{benefitText(b)}</li>)}
          {card.memo && <li className="memo">메모: {card.memo}</li>}
        </ul>
      )}

      <footer className="card-foot">
        <a href={card.officialUrl} target="_blank" rel="noopener noreferrer">카드사 페이지 →</a>
        <span className="checked">
          마지막 확인 {card.lastChecked}
          {stale && <span className="badge">확인 필요</span>}
        </span>
      </footer>
    </article>
  )
}
