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
}

/** 마일당 연회비: "마일당 3.3원" / 연회비 0이면 "연회비 없음" */
export function feePerMileText(fee: number, feePerMile: number | null): string {
  if (fee === 0) return '연회비 없음'
  if (feePerMile === null) return ''
  const v = Math.round(feePerMile * 10) / 10
  return `마일당 ${v}원`
}

export function MileResult({ rank, scored, monthlySpend, today }: Props) {
  const [open, setOpen] = useState(false)
  const { card, annualMiles, bonusMiles, firstYearBonus, feePerMile, extras } = scored
  const stale = isStale(card.lastChecked, today)
  const bonusNote = bonusMiles > 0
    ? `연간 보너스 ${bonusMiles.toLocaleString('ko-KR')}마일 포함`
    : firstYearBonus && card.mileageBonus ? `첫해엔 보너스 ${card.mileageBonus.miles.toLocaleString('ko-KR')}마일 별도`
    : card.mileageBonus ? `연간 보너스 ${card.mileageBonus.miles.toLocaleString('ko-KR')}마일은 연 ${won(card.mileageBonus.minAnnualSpend)} 이상 써야 받아요` : ''
  const sub = [`연회비 ${won(card.annualFee)}`, feePerMileText(card.annualFee, feePerMile), `월 ${won(monthlySpend)}을 전부 이 카드로 쓸 때`, bonusNote].filter(Boolean)
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
            {rank === 1 && <span className="top-badge">추천</span>}
            {card.mileConversion && <span className="conv-badge">포인트 전환형</span>}
          </h3>
          <div className="card-sub">{card.issuer} · {card.kind === 'credit' ? '신용' : '체크'} · 연회비 {won(card.annualFee)} · {card.minSpend === 0 ? '실적 없음' : `전월실적 ${won(card.minSpend)}`}</div>
        </div>
      </header>

      <div className="annual">
        <div className="annual-label">연 예상</div>
        <div className="annual-value">약 {annualMiles.toLocaleString('ko-KR')}마일</div>
        <div className="annual-sub">{sub.join(' · ')}</div>
      </div>

      {perkPeek && <p className="perk-peek">✦ {perkPeek}</p>}

      <button type="button" className="link-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? '접기 ▲' : '자세히 보기 ▼'}
      </button>
      {open && (
        <div className="detail">
          <div className="detail-title">이렇게 쓰면 최대</div>
          <ul className="tips">
            <li>{mileageTip(scored)}</li>
            {card.mileageBonus && <li>{bonusText(card.mileageBonus)}</li>}
            {card.mileConversion && <li>{card.mileConversion}</li>}
          </ul>
          {card.perks && card.perks.length > 0 && (
            <>
              <div className="detail-title">프리미엄 혜택</div>
              <ul className="tips">
                {card.perks.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </>
          )}
          {extras.length > 0 && (
            <>
              <div className="detail-title">덤으로</div>
              <ul className="tips">
                {extras.map((b) => <li key={b.tag}>{benefitText(b)}</li>)}
              </ul>
            </>
          )}
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
