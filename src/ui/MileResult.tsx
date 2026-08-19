import { useState } from 'react'
import type { MileScored } from '../engine/mileage'
import { mileageTip, bonusText } from '../engine/mileage'
import { isStale } from '../engine/explain'
import { won } from './format'
import { benefitText } from './CardResult'

interface Props {
  rank: number
  scored: MileScored
  monthlySpend: number
  today: Date
  /** 1위 아래 한 줄 이유 */
  lead?: string
  /** 2위부터: 한 줄 요약으로 시작 */
  compact?: boolean
  maxMiles?: number
}

/** 마일리지 1위 이유 한 줄 */
export function mileLeadText(list: MileScored[]): string {
  if (list.length < 2) return '이 묶음엔 이 카드뿐이에요'
  const diff = list[0].annualMiles - list[1].annualMiles
  if (diff > 0) return `2위 ${list[1].card.name}보다 1년에 ${diff.toLocaleString('ko-KR')}마일 더 쌓여요`
  return `2위 ${list[1].card.name}와 마일은 같아요 — 연회비·실적이 낮아서 먼저`
}

/** 마일당 연회비: "1마일에 3.3원꼴" / 연회비 0이면 "연회비 없음" */
export function feePerMileText(fee: number, feePerMile: number | null): string {
  if (fee === 0) return '연회비 없음'
  if (feePerMile === null) return ''
  const v = Math.round(feePerMile * 10) / 10
  return `1마일에 ${v}원꼴`
}

export function MileResult({ rank, scored, monthlySpend, today, lead, compact = false, maxMiles }: Props) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(!compact)
  const { card, annualMiles, bonusMiles, firstYearBonus, feePerMile, extras } = scored
  const stale = isStale(card.lastChecked, today)
  if (!expanded) {
    const ratio = maxMiles && maxMiles > 0 ? Math.max(0, Math.min(1, annualMiles / maxMiles)) : 0
    return (
      <button type="button" className="card card-compact" onClick={() => setExpanded(true)} aria-expanded={false}>
        <span className="rank rank-sm" aria-label={`${rank}위`}>{rank}</span>
        <span className="compact-body">
          <span className="compact-name">{card.name}</span>
          <span className="compact-bar" aria-hidden="true"><span style={{ width: `${Math.round(ratio * 100)}%` }} /></span>
        </span>
        <span className="compact-value">약 {annualMiles.toLocaleString('ko-KR')}마일</span>
        <span className="compact-caret" aria-hidden="true">▾</span>
      </button>
    )
  }
  const bonusNote = bonusMiles > 0
    ? `해마다 받는 보너스 ${bonusMiles.toLocaleString('ko-KR')}마일 포함`
    : firstYearBonus && card.mileageBonus ? `첫해 보너스 ${card.mileageBonus.miles.toLocaleString('ko-KR')}마일은 따로 있어요`
    : card.mileageBonus ? `보너스 ${card.mileageBonus.miles.toLocaleString('ko-KR')}마일은 1년에 ${won(card.mileageBonus.minAnnualSpend)} 이상 써야 받아요` : ''
  const sub1 = card.annualFee === 0 ? ['연회비 없음'] : [`연회비 ${won(card.annualFee)}`, feePerMileText(card.annualFee, feePerMile)].filter(Boolean)
  const sub2 = [`월 ${won(monthlySpend)}을 전부 이 카드로 쓰면`, bonusNote].filter(Boolean)
  // 접힌 상태에서도 부가 혜택 첫 줄은 보여준다 (프리미엄 비교의 핵심)
  const perkPeek = card.perks && card.perks.length > 0
    ? `${card.perks[0]}${card.perks.length > 1 ? ` 외 ${card.perks.length - 1}개` : ''}`
    : ''

  return (
    <article className={`card ${rank === 1 ? 'is-top' : ''}`}>
      <header className="card-head">
        <span className="rank" aria-label={`${rank}위`}>{rank}</span>
        <div className="card-title">
          <h3>
            {card.name}
            {rank === 1 && <span className="top-badge">가장 많이 쌓여요</span>}
            {card.mileConversion && <span className="conv-badge">포인트 전환형</span>}
          </h3>
          <div className="card-sub">{card.issuer} · {card.kind === 'credit' ? '신용' : '체크'} · 연회비 {won(card.annualFee)} · {card.minSpend === 0 ? '실적 없음' : `전월실적 ${won(card.minSpend)}`}</div>
        </div>
      </header>

      <div className="annual">
        <div className="annual-label">1년에 약</div>
        <div className="annual-value">{annualMiles.toLocaleString('ko-KR')}마일</div>
        <div className="annual-sub">{sub1.join(' · ')}<br />{sub2.join(' · ')}</div>
        {lead && <div className="why">{lead}</div>}
      </div>

      {perkPeek && <p className="perk-peek"><span className="perk-star" aria-hidden="true">✦</span> {perkPeek}</p>}

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
          <div className="detail-title">이렇게 쓰면 최대로 쌓여요</div>
          <ul className="tips">
            <li>{mileageTip(scored)}</li>
            {card.mileageBonus && <li>{bonusText(card.mileageBonus)}</li>}
            {card.mileConversion && <li>{card.mileConversion}</li>}
          </ul>
          {card.perks && card.perks.length > 0 && (
            <>
              <div className="detail-title">프리미엄이라 받는 것</div>
              <ul className="tips">
                {card.perks.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </>
          )}
          {extras.length > 0 && (
            <>
              <div className="detail-title">덤으로 받는 것</div>
              <ul className="tips">
                {extras.map((b) => <li key={b.tag}>{benefitText(b)}</li>)}
              </ul>
            </>
          )}
          <div className="detail-title">이 카드 혜택 전부</div>
          <ul className="benefits">
            {card.benefits.map((b) => <li key={b.tag}>{benefitText(b)}</li>)}
          </ul>
          <p className="checked">마지막으로 확인한 날 {card.lastChecked}{stale && <span className="badge">확인 필요</span>}</p>
          <button type="button" className="link-btn" onClick={() => setOpen(false)}>접기 ▲</button>
        </div>
      )}
      {compact && !open && (
        <button type="button" className="link-btn compact-close" onClick={() => setExpanded(false)}>줄이기 ▴</button>
      )}
    </article>
  )
}
