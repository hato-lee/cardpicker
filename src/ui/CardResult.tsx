import { useState } from 'react'
import { isPointsHeavy, type Scored } from '../engine/recommend'
import type { PointsEase } from '../data/types'
import type { Persona, Benefit, BenefitType } from '../data/types'
import { tips, rowAnnualValue, isStale } from '../engine/explain'
import { RULES } from '../engine/rules'
import { won, rateText, capValueText } from './format'
import { TAG_EMOJI } from './tagEmoji'

interface Props {
  rank: number
  scored: Scored
  persona: Persona
  today: Date
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

export function benefitText(b: Benefit): string {
  return `${b.tag} ${rateText(b.type, b.rate)} · ${capText(b.type, b.monthlyCap)}${tiersText(b)}${b.note ? ` (${b.note})` : ''}`
}

export const POINTS_BADGE: Record<PointsEase | 'unknown', string> = {
  cash: '포인트 적립 · 현금처럼 써요',
  shop: '포인트 적립 · 써야 혜택',
  limited: '포인트 적립 · 쓰는 곳 제한',
  unknown: '포인트 적립형',
}
export const POINTS_BADGE_TITLE = '할인 대신 포인트로 쌓여요. 자세히 보기에서 어떤 포인트인지 볼 수 있어요.'

export function CardResult({ rank, scored, persona, today }: Props) {
  const [open, setOpen] = useState(false)
  const { card, benefit } = scored
  const stale = isStale(card.lastChecked, today)
  const net = benefit.annualNet

  // 내역 줄: 연 금액 큰 순, 최대 N개 + "외 N개"
  const rows = benefit.rows
    .map((r) => ({ tag: r.tag, annual: rowAnnualValue(r) }))
    .sort((a, b) => b.annual - a.annual)
  const shown = rows.slice(0, RULES.breakdownMaxRows)
  const rest = rows.length - shown.length
  const maxAnnual = Math.max(1, ...shown.map((r) => r.annual))

  const tipLines = tips(benefit, persona)
  const pointsHeavy = isPointsHeavy(benefit)
  const pointsLine = card.pointsProgram
    ? `${card.pointsProgram}${card.pointsNote ? ` — ${card.pointsNote}` : ''}`
    : null

  return (
    <article className={`card ${rank === 1 ? 'is-top' : ''}`}>
      <header className="card-head">
        <span className="rank" aria-label={`${rank}위`}>{rank}</span>
        <div className="card-title">
          <h3>
            {card.name}
            {rank === 1 && <span className="top-badge">가장 많이 아껴요</span>}
            {pointsHeavy && <span className={`conv-badge ${card.pointsEase === 'cash' ? 'is-easy' : ''}`} title={POINTS_BADGE_TITLE}>{POINTS_BADGE[card.pointsEase ?? 'unknown']}</span>}
          </h3>
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
        <div className="annual-sub">연회비 {won(card.annualFee)} 뺀 금액 · 한도를 다 채웠을 때</div>
      </div>

      <ul className="breakdown">
        {shown.map((r) => (
          <li key={r.tag}>
            <span className="bd-tag"><span aria-hidden="true">{TAG_EMOJI[r.tag]} </span>{r.tag}</span>
            <span className="bd-bar" aria-hidden="true"><span style={{ width: `${Math.round((r.annual / maxAnnual) * 100)}%` }} /></span>
            <span className="bd-value">{won(r.annual)}</span>
          </li>
        ))}
        {rest > 0 && <li className="bd-rest">외 {rest}개</li>}
      </ul>

      <div className="card-actions">
        <button type="button" className="link-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? '접기 ▲' : '자세히 보기 ▼'}
        </button>
        <span className="card-actions-right">
          {stale && <span className="badge">확인 필요</span>}
          <a href={card.officialUrl} target="_blank" rel="noopener noreferrer">카드사 페이지 →</a>
        </span>
      </div>
      {open && (
        <div className="detail">
          <div className="detail-title">이렇게 쓰면 최대</div>
          <ul className="tips">
            {tipLines.map((t) => <li key={t}>{t}</li>)}
          </ul>
          {pointsLine && (
            <>
              <div className="detail-title">쌓이는 포인트</div>
              <p className="points-line">{pointsLine}</p>
            </>
          )}
          <div className="detail-title">전체 혜택</div>
          <ul className="benefits">
            {card.benefits.map((b) => <li key={b.tag}>{benefitText(b)}</li>)}
          </ul>
          <p className="checked">마지막 확인 {card.lastChecked}{stale && <span className="badge">확인 필요</span>}</p>
        </div>
      )}
    </article>
  )
}
