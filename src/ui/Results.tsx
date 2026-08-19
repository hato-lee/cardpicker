import type { Query } from '../data/types'
import type { Scored } from '../engine/recommend'
import { isMileageQuery, type MileageGroups } from '../engine/mileage'
import { RULES } from '../engine/rules'
import { MileResult } from './MileResult'
import { PERSONA_LABEL } from '../engine/explain'
import { CardResult } from './CardResult'
import { REPORT_FORM_URL } from './config'
import { won } from './format'

interface Props {
  query: Query
  results: Scored[]
  /** 무심형인데 다 커버하는 카드가 없어서 커버 많은 순으로 푼 결과 */
  relaxed?: boolean
  mileResults?: MileageGroups
  onEdit: () => void
  today: Date
}

export const RELAXED_NOTE = '고른 영역을 한 장으로 다 되는 카드가 없어서, 가장 많이 되는 카드부터 보여줘요.'

export function Results({ query, results, relaxed = false, mileResults = { grouped: false, all: [] }, onEdit, today }: Props) {
  const mileage = isMileageQuery(query)
  const chips = [
    PERSONA_LABEL[query.persona],
    `월 ${won(query.monthlySpend)}`,
    query.feeLimit === null ? '연회비 상관없음' : `연회비 ${won(query.feeLimit)}까지`,
    ...query.tags,
  ]
  if (mileage) {
    return (
      <section className="step">
        <div className="summary">
          <ul className="chips" aria-label="내 조건">
            {chips.map((c) => <li key={c} className="chip">{c}</li>)}
          </ul>
          <div className="summary-edit"><button type="button" className="link-btn" onClick={onEdit}>조건 바꾸기</button></div>
        </div>
        {mileResults.grouped ? (
          <MileGroups groups={mileResults} monthlySpend={query.monthlySpend} today={today} />
        ) : (
          <>
            <h2>{mileResults.all.length > 0 ? `잘 맞는 마일리지 카드 TOP ${mileResults.all.length}` : '잘 맞는 마일리지 카드'}</h2>
            {mileResults.all.length === 0 ? (
              <MileEmpty />
            ) : (
              mileResults.all.map((s, i) => (
                <MileResult key={s.card.id} rank={i + 1} scored={s} monthlySpend={query.monthlySpend} today={today} />
              ))
            )}
          </>
        )}
        <button type="button" className="secondary" onClick={onEdit}>조건 바꾸기</button>
      </section>
    )
  }
  return (
    <section className="step">
      <div className="summary">
        <ul className="chips" aria-label="내 조건">
          {chips.map((c) => <li key={c} className="chip">{c}</li>)}
        </ul>
        <div className="summary-edit"><button type="button" className="link-btn" onClick={onEdit}>조건 바꾸기</button></div>
      </div>
      <h2>{results.length > 0 ? `잘 맞는 카드 TOP ${results.length}` : '잘 맞는 카드'}</h2>
      {relaxed && results.length > 0 && <p className="hint">{RELAXED_NOTE}</p>}
      {results.length === 0 ? (
        <div className="empty">
          <p>조건에 맞는 카드를 못 찾았어요.</p>
          <p className="hint">연회비 허용치를 올리거나, 태그를 바꿔보세요.</p>
        </div>
      ) : (
        results.map((s, i) => (
          <CardResult key={s.card.id} rank={i + 1} scored={s} persona={query.persona} today={today} />
        ))
      )}
      <button type="button" className="secondary" onClick={onEdit}>조건 바꾸기</button>
      {/* 제보 폼 주소를 아직 안 넣었으면(자리표시자) 링크를 숨긴다 */}
      {!REPORT_FORM_URL.includes('REPLACE_ME') && (
        <p className="report">
          정보가 틀렸나요? <a href={REPORT_FORM_URL} target="_blank" rel="noopener noreferrer">제보하기</a>
        </p>
      )}
    </section>
  )
}

function MileEmpty() {
  return (
    <div className="empty">
      <p>조건에 맞는 마일리지 카드를 못 찾았어요.</p>
      <p className="hint">연회비 허용치를 올려보세요.</p>
    </div>
  )
}

/** 일반(연회비 기준 미만) / 프리미엄(기준 이상) 두 묶음. 빈 묶음은 숨긴다. */
function MileGroups({ groups, monthlySpend, today }: { groups: Extract<MileageGroups, { grouped: true }>; monthlySpend: number; today: Date }) {
  const fee = won(RULES.mileagePremiumFee)
  if (groups.regular.length === 0 && groups.premium.length === 0) {
    return (<><h2>잘 맞는 마일리지 카드</h2><MileEmpty /></>)
  }
  return (
    <>
      <h2>잘 맞는 마일리지 카드</h2>
      {groups.regular.length > 0 && (
        <section className="mile-group" aria-label={`연회비 ${fee} 미만`}>
          <h3 className="group-title">연회비 {fee} 미만 <span className="group-sub">가성비로 고른다면</span></h3>
          {groups.regular.map((s, i) => (
            <MileResult key={s.card.id} rank={i + 1} scored={s} monthlySpend={monthlySpend} today={today} />
          ))}
        </section>
      )}
      {groups.premium.length > 0 && (
        <section className="mile-group" aria-label={`프리미엄(연회비 ${fee} 이상)`}>
          <h3 className="group-title">프리미엄 · 연회비 {fee} 이상 <span className="group-sub">보너스 마일·라운지까지 본다면</span></h3>
          {groups.premium.map((s, i) => (
            <MileResult key={s.card.id} rank={i + 1} scored={s} monthlySpend={monthlySpend} today={today} />
          ))}
        </section>
      )}
    </>
  )
}
