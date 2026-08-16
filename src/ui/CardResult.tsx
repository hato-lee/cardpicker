import { useState } from 'react'
import type { Scored } from '../engine/recommend'
import type { Persona, Benefit, BenefitType } from '../data/types'
import { reasonLine, maxBenefitTable, isStale } from '../engine/explain'
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

export function CardResult({ rank, scored, persona, pickedCount, today }: Props) {
  const [open, setOpen] = useState(false)
  const { card } = scored
  const stale = isStale(card.lastChecked, today)
  const table = persona === 'meticulous' ? maxBenefitTable(scored) : null
  // 원 단위로 합칠 수 있는 줄. 한도 없는 줄과 마일리지(마일 단위) 줄은 뺀다.
  const moneyRows = table ? table.rows.filter((r) => r.monthlyMax !== null && r.type !== 'mileage') : []
  const noMoneyCap = table !== null && moneyRows.length === 0
  // 금액 합계를 보여주는데 마일 항목도 섞여 있으면 제외했다고 알린다
  const hasCappedMileage = table ? table.rows.some((r) => r.type === 'mileage' && r.monthlyMax !== null) : false

  return (
    <article className="card">
      <header className="card-head">
        <span className="rank">{rank}</span>
        <div>
          <h3>{card.name}</h3>
          <div className="card-sub">{card.issuer} · {card.kind === 'credit' ? '신용' : '체크'} · 연회비 {won(card.annualFee)} · {card.minSpend === 0 ? '실적 없음' : `전월실적 ${won(card.minSpend)}`}</div>
        </div>
      </header>

      <p className="reason">{reasonLine(scored, pickedCount)}</p>

      {table && (
        <div className="max-table">
          <div className="max-title">영역별 월 최대 혜택</div>
          <div className="max-note">※ '최대'는 한도를 다 채웠을 때의 상한이에요</div>
          <table>
            <thead>
              <tr>
                <th scope="col">영역</th>
                <th scope="col">혜택</th>
                <th scope="col">월 최대</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r) => (
                <tr key={r.tag}>
                  <td>{r.tag}</td>
                  <td>{rateText(r.type, r.rate)}</td>
                  <td className="num">{capText(r.type, r.monthlyMax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {noMoneyCap ? (
            <div className="max-sum">금액 한도 없음 — 쓰는 만큼 적립돼요 (연회비 {won(card.annualFee)})</div>
          ) : (
            <div className="max-sum">
              {table.annualNet >= 0 ? (
                <>다 챙기면 월 최대 {won(table.monthlyTotal)} · 연 최대 {won(table.annualTotal)} – 연회비 {won(card.annualFee)} = 약 {won(table.annualNet)}</>
              ) : (
                <>다 챙기면 월 최대 {won(table.monthlyTotal)} · 연 최대 {won(table.annualTotal)} – 연회비 {won(card.annualFee)} → 연회비가 최대 혜택보다 {won(-table.annualNet)} 커요</>
              )}
              {table.hasUncapped && ' (한도 없는 항목은 합계에서 제외)'}
              {hasCappedMileage && ' (마일 항목은 금액 합계에서 제외)'}
            </div>
          )}
          {!noMoneyCap && table.rows.some((r) => r.requiredSpend !== null) && (
            <div className="max-note">
              ※ 한도를 다 채우려면 {table.rows.filter((r) => r.requiredSpend !== null).map((r) => `${r.tag} ${won(r.requiredSpend!)}`).join('·')} 이상 써야 해요
            </div>
          )}
        </div>
      )}

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
