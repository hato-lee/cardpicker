import { useState } from 'react'
import { isPointsHeavy, type Scored } from '../engine/recommend'
import { resolveTier } from '../engine/benefit'
import type { PointsEase } from '../data/types'
import type { Persona, Benefit, BenefitType } from '../data/types'
import type { Tag } from '../data/tags'
import { tips, rowAnnualValue, isStale } from '../engine/explain'
import { RULES } from '../engine/rules'
import { won, rateText, capValueText } from './format'
import { TAG_EMOJI } from './tagEmoji'

interface Props {
  rank: number
  scored: Scored
  persona: Persona
  today: Date
  /** 1위 카드 아래 한 줄: "2위 OO보다 1년에 N만 원 더 아껴요" 같은 이유 */
  lead?: string
  /** 사용자가 고른 태그 — 혜택 목록에서 강조 */
  pickedTags?: Tag[]
  /** 2위부터: 한 줄로 접힌 상태로 시작, 누르면 펼쳐진다 */
  compact?: boolean
  /** 막대 비교 기준(1위 금액). compact 줄의 막대 길이에 쓴다 */
  maxNet?: number
  /** 월 사용액(원). 혜택 목록 요약 줄을 내 실적 구간 기준으로 보여주는 데 쓴다 */
  monthlySpend?: number
  /** K-패스 트랙: 1년 환급액(원). 큰 숫자에 더하고 내역 첫 줄로 보여준다 */
  kpassRefund?: number
}

/** 월 한도 표기. 마일리지 한도는 '원'이 아니라 '마일' 단위다. */
function capText(type: BenefitType, cap: number | null): string {
  if (cap === null) return '한도 없음'
  return `월 최대 ${capValueText(type, cap)}`
}

/** 실적 구간을 문장으로: "전월 70만 원 이상 쓰면 3만 원까지, 100만 원 이상이면 12% 할인·5만 원까지" */
export function tiersSentence(b: Benefit): string {
  if (!b.tiers || b.tiers.length === 0) return ''
  const parts = b.tiers.map((t, i) => {
    const cap = t.monthlyCap === null ? '한도 없이' : `${capValueText(b.type, t.monthlyCap)}까지`
    const rate = t.rate !== undefined && t.rate !== b.rate ? `${rateText(b.type, t.rate)}·` : ''
    return `${i === 0 ? '전월 ' : ''}${won(t.minSpend)} 이상${i === 0 ? ' 쓰면' : '이면'} ${rate}${cap}`
  })
  return parts.join(', ')
}

/** 혜택 한 줄 (마일리지 결과의 '덤으로' 등 한 줄이 필요한 곳) */
export function benefitText(b: Benefit): string {
  const tail = [tiersSentence(b), b.note].filter(Boolean).join(' · ')
  return `${b.tag} ${rateText(b.type, b.rate)} · ${capText(b.type, b.monthlyCap)}${tail ? ` (${tail})` : ''}`
}

/**
 * 혜택 한 항목: 윗줄 굵게(영역·요율·한도), 아랫줄 작게(실적 구간·조건). 고른 영역은 강조, 나머지는 흐리게.
 * monthlySpend를 주면 윗줄의 요율·한도는 그 사용액에 맞는 실적 구간 값으로 보여준다 (막대 숫자와 같은 기준).
 */
export function BenefitItem({ b, picked, monthlySpend }: { b: Benefit; picked: boolean; monthlySpend?: number }) {
  const hasTiers = !!b.tiers && b.tiers.length > 0
  const t = monthlySpend !== undefined && hasTiers ? resolveTier(b, monthlySpend) : { rate: b.rate, monthlyCap: b.monthlyCap }
  const mine = monthlySpend !== undefined && hasTiers && (t.rate !== b.rate || t.monthlyCap !== b.monthlyCap)
  const tail = [tiersSentence(b), b.note].filter(Boolean).join(' · ')
  return (
    <li className={`benefit-item ${picked ? 'is-picked' : ''}`}>
      <div className="benefit-main">
        <span aria-hidden="true">{TAG_EMOJI[b.tag]} </span>{b.tag} {rateText(b.type, t.rate)} · {capText(b.type, t.monthlyCap)}
        {mine && <span className="benefit-mine"> (월 {won(monthlySpend!)} 기준)</span>}
      </div>
      {tail && <div className="benefit-tail">{tail}</div>}
    </li>
  )
}

/** 혜택 목록 순서: 고른 영역 먼저, 나머지는 뒤에 (원래 순서 유지) */
export function orderBenefits(benefits: Benefit[], picked: (b: Benefit) => boolean): Benefit[] {
  return [...benefits.filter(picked), ...benefits.filter((b) => !picked(b))]
}

export const POINTS_BADGE: Record<PointsEase | 'unknown', string> = {
  cash: '포인트 적립 · 현금처럼 써요',
  shop: '포인트 적립 · 써야 혜택',
  limited: '포인트 적립 · 쓰는 곳 제한',
  unknown: '포인트 적립형',
}
export const KPASS_ROW = 'K-패스 환급'
export const KPASS_BADGE = 'K-패스 환급도 받아요'
export const KPASS_BADGE_TITLE = '모두의카드(K-패스) 앱에 등록하면 버스·지하철비의 20~53%를 따로 돌려받아요. 이 금액엔 안 들어가 있어요 — 혜택 고르기에서 "K-패스 카드만 볼래요"를 켜면 환급까지 계산해요.'
export const REGIONAL_BADGE = '지방은행 — 발급 확인'
export const REGIONAL_BADGE_TITLE = '지방은행에서 내는 카드예요. 혜택은 전국에서 쓸 수 있지만, 발급이 앱·지역에 따라 안 될 수 있어요. 카드사에서 발급 가능한지 먼저 확인하세요. 같은 조건이면 전국 발급 카드를 먼저 보여드려요.'
export const POINTS_BADGE_TITLE = '할인 대신 포인트로 쌓여요. 자세히 보기에서 어떤 포인트인지 볼 수 있어요.'

export function CardResult({ rank, scored, persona, today, lead, pickedTags = [], compact = false, maxNet, monthlySpend, kpassRefund = 0 }: Props) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(!compact)
  const { card, benefit } = scored
  const stale = isStale(card.lastChecked, today)
  // K-패스 트랙이면 환급을 더한 금액이 큰 숫자
  const net = benefit.annualNet + kpassRefund

  // 2위부터는 한 줄 요약으로 시작 — 누르면 카드 전체가 펼쳐진다
  if (!expanded) {
    const ratio = maxNet && maxNet > 0 ? Math.max(0, Math.min(1, net / maxNet)) : 0
    return (
      <button type="button" className="card card-compact" onClick={() => setExpanded(true)} aria-expanded={false}>
        <span className="rank rank-sm" aria-label={`${rank}위`}>{rank}</span>
        <span className="compact-body">
          <span className="compact-name">{card.name}{card.kpass && kpassRefund === 0 && <span className="kpass-mark" title={KPASS_BADGE_TITLE} aria-label={KPASS_BADGE}> 🎫</span>}{card.regional && <span className="kpass-mark" title={REGIONAL_BADGE_TITLE} aria-label={REGIONAL_BADGE}> 🏦</span>}{card.issueNote && <span className="kpass-mark" title={card.issueNote} aria-label={`발급 조건: ${card.issueNote}`}> 📌</span>}</span>
          <span className="compact-bar" aria-hidden="true"><span style={{ width: `${Math.round(ratio * 100)}%` }} /></span>
        </span>
        <span className="compact-value">{net > 0 ? `약 ${won(net)}` : '연회비가 더 커요'}</span>
        <span className="compact-caret" aria-hidden="true">▾</span>
      </button>
    )
  }

  // 내역 줄: 연 금액 큰 순, 최대 N개 + "외 N개"
  const rows = benefit.rows
    .map((r) => ({ tag: r.tag as string, annual: rowAnnualValue(r) }))
    .sort((a, b) => b.annual - a.annual)
  if (kpassRefund > 0) rows.unshift({ tag: KPASS_ROW, annual: kpassRefund })
  const shown = rows.slice(0, kpassRefund > 0 ? RULES.breakdownMaxRows + 1 : RULES.breakdownMaxRows)
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
            {card.kpass && kpassRefund === 0 && <span className="kpass-badge" title={KPASS_BADGE_TITLE}>🎫 {KPASS_BADGE}</span>}
            {card.regional && <span className="regional-badge" title={REGIONAL_BADGE_TITLE}>🏦 {REGIONAL_BADGE}</span>}
          </h3>
          <div className="card-sub">{card.issuer} · {card.kind === 'credit' ? '신용' : '체크'} · 연회비 {won(card.annualFee)} · {card.minSpend === 0 ? '실적 없음' : `전월실적 ${won(card.minSpend)}`}</div>
          {card.issueNote && <div className="issue-note">📌 {card.issueNote}</div>}
        </div>
        {compact && <button type="button" className="collapse-btn" aria-label="줄이기" title="줄이기" onClick={() => setExpanded(false)}>▴</button>}
      </header>

      <div className="annual">
        <div className="annual-label">1년에 약</div>
        {net > 0 ? (
          <div className="annual-value">{won(net)}</div>
        ) : net === 0 ? (
          <div className="annual-negative">연회비가 혜택보다 커요</div>
        ) : (
          <div className="annual-negative">연회비가 혜택보다 커요 (−{won(-net)})</div>
        )}
        <div className="annual-sub">
          {kpassRefund > 0
            ? `K-패스 환급 ${won(kpassRefund)} + 카드 혜택 최대 ${won(benefit.annualGross)}${card.annualFee === 0 ? '' : ` − 연회비 ${won(card.annualFee)}`}`
            : `한도를 다 채웠을 때 최대치 · ${card.annualFee === 0 ? '연회비 없음' : `연회비 ${won(card.annualFee)}은 뺐어요`}`}
        </div>
        {lead && <div className="why">{lead}</div>}
      </div>

      <ul className="breakdown">
        {shown.map((r) => (
          <li key={r.tag}>
            <span className="bd-tag"><span aria-hidden="true">{r.tag === KPASS_ROW ? '🎫' : TAG_EMOJI[r.tag as Tag]} </span>{r.tag}</span>
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
          <a href={card.officialUrl} target="_blank" rel="noopener noreferrer">카드사에서 보기 →</a>
        </span>
      </div>
      {open && (
        <div className="detail">
          <div className="detail-title">이렇게 쓰면 최대로 받아요</div>
          <ul className="tips">
            {tipLines.map((t) => <li key={t}>{t}</li>)}
          </ul>
          {pointsLine && (
            <>
              <div className="detail-title">쌓이는 포인트</div>
              <p className="points-line">{pointsLine}</p>
            </>
          )}
          <div className="detail-title">이 카드 혜택 전부</div>
          <ul className="benefits">
            {orderBenefits(card.benefits, (b) => pickedTags.includes(b.tag)).map((b) => (
              <BenefitItem key={b.tag} b={b} picked={pickedTags.includes(b.tag)} monthlySpend={monthlySpend} />
            ))}
          </ul>
          <div className="detail-foot">
            <button type="button" className="link-btn" onClick={() => setOpen(false)}>접기 ▲</button>
            <span className="checked">마지막으로 확인한 날 {card.lastChecked}{stale && <span className="badge">확인 필요</span>}</span>
          </div>
        </div>
      )}

    </article>
  )
}
