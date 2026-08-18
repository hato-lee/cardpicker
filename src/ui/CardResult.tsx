import { useState } from 'react'
import type { Scored } from '../engine/recommend'
import type { Persona, Benefit, BenefitType } from '../data/types'
import { tips, rowAnnualValue, isStale, PERSONA_LABEL } from '../engine/explain'
import { RULES } from '../engine/rules'
import { won, rateText } from './format'

interface Props {
  rank: number
  scored: Scored
  persona: Persona
  today: Date
}

/** 한도 값 표기 (접두어 없이). 마일리지 한도는 '원'이 아니라 '마일' 단위다. */
function capValueText(type: BenefitType, cap: number | null): string {
  if (cap === null) return '한도 없음'
  if (type === 'mileage') return `${cap.toLocaleString('ko-KR')}마일`
  return won(cap)
}

/** 월 한도 표기. 마일리지 한도는 '원'이 아니라 '마일' 단위다. */
function capText(type: BenefitType, cap: number | null): string {
  if (cap === null) return '한도 없음'
  return `월 최대 ${capValueText(type, cap)}`
}

/** 실적 구간 표기: "(실적 70만 원↑ 3만 원, 100만 원↑ 12% 할인·5만 원)". rate가 기본과 같으면 요율 생략 */
function tiersText(b: Benefit): string {
  if (!b.tiers || b.tiers.length === 0) return ''
  const parts = b.tiers.map((t, i) => {
    const cap = capValueText(b.type, t.monthlyCap)
    const rate = t.rate !== undefined && t.rate !== b.rate ? `${rateText(b.type, t.rate)}·` : ''
    return `${i === 0 ? '실적 ' : ''}${won(t.minSpend)}↑ ${rate}${cap}`
  })
  return ` (${parts.join(', ')})`
}

function benefitText(b: Benefit): string {
  return `${b.tag} ${rateText(b.type, b.rate)} · ${capText(b.type, b.monthlyCap)}${tiersText(b)}${b.note ? ` (${b.note})` : ''}`
}

export function CardResult({ rank, scored, persona, today }: Props) {
  const [open, setOpen] = useState(false)
  const { card, benefit } = scored
  const stale = isStale(card.lastChecked, today)
  const net = benefit.annualNet
  const pct = Math.round(RULES.personaRealization[persona] * 100)

  // 내역 줄: 연 금액 큰 순, 최대 N개 + "외 N개"
  const rows = benefit.rows
    .map((r) => ({ tag: r.tag, annual: rowAnnualValue(r, persona) }))
    .sort((a, b) => b.annual - a.annual)
  const shown = rows.slice(0, RULES.breakdownMaxRows)
  const rest = rows.length - shown.length
  const maxAnnual = Math.max(1, ...shown.map((r) => r.annual))

  const tipLines = tips(benefit, persona)

  return (
    <article className={`card ${rank === 1 ? 'is-top' : ''}`}>
      <header className="card-head">
        <span className="rank" aria-label={`${rank}위`}>{rank}</span>
        <div className="card-title">
          <h3>{card.name}{rank === 1 && <span className="top-badge">추천</span>}</h3>
          <div className="card-sub">{card.issuer} · {card.kind === 'credit' ? '신용' : '체크'} · 연회비 {won(card.annualFee)} · {card.minSpend === 0 ? '실적 없음' : `전월실적 ${won(card.minSpend)}`}</div>
        </div>
      </header>

      <div className="annual">
        <div className="annual-label">연 최대</div>
        {net > 0 ? (
          <div className="annual-value">약 {won(net)}</div>
        ) : net === 0 ? (
          <div className="annual-negative">연회비가 혜택보다 커요</div>
        ) : (
          <div className="annual-negative">연회비가 혜택보다 커요 (−{won(-net)})</div>
        )}
        <div className="annual-sub">연회비 {won(card.annualFee)} 뺀 금액 · {PERSONA_LABEL[persona]} 기준(한도의 {pct}%)</div>
      </div>

      <ul className="breakdown">
        {shown.map((r) => (
          <li key={r.tag}>
            <span className="bd-tag">{r.tag}</span>
            <span className="bd-bar" aria-hidden="true"><span style={{ width: `${Math.round((r.annual / maxAnnual) * 100)}%` }} /></span>
            <span className="bd-value">{won(r.annual)}</span>
          </li>
        ))}
        {rest > 0 && <li className="bd-rest">외 {rest}개</li>}
      </ul>

      <button type="button" className="link-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? '접기 ▲' : '자세히 보기 ▼'}
      </button>
      {open && (
        <div className="detail">
          <div className="detail-title">이렇게 쓰면 최대</div>
          <ul className="tips">
            {tipLines.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <div className="detail-title">전체 혜택</div>
          <ul className="benefits">
            {card.benefits.map((b) => <li key={b.tag}>{benefitText(b)}</li>)}
          </ul>
        </div>
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
